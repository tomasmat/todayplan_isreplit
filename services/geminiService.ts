import { GoogleGenAI, Type } from "@google/genai";
import { DayPlan, PlanRequest, UserProfile, ActivityOption, TransportMode, Language, ActivityData, ItineraryItem } from "../types";
import { LANGUAGES } from "../constants";

const getGeminiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY not found in environment");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper for retrying API calls on transient server errors
const generateWithRetry = async (ai: GoogleGenAI, params: any, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await ai.models.generateContent(params);
      return response;
    } catch (e: any) {
      const isInternalError = e.status === 500 || e.message?.includes('Internal server error') || e.code === 500;
      // Also retry on "Quota exceeded" or 429 to be safe, though usually handled by caller
      const isQuotaError = e.status === 429 || e.message?.includes('429');
      
      if ((isInternalError || isQuotaError) && i < retries - 1) {
        console.warn(`Attempt ${i + 1} failed. Retrying...`);
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i))); // Exponential backoff
        continue;
      }
      throw e;
    }
  }
  throw new Error("Max retries exceeded");
};

export const getPlaceTrivia = async (
  location: { lat: number; lng: number; name?: string }, 
  language: Language = 'en'
): Promise<string> => {
  const ai = getGeminiClient();
  
  const isGenericName = !location.name || 
                        location.name === 'Selected Location' || 
                        location.name === 'Current Location' || 
                        location.name === 'Default';
                        
  const locationContext = isGenericName 
    ? `the coordinates ${location.lat}, ${location.lng}` 
    : location.name;
    
  const languageName = LANGUAGES.find(l => l.code === language)?.name || 'English';

  const prompt = `Write a short, fascinating, 2-sentence fun fact or travel tip about ${locationContext}. 
  ${isGenericName ? "First, identify the city or region these coordinates belong to." : ""}
  The goal is to keep the user entertained for 10 seconds while their itinerary loads. 
  Don't say "Here is a fact". Just state the fact directly and enthusiastically.
  IMPORTANT: Write the response in ${languageName}.`;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || `Getting ready to explore...`;
  } catch (e) {
    return `Finding the best hidden gems for you...`;
  }
};

export const generateDayPlan = async (
  user: UserProfile,
  request: PlanRequest,
  activityData: ActivityData,
  language: Language = 'en'
): Promise<DayPlan> => {
  const ai = getGeminiClient();
  
  const languageName = LANGUAGES.find(l => l.code === language)?.name || 'English';

  const companions = user.companions.filter((c) =>
    request.selectedCompanionIds.includes(c.id)
  );
  
  const peopleList = [];
  if (request.includeUser) {
      peopleList.push(`${user.name} (${user.age || '?'} years old, ${user.relation || 'Organizer'})`);
  }
  companions.forEach(c => {
      peopleList.push(`${c.name} (${c.age} years old, ${c.relation})`);
  });
  
  const peopleDescription = peopleList.join(", ");

  const selectedActivities: string[] = [];
  request.selectedActivityIds.forEach((idString) => {
    const [catKey, actId] = idString.split(":");
    const category = activityData[catKey];
    const activity = category?.activities.find((a) => a.id.toString() === actId);
    if (activity) {
      selectedActivities.push(`Activity: ${activity.name} (${category.category_name}) - Description: ${activity.description}`);
    }
  });

  let reviewContext = "";
  if (user.reviews && user.reviews.length > 0) {
    const positive = user.reviews.filter(r => r.rating >= 4).map(r => `${r.activityName} (${r.locationName})`);
    const negative = user.reviews.filter(r => r.rating <= 2).map(r => `${r.activityName} (${r.locationName})`);
    
    reviewContext = `
    USER FEEDBACK HISTORY (Use this to tailor the plan):
    - The user previously LOVED: ${positive.join(", ") || "None"}.
    - The user previously DISLIKED: ${negative.join(", ") || "None"}.
    - General comments: ${user.reviews.map(r => `"${r.comment}"`).filter(Boolean).join("; ")}.
    
    INSTRUCTION: Avoid activities or styles similar to what the user disliked. Prioritize vibes similar to what they loved.
    `;
  }

  const prompt = `
    Create a detailed one-day itinerary for a group of people: ${peopleDescription}.
    
    PLANNING PARAMETERS:
    - Date: ${request.date}
    - Time Window: ${request.startTime} to ${request.endTime}
    - Start Location: Coordinates ${request.location.lat}, ${request.location.lng} (Location Name: ${request.location.name})
    - RADIUS: ${request.radius} km (preferred range — expand up to 2x only if fewer than 3 quality options exist within this radius)
    - LOCATION CONTEXT: If the location is in a dense urban area (city center, downtown, tourist district), there are many options even within 0.5km. Prioritize walkable, iconic, and unique experiences. Do NOT return empty slots — dense areas always have options within a short walk.
    - Selected Interests: ${selectedActivities.join(" | ")}
    - Paid Meals (Must include restaurant stops): ${request.meals.join(", ") || "None (Snacks only)"}
    - Budget Preference: ${request.budget}
    - OUTPUT LANGUAGE: ${languageName}
    
    ${reviewContext}
    
    CRITICAL INSTRUCTIONS:
    1. USE GOOGLE MAPS TOOL: Find REAL places with REAL coordinates within the radius. 
       - VERIFY distances from start location using the tool.
    2. UNIQUE LOCATIONS: Do not repeat the same location in different time slots. Every option across the entire plan should be unique.
       - STRICT RULE: If a place is used in Slot 1, it CANNOT appear in Slot 2, 3, etc.
    3. VARIETY: For EACH time slot, provide exactly 3 or 4 DISTINCT options.
       - Option A: Best Match
       - Option B: Hidden Gem
       - Option C: Relaxed Alternative
    4. RATING: PRIORITIZE places with 4.5+ stars. Only use 4.0-4.4 if no better options exist. Avoid anything below 4.0.
    5. MEALS: Schedule dedicated time slots for paid meals.
    6. WEATHER: Predict the weather for ${request.date} at the location.
    7. DETAILS: Use Google Maps to find specific details for EACH option.
       - 'address': The full street address.
       - 'website': The official website URL (do not leave empty if possible).
       - 'workingHours': The opening hours for ${request.date}.
       - 'rating': The numeric rating from Google Maps.
    
    Output strictly valid JSON string. Do not use Markdown formatting (no \`\`\`json).
    The JSON structure must match this EXACT format:
    {
      "title": "string",
      "summary": "string",
      "date": "string",
      "weather": {
        "summary": "string",
        "advice": "string",
        "intervals": [{ "time": "string", "condition": "string", "temperature": "string" }]
      },
      "totalCostEstimate": "string",
      "itinerary": [
        {
          "time": "string (e.g. 09:00 - 10:30)",
          "options": [
            {
               "id": "string",
               "activity": "string",
               "description": "string",
               "locationName": "string",
               "latitude": number,
               "longitude": number,
               "estimatedCost": "string",
               "rating": number,
               "travelInfo": { "distance": "string", "duration": "string", "mode": "string" },
               "sourceUri": "string (Google Maps URI if available)",
               "workingHours": "string",
               "website": "string",
               "address": "string"
            }
          ]
        }
      ]
    }
  `;

  const apiConfig = { tools: [{googleMaps: {}}] };

  const extractPlan = (responseText: string | undefined): DayPlan | null => {
    if (!responseText) return null;
    const startIndex = responseText.indexOf('{');
    const endIndex = responseText.lastIndexOf('}');
    if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) return null;
    try {
      return JSON.parse(responseText.substring(startIndex, endIndex + 1)) as DayPlan;
    } catch {
      return null;
    }
  };

  // Attempt 1: Fast model (gemini-2.5-flash)
  let plan: DayPlan | null = null;
  try {
    const response = await generateWithRetry(ai, {
      model: "gemini-2.5-flash",
      contents: prompt,
      config: apiConfig,
    });
    plan = extractPlan(response.text);
  } catch (e) {
    console.warn("Flash model failed, will try Pro.", e);
  }

  // Attempt 2: If Flash returned nothing or an empty itinerary, retry with Pro
  if (!plan || !plan.itinerary || plan.itinerary.length === 0) {
    console.warn("Flash returned empty/invalid plan — retrying with gemini-2.5-pro...");
    const response = await generateWithRetry(ai, {
      model: "gemini-2.5-pro",
      contents: prompt,
      config: apiConfig,
    });
    plan = extractPlan(response.text);
  }

  if (!plan) throw new Error("AI response was not valid JSON");

  plan.id = crypto.randomUUID();
  return plan;
};

export const finalizeItinerary = async (
  originalPlan: DayPlan,
  selectedOptions: ActivityOption[],
  transportMode: TransportMode,
  startLocationName: string,
  language: Language = 'en'
): Promise<DayPlan> => {
  const ai = getGeminiClient();
  const languageName = LANGUAGES.find(l => l.code === language)?.name || 'English';

  const placesContext = selectedOptions.map((opt, index) => 
    `${index + 1}. [${opt.activity}] ${opt.locationName} (Lat: ${opt.latitude}, Lng: ${opt.longitude})`
  ).join("\n");

  // Avoid ambiguous start location that confuses the tool (e.g. "Current Location")
  // If we don't have a specific name, assume we start from the vicinity of the first activity
  const startContext = (startLocationName && startLocationName !== 'Current Location') 
     ? `Start Location: ${startLocationName}` 
     : `Start Point: The first location in the list below.`;

  const basePrompt = `
    You are an expert logistician. Optimize this itinerary based on the selected places.
    
    ${startContext}
    Selected Places (in original order):
    ${placesContext}

    TRANSPORT MODE: ${transportMode}
    DATE: ${originalPlan.date}
    OUTPUT LANGUAGE: ${languageName}

    INSTRUCTIONS:
    1. Reorder places to minimize travel time (TSP) unless chronological order is required (Breakfast -> Dinner).
    2. CRITICAL: Provide detailed 'instructions' in the travelInfo object based on ${transportMode}.
       - If 'public_transport': Include specific Bus numbers, Metro lines, or Train stations.
       - If 'driving': Include parking tips or major highway names.
       - If 'walking': Mention scenic streets or landmarks.
    3. DETAILS: Ensure 'address', 'workingHours' and 'website' are accurate for the selected places.
    
    Output strictly valid JSON string. Do not use Markdown.
    
    IMPORTANT: You must output valid JSON for the DayPlan structure, but I will override the 'weather' and 'date' fields with the original plan's data to ensure consistency. You can use placeholder data for weather in the JSON.
    
    Format:
    {
      "title": "${originalPlan.title}",
      "summary": "Optimized itinerary",
      "date": "${originalPlan.date}",
      "weather": { "summary": "", "advice": "", "intervals": [] },
      "totalCostEstimate": "string",
      "itinerary": [
        {
          "time": "string",
          "options": [
            {
               "id": "string",
               "activity": "string",
               "description": "string",
               "locationName": "string",
               "latitude": number,
               "longitude": number,
               "estimatedCost": "string",
               "rating": number,
               "travelInfo": { "distance": "string", "duration": "string", "mode": "string", "instructions": "string" },
               "sourceUri": "string",
               "workingHours": "string",
               "website": "string",
               "address": "string"
            }
          ]
        }
      ]
    }
  `;

  let text = "";

  // Attempt 1: Try with Google Maps Tool
  try {
    const promptWithTool = basePrompt + "\n\nUSE GOOGLE MAPS TOOL to calculate REAL travel times and distances.";
    const response = await generateWithRetry(ai, {
      model: "gemini-2.5-flash",
      contents: promptWithTool,
      config: {
        tools: [{googleMaps: {}}],
      }
    });
    text = response.text || "";
  } catch (e) {
    console.warn("Tool-based finalization failed, falling back to estimation.", e);
  }

  // Attempt 2: Fallback without tools if first attempt failed or returned empty text
  if (!text) {
     console.log("Using fallback finalization (no tools)");
     const promptFallback = basePrompt + "\n\nESTIMATE travel times and distances based on the provided coordinates.";
     try {
       const response = await generateWithRetry(ai, {
          model: "gemini-2.5-flash", 
          contents: promptFallback,
          // No tools config implies fallback
       });
       text = response.text || "";
     } catch (fallbackError) {
       console.error("Fallback finalization also failed", fallbackError);
       throw fallbackError;
     }
  }

  if (!text) throw new Error("No response from AI");
  
  const startIndex = text.indexOf('{');
  const endIndex = text.lastIndexOf('}');
  
  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      text = text.substring(startIndex, endIndex + 1);
  } else {
      console.error("Malformed AI Response:", text);
      throw new Error("AI response was not valid JSON");
  }

  try {
    const finalPlan = JSON.parse(text) as DayPlan;
    finalPlan.id = originalPlan.id + "_finalized";
    finalPlan.isFinalized = true;
    finalPlan.transportMode = transportMode;
    
    // STRICTLY COPY DATA FROM ORIGINAL PLAN TO PREVENT HALLUCINATIONS
    finalPlan.date = originalPlan.date;
    finalPlan.weather = originalPlan.weather;
    
    return finalPlan;
  } catch (e) {
    console.error("JSON Parse Error:", e);
    throw new Error("Failed to parse finalized plan");
  }
};

// Asks Gemini to pick up to 10 best-fitting activity ids from the predefined
// catalog, given the location, group, time window, meals, and budget.
// Returns "category_key:id" strings — same format as request.selectedActivityIds.
export const autoSelectActivities = async (
  user: UserProfile,
  request: PlanRequest,
  activityData: ActivityData,
  language: Language = 'en',
): Promise<string[]> => {
  const ai = getGeminiClient();
  const languageName = LANGUAGES.find(l => l.code === language)?.name || 'English';

  // Flatten the catalog the AI is allowed to pick from.
  const catalogLines: string[] = [];
  Object.entries(activityData).forEach(([catKey, cat]) => {
    cat.activities
      .filter(a => a.isActive !== false)
      .forEach(a => {
        catalogLines.push(`- "${catKey}:${a.id}" -> ${cat.category_name} / ${a.name}: ${a.description}`);
      });
  });

  const companions = user.companions.filter(c => request.selectedCompanionIds.includes(c.id));
  const peopleList: string[] = [];
  if (request.includeUser) {
    peopleList.push(`${user.name} (${user.age || '?'}, ${user.relation || 'Organizer'})`);
  }
  companions.forEach(c => peopleList.push(`${c.name} (${c.age}, ${c.relation})`));

  const includeFood = request.meals.length > 0;

  const prompt = `
You are picking the top activities for a one-day trip. Output AT MOST 10 ids
from the catalog below — choose the ones that best fit the location, group,
time window, meals and budget. Quality over quantity.

LOCATION: ${request.location.name || 'unknown'} (lat ${request.location.lat}, lng ${request.location.lng}), within ~${request.radius} km.
GROUP: ${peopleList.join(", ") || "Solo traveller"}
TIME WINDOW: ${request.startTime} - ${request.endTime}
PAID MEALS: ${request.meals.join(", ") || "none"}
BUDGET: ${request.budget}
LANGUAGE OF DESCRIPTIONS: ${languageName}

RULES:
- Return ONLY ids exactly as they appear (e.g. "walking_urban_exploration:3").
- Maximum 10 ids. Fewer is fine if the location is small.
- ${includeFood
    ? "Because meals are selected, include 1-2 food/cuisine ids that fit local cuisine."
    : "Do NOT pick ids from 'food_drink_experiences' or 'cuisine_types'."}
- Prefer iconic, walkable, family/group-appropriate options for the given ages.
- Avoid duplicates.

CATALOG:
${catalogLines.join("\n")}
`;

  const response = await generateWithRetry(ai, {
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          ids: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["ids"],
      },
    },
  });

  let parsed: any = {};
  try {
    parsed = JSON.parse(response.text || "{}");
  } catch (e) {
    console.warn("autoSelectActivities: failed to parse AI response", e);
    return [];
  }

  const ids: string[] = Array.isArray(parsed.ids) ? parsed.ids : [];

  // Defensive filter: drop anything not in the catalog (Gemini can hallucinate)
  const validIds = new Set<string>();
  Object.entries(activityData).forEach(([catKey, cat]) => {
    cat.activities.forEach(a => validIds.add(`${catKey}:${a.id}`));
  });
  return ids.filter(id => validIds.has(id)).slice(0, 10);
};