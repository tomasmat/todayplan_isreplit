import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, CheckCircle2, ChevronRight, ChevronLeft, CreditCard, Calendar, Clock, CheckSquare, Square, Search, Wallet,
  ChevronDown, ChevronUp, Car,
  // New icons
  Footprints, Waves, Utensils, ChefHat, Ticket, Smile, CloudRain, Sparkles, Martini, ShoppingBag, Coffee, Sun, Moon,
  Lock, AlertCircle, ShieldCheck, RefreshCw
} from 'lucide-react';
import { Button } from './Button';
import { UserProfile, PlanRequest, ActivityData, Category } from '../types';
import { GoogleMap } from './GoogleMap';
import { autoSelectActivities } from '../services/geminiService';

interface PlanWizardProps {
  user: UserProfile;
  onSubmit: (request: PlanRequest) => void;
  onCancel: () => void;
  t: any; // Translation object
  activityData: ActivityData; // Added dynamic data
  planCost: number; // Added dynamic cost
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "walking_urban_exploration": <Footprints className="w-5 h-5" />,
  "beach_water_leisure": <Waves className="w-5 h-5" />,
  "food_drink_experiences": <Utensils className="w-5 h-5" />,
  "cuisine_types": <ChefHat className="w-5 h-5" />,
  "entertainment_shows": <Ticket className="w-5 h-5" />,
  "family_kids_activities": <Smile className="w-5 h-5" />,
  "indoor_bad_weather": <CloudRain className="w-5 h-5" />,
  "relaxation_wellness": <Sparkles className="w-5 h-5" />,
  "nightlife_social": <Martini className="w-5 h-5" />,
  "shopping_browsing": <ShoppingBag className="w-5 h-5" />
};

const FOOD_CATEGORIES = ["food_drink_experiences", "cuisine_types"];

export const PlanWizard: React.FC<PlanWizardProps> = ({ user, onSubmit, onCancel, t, activityData, planCost }) => {
  const [step, setStep] = useState(1);
  const [request, setRequest] = useState<PlanRequest>({
    location: { lat: 0, lng: 0 },
    radius: 5,
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '19:00',
    budget: 'Moderate',
    includeUser: true, // Default to true
    selectedCompanionIds: [],
    selectedActivityIds: [],
    meals: ['lunch', 'dinner'] // Default to lunch and dinner
  });
  const [locationError, setLocationError] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [radiusMode, setRadiusMode] = useState<'walking' | 'driving'>('driving');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isAutoSelecting, setIsAutoSelecting] = useState(false);
  const [autoSelectError, setAutoSelectError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Payment Form State
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isTestMode, setIsTestMode] = useState(true);

  useEffect(() => {
    // Only fetch if we haven't set a location yet (prevents resetting on step back)
    if (navigator.geolocation && request.location.lat === 0) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setRequest(prev => ({
            ...prev,
            location: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              name: 'Current Location'
            }
          }));
        },
        (error) => {
          setLocationError('Unable to retrieve location. Defaulting to London.');
          // Default to London if geolocation fails
          setRequest(prev => ({
             ...prev,
             location: { lat: 51.505, lng: -0.09, name: 'Default' }
          }));
        }
      );
    }
  }, []);

  // Initialize Places Autocomplete when step 2 is active and Google Maps is loaded
  useEffect(() => {
    if (step === 2 && searchInputRef.current) {
      // Ensure script is present (in case GoogleMap hasn't mounted yet)
      const scriptId = 'google-maps-script';
      if (!document.getElementById(scriptId) && !window.google) {
          const script = document.createElement('script');
          script.id = scriptId;
          script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyDjkaBQ3iSL8Q0IKpgKe4Dv5OYwJNi84Ok&libraries=places`;
          script.async = true;
          script.defer = true;
          document.head.appendChild(script);
      }

      // Poll until Google Maps API is ready
      const intervalId = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.places) {
          clearInterval(intervalId);
          
          const autocomplete = new window.google.maps.places.Autocomplete(searchInputRef.current!, {
            fields: ["geometry", "name", "formatted_address"],
          });

          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            if (place.geometry && place.geometry.location) {
              setRequest(prev => ({
                ...prev,
                location: {
                  lat: place.geometry.location.lat(),
                  lng: place.geometry.location.lng(),
                  name: place.name || place.formatted_address || 'Selected Location'
                }
              }));
            }
          });
        }
      }, 100); // Check every 100ms

      return () => clearInterval(intervalId);
    }
  }, [step]);

  const toggleCompanion = (id: string) => {
    setRequest(prev => ({
      ...prev,
      selectedCompanionIds: prev.selectedCompanionIds.includes(id)
        ? prev.selectedCompanionIds.filter(c => c !== id)
        : [...prev.selectedCompanionIds, id]
    }));
  };

  const toggleUserInclusion = () => {
    setRequest(prev => ({
        ...prev,
        includeUser: !prev.includeUser
    }));
  };

  const toggleActivity = (key: string, id: number) => {
    // Prevent toggling food options if no meals selected
    if (FOOD_CATEGORIES.includes(key) && request.meals.length === 0) return;

    const idString = `${key}:${id}`;
    setRequest(prev => ({
      ...prev,
      selectedActivityIds: prev.selectedActivityIds.includes(idString)
        ? prev.selectedActivityIds.filter(a => a !== idString)
        : [...prev.selectedActivityIds, idString]
    }));
  };

  const toggleCategory = (key: string) => {
    // Prevent toggling food options if no meals selected
    if (FOOD_CATEGORIES.includes(key) && request.meals.length === 0) return;

    // Filter only active activities
    const categoryActivities = activityData[key].activities.filter(a => a.isActive !== false);
    const allIds = categoryActivities.map(a => `${key}:${a.id}`);
    
    // Check if all are currently selected
    const allSelected = allIds.every(id => request.selectedActivityIds.includes(id));

    if (allSelected) {
      // Deselect all
      setRequest(prev => ({
        ...prev,
        selectedActivityIds: prev.selectedActivityIds.filter(id => !allIds.includes(id))
      }));
    } else {
      // Select all (add missing ones)
      setRequest(prev => ({
        ...prev,
        selectedActivityIds: [
          ...prev.selectedActivityIds,
          ...allIds.filter(id => !prev.selectedActivityIds.includes(id))
        ]
      }));
    }
  };

  const handleAutoSelect = async () => {
    if (isAutoSelecting) return;
    setIsAutoSelecting(true);
    setAutoSelectError(null);
    try {
      const ids = await autoSelectActivities(user, request, activityData);
      if (ids.length === 0) {
        setAutoSelectError(t.wizard.autoSelectEmpty || 'AI could not pick activities, please choose manually.');
        return;
      }
      setRequest(prev => ({ ...prev, selectedActivityIds: ids }));
      // Auto-expand any category that received picks so the user can see them
      const touched = new Set(ids.map(id => id.split(':')[0]));
      setCollapsedCategories(prev => {
        const next = new Set(prev);
        touched.forEach(k => next.delete(k));
        return next;
      });
    } catch (err: any) {
      console.warn('Auto-select failed', err);
      setAutoSelectError(t.wizard.autoSelectFailed || 'AI auto-select failed. Try again or pick manually.');
    } finally {
      setIsAutoSelecting(false);
    }
  };

  const toggleMeal = (meal: string) => {
    setRequest(prev => {
      const newMeals = prev.meals.includes(meal)
        ? prev.meals.filter(m => m !== meal)
        : [...prev.meals, meal];
      
      let newSelectedActivityIds = prev.selectedActivityIds;
      
      // If we deselected the last meal, remove all food-related activities
      if (newMeals.length === 0) {
        newSelectedActivityIds = prev.selectedActivityIds.filter(id => {
          const [catKey] = id.split(':');
          return !FOOD_CATEGORIES.includes(catKey);
        });
        // Auto-collapse food categories
        setCollapsedCategories(prev => {
          const next = new Set(prev);
          FOOD_CATEGORIES.forEach(k => next.add(k));
          return next;
        });
      } else {
        // Expand food categories when a meal is selected
        setCollapsedCategories(prev => {
          const next = new Set(prev);
          FOOD_CATEGORIES.forEach(k => next.delete(k));
          return next;
        });
      }

      return {
        ...prev,
        meals: newMeals,
        selectedActivityIds: newSelectedActivityIds
      };
    });
  };

  // --- Payment Input Formatters ---
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(" ");
    } else {
      return value;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`;
    }
    return v;
  };

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);
    setIsProcessingPayment(true);

    // Simulate Stripe Validation
    // Stripe Test Card is 4242 4242 4242 4242
    const cleanNumber = cardNumber.replace(/\s+/g, "");
    
    setTimeout(() => {
      if (isTestMode) {
        if (cleanNumber !== '4242424242424242') {
          setPaymentError("Test Mode Error: Please use the Stripe Test Card (4242 4242 4242 4242).");
          setIsProcessingPayment(false);
          return;
        }
      } else {
        // Live Mode Check (Simulated for Demo)
        if (cleanNumber.length < 16) {
             setPaymentError("Invalid card number. Please check your details.");
             setIsProcessingPayment(false);
             return;
        }
      }
      
      setIsProcessingPayment(false);
      onSubmit(request);
    }, 2000);
  };

  const renderStep1_Who = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t.wizard.step1Title}</h2>
        <p className="text-slate-500 dark:text-slate-400">{t.wizard.step1Subtitle}</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Organizer Card - Now Selectable */}
        <div 
            onClick={toggleUserInclusion}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center space-x-3 ${
                request.includeUser
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-500' 
                : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-slate-800'
            }`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
            request.includeUser ? 'bg-blue-200 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
          }`}>
            {user.name.charAt(0)}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">{user.name} ({t.wizard.you})</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{user.age} • {user.relation}</p>
          </div>
          {request.includeUser && <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 ml-auto" />}
        </div>

        {user.companions.map(companion => {
          const isSelected = request.selectedCompanionIds.includes(companion.id);
          return (
            <div 
              key={companion.id}
              onClick={() => toggleCompanion(companion.id)}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center space-x-3 ${
                isSelected 
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-500' 
                  : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-slate-800'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                isSelected ? 'bg-blue-200 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              }`}>
                {companion.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">{companion.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{companion.age} • {companion.relation}</p>
              </div>
              {isSelected && <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 ml-auto" />}
            </div>
          );
        })}
      </div>
      {!request.includeUser && request.selectedCompanionIds.length === 0 && (
         <p className="text-center text-sm text-red-500 dark:text-red-400 font-medium mt-4">Please select at least one person for the trip.</p>
      )}
    </div>
  );

  const renderStep2_WhereWhen = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t.wizard.step2Title}</h2>
        <p className="text-slate-500 dark:text-slate-400">{t.wizard.step2Subtitle}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 col-span-1">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center">
            <Calendar className="w-3 h-3 mr-1" /> {t.wizard.date}
          </label>
          <input 
            type="date" 
            value={request.date}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => setRequest({...request, date: e.target.value})}
            className="w-full text-sm font-medium bg-transparent outline-none text-slate-900 dark:text-white dark:[color-scheme:dark]"
          />
        </div>
        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 col-span-1">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center">
            <Clock className="w-3 h-3 mr-1" /> {t.wizard.start}
          </label>
          <input 
            type="time" 
            value={request.startTime}
            onChange={(e) => setRequest({...request, startTime: e.target.value})}
            className="w-full text-sm font-medium bg-transparent outline-none text-slate-900 dark:text-white dark:[color-scheme:dark]"
          />
        </div>
        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 col-span-1">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center">
            <Clock className="w-3 h-3 mr-1" /> {t.wizard.end}
          </label>
          <input 
            type="time" 
            value={request.endTime}
            onChange={(e) => setRequest({...request, endTime: e.target.value})}
            className="w-full text-sm font-medium bg-transparent outline-none text-slate-900 dark:text-white dark:[color-scheme:dark]"
          />
        </div>
        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 col-span-1">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center">
            <Wallet className="w-3 h-3 mr-1" /> {t.wizard.budget}
          </label>
          <select 
            value={request.budget}
            onChange={(e) => setRequest({...request, budget: e.target.value as any})}
            className="w-full text-sm font-medium bg-transparent outline-none text-slate-900 dark:text-white dark:bg-slate-800"
          >
            <option value="Economy">{t.wizard.economy}</option>
            <option value="Moderate">{t.wizard.moderate}</option>
            <option value="Luxury">{t.wizard.luxury}</option>
            <option value="Flexible">{t.wizard.flexible}</option>
          </select>
        </div>
      </div>

      {/* Search bar — above map, slightly narrower */}
      <div className="flex justify-center">
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex items-center p-2 w-full max-w-sm">
          <Search className="w-4 h-4 text-slate-400 ml-1 shrink-0" />
          <input 
            ref={searchInputRef}
            type="text" 
            className="w-full px-2 py-1.5 outline-none text-sm text-slate-900 dark:text-white bg-transparent"
            placeholder={t.wizard.searchPlaceholder}
          />
        </div>
      </div>

      {/* Map — fully visible, no overlays */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="h-[300px] w-full">
          {request.location.lat !== 0 ? (
             <GoogleMap 
               center={request.location}
               zoom={13}
               onMapClick={(lat, lng) => setRequest(prev => ({ 
                 ...prev, 
                 location: { ...prev.location, lat, lng, name: 'Selected Location' } 
               }))}
               markers={[{ lat: request.location.lat, lng: request.location.lng }]}
               radius={request.radius * 1000}
             />
          ) : (
             <div className="flex items-center justify-center h-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                {locationError ? locationError : "Acquiring your location..."}
             </div>
          )}
        </div>
      </div>

      {/* Location + radius panel — below map */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        {/* Location name + radius badge */}
        <div className="flex items-center justify-between mb-3">
           <div className="flex items-center text-sm font-medium text-slate-900 dark:text-white truncate mr-2">
             <MapPin className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400 flex-shrink-0" />
             {request.location.lat !== 0 
               ? request.location.name || `${request.location.lat.toFixed(4)}, ${request.location.lng.toFixed(4)}`
               : t.wizard.searching
             }
           </div>
           <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-full whitespace-nowrap">
             {request.radius} km
           </span>
        </div>

        {/* Walking / Driving toggle */}
        <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 mb-3">
          <button
            onClick={() => {
              setRadiusMode('walking');
              setRequest(prev => ({ ...prev, radius: Math.min(prev.radius, 5) }));
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold transition-colors ${
              radiusMode === 'walking'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <Footprints className="w-3.5 h-3.5" />
            Walking
          </button>
          <button
            onClick={() => setRadiusMode('driving')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold transition-colors ${
              radiusMode === 'driving'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            Driving
          </button>
        </div>

        {/* Radius slider */}
        <input
           type="range"
           min={radiusMode === 'walking' ? 0.5 : 1}
           max={radiusMode === 'walking' ? 5 : 100}
           step={radiusMode === 'walking' ? 0.5 : 1}
           value={request.radius}
           onChange={(e) => setRequest({...request, radius: Number(e.target.value)})}
           className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500"
         />
        <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 font-medium uppercase tracking-wider">
          <span>{radiusMode === 'walking' ? '0.5 km' : '1 km'}</span>
          <span>{radiusMode === 'walking' ? '5 km' : '100 km'}</span>
        </div>
      </div>

      <p className="text-center text-xs text-slate-400">Search for a place or tap on the map to change your starting location</p>
    </div>
  );

  const renderStep3_What = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t.wizard.step3Title}</h2>
        <p className="text-slate-500 dark:text-slate-400">{t.wizard.step3Subtitle}</p>
      </div>

      {/* Meals Selection */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 mb-6">
         <div className="flex items-center mb-3 text-slate-800 dark:text-slate-200 font-semibold">
            <Utensils className="w-5 h-5 mr-2 text-orange-500" />
            {t.wizard.mealsTitle}
         </div>
         <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{t.wizard.mealsSubtitle}</p>
         
         <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'breakfast', label: t.wizard.breakfast, icon: <Coffee className="w-4 h-4" /> },
              { id: 'lunch', label: t.wizard.lunch, icon: <Sun className="w-4 h-4" /> },
              { id: 'dinner', label: t.wizard.dinner, icon: <Moon className="w-4 h-4" /> }
            ].map(meal => (
               <button
                 key={meal.id}
                 onClick={() => toggleMeal(meal.id)}
                 className={`flex items-center justify-center p-3 rounded-lg border transition-all ${
                    request.meals.includes(meal.id) 
                    ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 font-medium shadow-sm' 
                    : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                 }`}
               >
                 {meal.icon}
                 <span className="ml-2">{meal.label}</span>
                 {request.meals.includes(meal.id) && <CheckCircle2 className="w-4 h-4 ml-2" />}
               </button>
            ))}
         </div>
      </div>

      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-900/40 rounded-xl p-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-semibold text-sm">
            <Sparkles className="w-4 h-4" /> {t.wizard.autoSelectTitle || 'Let AI pick the best for you'}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            {t.wizard.autoSelectSubtitle || 'AI suggests up to 10 best activities for this location and group.'}
          </p>
        </div>
        <Button
          onClick={handleAutoSelect}
          loading={isAutoSelecting}
          disabled={isAutoSelecting || request.location.lat === 0}
          size="sm"
          className="shrink-0"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {t.wizard.autoSelectButton || 'Auto-Select with AI'}
        </Button>
      </div>
      {autoSelectError && (
        <div className="mb-3 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
          {autoSelectError}
        </div>
      )}

      <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
        {(Object.entries(activityData) as [string, Category][]).map(([key, category]) => {
          // Filter out disabled activities
          const activeActivities = category.activities.filter(a => a.isActive !== false);
          if (activeActivities.length === 0) return null; // Skip empty categories

          const allIds = activeActivities.map(a => `${key}:${a.id}`);
          const allSelected = allIds.every(id => request.selectedActivityIds.includes(id));
          const icon = CATEGORY_ICONS[key] || <MapPin className="w-5 h-5" />;
          
          const isFoodCategory = FOOD_CATEGORIES.includes(key);
          const isDisabled = isFoodCategory && request.meals.length === 0;

          const isCollapsed = collapsedCategories.has(key);
          const selectedCount = allIds.filter(id => request.selectedActivityIds.includes(id)).length;

          const toggleCollapse = () => {
            setCollapsedCategories(prev => {
              const next = new Set(prev);
              next.has(key) ? next.delete(key) : next.add(key);
              return next;
            });
          };

          return (
            <div 
              key={key} 
              className={`border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden transition-all ${
                 isDisabled 
                 ? 'opacity-50 grayscale bg-slate-100 dark:bg-slate-900 pointer-events-none' 
                 : 'hover:shadow-md'
              }`}
            >
              <div
                className={`px-4 py-3 flex items-start justify-between cursor-pointer select-none ${
                  isCollapsed ? '' : 'border-b border-slate-100 dark:border-slate-700'
                } ${isDisabled ? 'bg-slate-100 dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800'}`}
                onClick={toggleCollapse}
              >
                {/* Left: icon + name + description + select all */}
                <div className="flex items-start space-x-3 min-w-0 flex-1">
                  <div className="bg-white dark:bg-slate-700 p-2 rounded-lg border border-slate-200 dark:border-slate-600 text-blue-600 dark:text-blue-400 shadow-sm shrink-0 mt-0.5">
                    {icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 leading-tight flex items-center gap-2 flex-wrap">
                      {category.category_name}
                      {isDisabled && <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-200 dark:bg-slate-700 dark:text-slate-500 px-1.5 py-0.5 rounded">Requires Meal</span>}
                      {!isDisabled && selectedCount > 0 && (
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-full">
                          {selectedCount} selected
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-2">{category.description}</p>
                    <button
                      onClick={e => { e.stopPropagation(); toggleCategory(key); }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-100 dark:border-blue-800 transition-colors"
                      disabled={isDisabled}
                    >
                      {allSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                      {allSelected ? t.wizard.unselectAll : t.wizard.selectAll}
                    </button>
                  </div>
                </div>
                {/* Right: collapse chevron */}
                <div className="shrink-0 ml-3 mt-1 p-1">
                  {isCollapsed
                    ? <ChevronDown className="w-5 h-5 text-slate-400" />
                    : <ChevronUp className="w-5 h-5 text-slate-400" />
                  }
                </div>
              </div>
              {!isCollapsed && (
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white dark:bg-slate-900">
                  {activeActivities.map(activity => {
                    const isSelected = request.selectedActivityIds.includes(`${key}:${activity.id}`);
                    return (
                      <button
                        key={activity.id}
                        onClick={() => toggleActivity(key, activity.id)}
                        disabled={isDisabled}
                        className={`text-left px-3 py-2 rounded-md text-sm transition-colors border ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-medium'
                            : 'bg-white dark:bg-slate-900 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <div className="font-medium">{activity.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-500 mt-0.5 line-clamp-1">{activity.description}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderStep4_Payment = () => (
    <div className="text-center space-y-8 py-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t.wizard.step4Title}</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-2">
          {t.wizard.step4Subtitle}
        </p>
      </div>

      <div className="max-w-md mx-auto">
        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-6 flex justify-between items-center">
            <div className="text-left">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">{t.wizard.total}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">€{planCost.toFixed(2)}</p>
            </div>
            <div className="text-right">
                <button 
                  type="button"
                  onClick={() => setIsTestMode(!isTestMode)}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold transition-all border shadow-sm ${
                    isTestMode 
                      ? "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700 dark:hover:bg-amber-900/50" 
                      : "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700 dark:hover:bg-emerald-900/50"
                  }`}
                  title="Switch Payment Mode"
                >
                    {isTestMode ? <Lock className="w-3 h-3 mr-1.5" /> : <ShieldCheck className="w-3 h-3 mr-1.5" />}
                    {isTestMode ? "Test Mode" : "Live Mode"}
                    <RefreshCw className="w-3 h-3 ml-2 opacity-50" />
                </button>
            </div>
        </div>

        {/* Card Form */}
        <form onSubmit={handlePayment} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 text-left relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${isTestMode ? 'from-amber-400 to-amber-500' : 'from-emerald-500 to-emerald-600'}`}></div>
            
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                Pay with Card
            </h3>

            {/* Test Mode Tip - Only visible in Test Mode */}
            {isTestMode && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-3 mb-6 text-xs text-blue-700 dark:text-blue-300 flex items-start">
                   <ShieldCheck className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                   <div>
                      <span className="font-bold">Developer Mode:</span> Use the Stripe Test Card <br/>
                      <span className="font-mono bg-white dark:bg-slate-800 px-1 rounded border border-blue-200 dark:border-blue-800 mt-1 inline-block select-all">4242 4242 4242 4242</span>
                   </div>
                </div>
            )}

            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Card Number</label>
                    <div className="relative">
                        <input 
                            type="text" 
                            className={`w-full pl-10 pr-4 py-2.5 rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all ${paymentError ? 'border-red-300 focus:border-red-500' : 'border-slate-300 dark:border-slate-600'}`}
                            placeholder={isTestMode ? "4242 4242 4242 4242" : "0000 0000 0000 0000"}
                            value={cardNumber}
                            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                            maxLength={19}
                            required
                        />
                        <div className="absolute left-3 top-2.5 text-slate-400">
                           <CreditCard className="w-5 h-5" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Expiration</label>
                        <input 
                            type="text" 
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="MM / YY"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                            maxLength={5}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">CVC</label>
                        <input 
                            type="text" 
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="123"
                            value={cardCvc}
                            onChange={(e) => setCardCvc(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
                            maxLength={3}
                            required
                        />
                    </div>
                </div>
            </div>

            {paymentError && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 text-xs rounded-lg flex items-start animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                    {paymentError}
                </div>
            )}

            <Button 
                type="submit" 
                className={`w-full mt-6 text-white transition-colors ${isTestMode ? 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                size="lg" 
                loading={isProcessingPayment}
            >
                {isProcessingPayment ? 'Processing...' : `Pay €${planCost.toFixed(2)}`}
            </Button>
            
            <div className="mt-4 flex justify-center items-center text-[10px] text-slate-400 dark:text-slate-500">
                <Lock className="w-3 h-3 mr-1" />
                Payments are securely processed by Stripe.
            </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">
          <span className={step >= 1 ? 'text-blue-600 dark:text-blue-400' : ''}>{t.dashboard.profileTitle}</span>
          <span className={step >= 2 ? 'text-blue-600 dark:text-blue-400' : ''}>{t.wizard.step2Title}</span>
          <span className={step >= 3 ? 'text-blue-600 dark:text-blue-400' : ''}>{t.wizard.step3Title}</span>
          <span className={step >= 4 ? 'text-blue-600 dark:text-blue-400' : ''}>{t.wizard.step4Title}</span>
        </div>
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-500 ease-out" 
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-8 min-h-[400px]">
        {step === 1 && renderStep1_Who()}
        {step === 2 && renderStep2_WhereWhen()}
        {step === 3 && renderStep3_What()}
        {step === 4 && renderStep4_Payment()}
      </div>

      <div className="mt-6 flex justify-between">
        {step > 1 && (
          <Button variant="outline" onClick={() => setStep(step - 1)} className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
            <ChevronLeft className="w-4 h-4 mr-1" /> {t.wizard.back}
          </Button>
        )}
        {step === 1 && (
           <Button variant="ghost" onClick={onCancel} className="text-slate-500 dark:text-slate-400 dark:hover:bg-slate-800">{t.wizard.cancel}</Button>
        )}

        {step < 4 && (
          <Button 
            className="ml-auto" 
            onClick={() => setStep(step + 1)}
            disabled={
              (step === 1 && !request.includeUser && request.selectedCompanionIds.length === 0) ||
              (step === 2 && (request.location.lat === 0 || !request.date || !request.startTime || !request.endTime)) ||
              (step === 3 && request.selectedActivityIds.length === 0)
            }
          >
            {t.wizard.next} <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
};