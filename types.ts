
export interface Activity {
  id: number;
  name: string;
  description: string;
  isActive?: boolean; // New field for Admin toggling
}

export interface Category {
  category_name: string;
  description: string;
  activities: Activity[];
}

export interface ActivityData {
  [key: string]: Category;
}

export interface Companion {
  id: string;
  name: string;
  age: number;
  relation: string; // e.g., "Child", "Partner", "Friend"
}

export interface Review {
  activityName: string;
  locationName: string;
  rating: number; // 1-5
  comment?: string;
  date: string;
}

export interface UserProfile {
  name: string;
  email: string;
  age: number;      // Added
  relation: string; // Added (e.g. "Organizer", "Me")
  companions: Companion[];
  reviews: Review[];
}

export interface WeatherInterval {
  time: string;
  condition: string;
  temperature: string;
}

export interface WeatherForecast {
  summary: string;
  advice: string;
  intervals: WeatherInterval[];
}

export type TransportMode = 'driving' | 'public_transport' | 'walking';

export interface TravelInfo {
  distance: string;
  duration: string;
  mode: TransportMode;
  instructions?: string; // Detailed instructions for the finalized plan
}

export interface ActivityOption {
  id: string;
  activity: string;
  description: string;
  locationName: string;
  latitude: number;
  longitude: number;
  estimatedCost?: string;
  rating: number;
  travelInfo: TravelInfo;
  sourceUri?: string; // Added for Google Maps Grounding
  workingHours?: string; // Added
  website?: string; // Added
  address?: string; // Added
}

export interface ItineraryItem {
  time: string;
  options: ActivityOption[]; // In finalized plan, this will have exactly 1 item
}

export interface DayPlan {
  id: string; // Unique ID for the plan
  title: string;
  summary: string;
  date: string;
  weather: WeatherForecast;
  itinerary: ItineraryItem[];
  totalCostEstimate?: string;
  
  // State for Finalization
  isFinalized?: boolean; // True if this specific object is the finalized version
  transportMode?: TransportMode;
  
  // Storage for the related versions
  finalizedPlan?: DayPlan; // The optimized version nested inside the original
  userSelections?: Record<number, number>; // Saved selections from the draft phase
}

export type AppState = 'landing' | 'auth' | 'dashboard' | 'wizard' | 'payment' | 'result' | 'admin';

export interface PlanRequest {
  location: { lat: number; lng: number; name?: string };
  radius: number; // in km
  date: string;
  startTime: string;
  endTime: string;
  budget: 'Economy' | 'Moderate' | 'Luxury' | 'Flexible';
  includeUser: boolean; // Added: Whether the organizer is joining
  selectedCompanionIds: string[];
  selectedActivityIds: string[]; // "category_key:activity_id"
  meals: string[]; // ['breakfast', 'lunch', 'dinner']
}

export type Language = 'en' | 'es' | 'fr' | 'de' | 'it' | 'ja' | 'zh';