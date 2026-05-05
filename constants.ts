
import { ActivityData, Language } from './types';

export const LANGUAGES: { code: Language; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
];

export const TOURIST_ACTIVITIES: ActivityData = {
  "food_drink_experiences": {
    "category_name": "Food & Drink Experiences",
    "description": "Culinary tourism and gastronomic exploration",
    "activities": [
      { "id": 1, "name": "Restaurants", "description": "Dining establishments ranging from street-side to fine dining." },
      { "id": 2, "name": "Local cuisine tasting", "description": "Sampling regional specialties and traditional dishes." },
      { "id": 3, "name": "Cafés and coffee shops", "description": "Casual stops for coffee, tea, and pastries." },
      { "id": 4, "name": "Street food", "description": "Quick, affordable, and authentic local bites." },
      { "id": 5, "name": "Food markets", "description": "Bustling bazaars selling fresh produce and prepared foods." },
      { "id": 6, "name": "Wine tasting", "description": "Visiting vineyards or wine bars." },
      { "id": 7, "name": "Brewery visits", "description": "Touring local beer breweries." },
      { "id": 8, "name": "Cooking classes", "description": "Learning to cook local recipes." },
      { "id": 9, "name": "Food tours", "description": "Guided tours stopping at multiple eateries." },
      { "id": 10, "name": "Picnics", "description": "Outdoor dining in scenic spots." }
    ]
  },
  "cuisine_types": {
    "category_name": "Cuisine Preferences",
    "description": "Specific food types and dining styles you crave",
    "activities": [
      { "id": 1, "name": "Italian", "description": "Pizza, pasta, and Mediterranean flavors." },
      { "id": 2, "name": "Asian", "description": "Chinese, Japanese, Thai, Sushi, etc." },
      { "id": 3, "name": "Mexican & Latin", "description": "Tacos, burritos, and spicy flavors." },
      { "id": 4, "name": "Indian & South Asian", "description": "Curries, naan, and rich spices." },
      { "id": 5, "name": "French", "description": "Pastries, bistros, and fine dining." },
      { "id": 6, "name": "Middle Eastern", "description": "Hummus, falafel, and kebabs." },
      { "id": 7, "name": "American & BBQ", "description": "Burgers, steaks, and comfort food." },
      { "id": 8, "name": "Healthy / Vegetarian", "description": "Salads, plant-based, and light options." },
      { "id": 9, "name": "Seafood", "description": "Fresh fish and ocean delights." },
      { "id": 10, "name": "Local Specialty", "description": "Must-try dishes unique to this region." }
    ]
  },
  "walking_urban_exploration": {
    "category_name": "Walking & Urban Exploration",
    "description": "Low-effort, flexible activities for exploring cities and neighborhoods",
    "activities": [
      { "id": 1, "name": "Self-guided city walk", "description": "Stroll freely through historic streets." },
      { "id": 2, "name": "Guided walking tour", "description": "Join a professional guide for structured tours." },
      { "id": 3, "name": "Themed walks", "description": "Specialized routes focusing on specific interests (e.g., street art, history)." },
      { "id": 4, "name": "Neighborhood exploration", "description": "Venture beyond tourist centers to local districts." },
      { "id": 5, "name": "Riverside/waterfront walks", "description": "Follow rivers, lakes, or coastal paths." },
      { "id": 6, "name": "Night city walks", "description": "Evening strolls to see illuminated landmarks." },
      { "id": 7, "name": "Park and green space walks", "description": "Relaxed loops through botanical gardens and parks." },
      { "id": 8, "name": "Bridge crossing", "description": "Walking across iconic bridges for views." },
      { "id": 9, "name": "Hidden gems hunt", "description": "Searching for secret courtyards and alleyways." },
      { "id": 10, "name": "Architecture tour", "description": "Focusing on building styles and famous structures." }
    ]
  },
  "beach_water_leisure": {
    "category_name": "Beach & Water Leisure",
    "description": "Relaxation and light activity around water",
    "activities": [
      { "id": 1, "name": "Beach relaxation", "description": "Sunbathing and reading on the sand." },
      { "id": 2, "name": "Swimming", "description": "Dipping in sea, lake, or pool." },
      { "id": 3, "name": "Family beaches", "description": "Child-safe shores with amenities." },
      { "id": 4, "name": "Hidden/wild beaches", "description": "Secluded shorelines away from crowds." },
      { "id": 5, "name": "Snorkeling", "description": "Exploring underwater life near the shore." },
      { "id": 6, "name": "Kayaking/Canoeing", "description": "Paddling through calm waters." },
      { "id": 7, "name": "Paddleboarding", "description": "Stand-up paddling for balance and views." },
      { "id": 8, "name": "Beach sports", "description": "Volleyball, frisbee, or beach soccer." },
      { "id": 9, "name": "Boat tours", "description": "Cruises offering scenic water routes." },
      { "id": 10, "name": "Sunset sailing", "description": "Evening boat rides to watch the sunset." }
    ]
  },
  "entertainment_shows": {
    "category_name": "Entertainment & Shows",
    "description": "Live performances and spectacles",
    "activities": [
      { "id": 1, "name": "Theater performances", "description": "Plays, musicals, and operas." },
      { "id": 2, "name": "Concerts and live music", "description": "Pop, rock, jazz, or classical performances." },
      { "id": 3, "name": "Comedy clubs", "description": "Stand-up comedy shows." },
      { "id": 4, "name": "Magic shows", "description": "Illusionist performances." },
      { "id": 5, "name": "Cinema and film festivals", "description": "Indoor screenings of movies." },
      { "id": 6, "name": "Traditional dance shows", "description": "Cultural folklore performances." },
      { "id": 7, "name": "Circus", "description": "Acrobatics and entertainment." },
      { "id": 8, "name": "Street performers", "description": "Busking and impromptu shows." },
      { "id": 9, "name": "Sporting events", "description": "Watching local sports matches." },
      { "id": 10, "name": "Festivals and cultural events", "description": "Seasonal celebrations and parades." }
    ]
  },
  "family_kids_activities": {
    "category_name": "Family & Kids Activities",
    "description": "Child-friendly fun and entertainment",
    "activities": [
      { "id": 1, "name": "Parks and playgrounds", "description": "Open spaces for running and playing." },
      { "id": 2, "name": "Zoos and animal parks", "description": "Facilities housing diverse animals." },
      { "id": 3, "name": "Aquariums", "description": "Indoor venues showcasing marine life." },
      { "id": 4, "name": "Interactive museums", "description": "Hands-on exhibits for learning (Science centers)." },
      { "id": 5, "name": "Amusement parks", "description": "Theme parks with rides and attractions." },
      { "id": 6, "name": "Miniature golf", "description": "Fun putting courses." },
      { "id": 7, "name": "Bowling", "description": "Indoor bowling alleys." },
      { "id": 8, "name": "Toy stores", "description": "Visiting famous or large toy shops." },
      { "id": 9, "name": "Water parks", "description": "Slides and pools." },
      { "id": 10, "name": "Petting zoos", "description": "Farm animals interaction." }
    ]
  },
  "indoor_bad_weather": {
    "category_name": "Indoor & Bad-Weather Activities",
    "description": "Rainy day options",
    "activities": [
      { "id": 1, "name": "Museums", "description": "Art, history, and science collections." },
      { "id": 2, "name": "Art galleries", "description": "Visual art exhibitions." },
      { "id": 3, "name": "Libraries", "description": "Public libraries with architecture or reading rooms." },
      { "id": 4, "name": "Shopping malls", "description": "Enclosed complexes with shops and food courts." },
      { "id": 5, "name": "Escape rooms", "description": "Themed puzzle challenges." },
      { "id": 6, "name": "Indoor climbing", "description": "Rock climbing walls." },
      { "id": 7, "name": "Arcades", "description": "Video game centers." },
      { "id": 8, "name": "Planetariums", "description": "Astronomy shows." },
      { "id": 9, "name": "Historical buildings", "description": "Castles or palaces with indoor tours." },
      { "id": 10, "name": "Workshops", "description": "Crafting or pottery making." }
    ]
  },
  "relaxation_wellness": {
    "category_name": "Relaxation & Wellness",
    "description": "Self-care and stress relief",
    "activities": [
      { "id": 1, "name": "Spas and saunas", "description": "Full-service wellness centers." },
      { "id": 2, "name": "Yoga studios", "description": "Drop-in yoga classes." },
      { "id": 3, "name": "Meditation centers", "description": "Places for quiet reflection." },
      { "id": 4, "name": "Thermal baths", "description": "Natural hot springs." },
      { "id": 5, "name": "Public parks", "description": "Peaceful spaces for sitting and reading." },
      { "id": 6, "name": "Massage therapy", "description": "Professional massages." },
      { "id": 7, "name": "Beauty salons", "description": "Manicures, pedicures, and hair treatments." },
      { "id": 8, "name": "Bookstores", "description": "Browsing books in a quiet atmosphere." },
      { "id": 9, "name": "Tea houses", "description": "Traditional tea drinking experience." },
      { "id": 10, "name": "Scenic viewpoints", "description": "Driving or walking to a view and just sitting." }
    ]
  },
  "nightlife_social": {
    "category_name": "Nightlife",
    "description": "Evening entertainment",
    "activities": [
      { "id": 1, "name": "Bars and pubs", "description": "Social venues for drinks." },
      { "id": 2, "name": "Nightclubs", "description": "Dancing and music late into the night." },
      { "id": 3, "name": "Rooftop terraces", "description": "Elevated venues with city views." },
      { "id": 4, "name": "Karaoke bars", "description": "Singing entertainment." },
      { "id": 5, "name": "Jazz clubs", "description": "Live jazz and cocktails." },
      { "id": 6, "name": "Comedy clubs", "description": "Late night comedy." },
      { "id": 7, "name": "Casinos", "description": "Gambling and entertainment." },
      { "id": 8, "name": "Late-night diners", "description": "Eating after hours." },
      { "id": 9, "name": "Speakeasies", "description": "Hidden bars." },
      { "id": 10, "name": "Beach parties", "description": "Night gatherings on the sand." }
    ]
  },
  "shopping_browsing": {
    "category_name": "Shopping",
    "description": "Retail therapy",
    "activities": [
      { "id": 1, "name": "Souvenir shops", "description": "Specialized stores for gifts." },
      { "id": 2, "name": "Markets and bazaars", "description": "Open-air markets with local goods." },
      { "id": 3, "name": "Malls", "description": "Modern shopping centers." },
      { "id": 4, "name": "Boutiques", "description": "Small fashionable shops." },
      { "id": 5, "name": "Antique stores", "description": "Vintage and old items." },
      { "id": 6, "name": "Artisan workshops", "description": "Buying directly from makers." },
      { "id": 7, "name": "Department stores", "description": "Large multi-category stores." },
      { "id": 8, "name": "Thrift stores", "description": "Second-hand shopping." },
      { "id": 9, "name": "Bookstores", "description": "Buying books and maps." },
      { "id": 10, "name": "Tech stores", "description": "Browsing electronics." }
    ]
  }
};