import React, { useState, useEffect, useRef } from 'react';
import { Clock, MapPin, DollarSign, Calendar, Star, CloudSun, Footprints, Car, Navigation, Image as ImageIcon, ChevronLeft, ChevronRight, Check, Bus, Train, ArrowRight, LayoutList, CheckCircle, Lightbulb, ExternalLink, Globe } from 'lucide-react';
import { DayPlan, Review, TransportMode, ActivityOption, Language } from '../types';
import { Button } from './Button';
import { StarRating } from './StarRating';
import { GoogleMap } from './GoogleMap';
import { finalizeItinerary } from '../services/geminiService';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { LocalNotifications } from '@capacitor/local-notifications';

interface PlanResultProps {
  plan: DayPlan;
  onClose: () => void;
  onUpdatePlan: (updatedPlan: DayPlan) => void;
  onSubmitReviews: (reviews: Review[]) => void;
  language: Language;
}

// Component to fetch and display images from Google Places as a carousel
const PlaceGallery = ({ locationName }: { locationName: string }) => {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const serviceRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;
    if (!window.google || !window.google.maps || !window.google.maps.places) {
       setLoading(false);
       return;
    }

    const dummyNode = document.createElement('div');
    serviceRef.current = new window.google.maps.places.PlacesService(dummyNode);

    const fetchImages = () => {
      const request = {
        query: locationName,
        fields: ['photos'],
      };

      serviceRef.current.findPlaceFromQuery(request, (results: any[], status: any) => {
        if (!isMounted) return;
        
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
           const photos = results[0].photos || [];
           if (photos.length > 0) {
              // Fetch up to 5 images
              const urls = photos.slice(0, 5).map((p: any) => p.getUrl({ maxWidth: 800, maxHeight: 600 }));
              setImageUrls(urls);
           }
        }
        setLoading(false);
      });
    };

    fetchImages();
    return () => { isMounted = false; };
  }, [locationName]);

  const nextSlide = () => {
      setCurrentIndex((prev) => (prev === imageUrls.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
      setCurrentIndex((prev) => (prev === 0 ? imageUrls.length - 1 : prev - 1));
  };

  if (loading) return <div className="h-48 bg-slate-100 dark:bg-slate-800 w-full animate-pulse rounded-lg mb-4"></div>;
  
  if (imageUrls.length === 0) return (
     <div className="h-48 bg-slate-100 dark:bg-slate-800 w-full rounded-lg mb-4 flex items-center justify-center text-slate-400 dark:text-slate-500">
        <ImageIcon className="w-8 h-8 opacity-50" />
     </div>
  );

  return (
    <div className="relative group w-full h-48 mb-4 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 select-none">
      <img 
        src={imageUrls[currentIndex]} 
        alt={locationName} 
        className="w-full h-full object-cover transition-transform duration-500 ease-in-out"
      />
      
      {imageUrls.length > 1 && (
        <>
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
            
            <button 
                onClick={(e) => { e.stopPropagation(); prevSlide(); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm shadow-md"
            >
                <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
                onClick={(e) => { e.stopPropagation(); nextSlide(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm shadow-md"
            >
                <ChevronRight className="w-4 h-4" />
            </button>
            
            <div className="absolute bottom-3 left-0 right-0 flex justify-center space-x-1.5 z-10">
                {imageUrls.map((_, idx) => (
                    <button 
                        key={idx}
                        onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                        className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'bg-white w-4' : 'bg-white/50 w-1.5 hover:bg-white/80'}`}
                    />
                ))}
            </div>
        </>
      )}
    </div>
  );
};

const generateTips = (options: ActivityOption[]) => {
    const tips = [
        "Did you know? Checking opening hours in advance can save you a wasted trip.",
        "Pro tip: Download offline maps if you're exploring areas with spotty signal.",
        "Remember to stay hydrated throughout your journey!",
        "Keep a portable charger handy for taking lots of photos.",
    ];
    
    // Add specific tips
    if (options.some(o => o.activity.toLowerCase().includes('walk') || o.travelInfo?.mode === 'walking')) {
        tips.push("You have walking planned. Wear your most comfortable shoes!");
    }
    if (options.some(o => o.activity.toLowerCase().includes('beach') || o.activity.toLowerCase().includes('outdoor'))) {
        tips.push("Don't forget sunscreen and sunglasses for your outdoor stops.");
    }
    if (options.some(o => o.activity.toLowerCase().includes('dinner') || o.activity.toLowerCase().includes('restaurant') || o.activity.toLowerCase().includes('food'))) {
        tips.push("For popular restaurants, making a reservation is always safer.");
    }
    if (options.some(o => o.activity.toLowerCase().includes('museum') || o.activity.toLowerCase().includes('gallery'))) {
        tips.push("Check if museums offer discount tickets if bought online.");
    }
    
    return tips.sort(() => 0.5 - Math.random());
};

export const PlanResult: React.FC<PlanResultProps> = ({ plan: masterPlan, onClose, onUpdatePlan, onSubmitReviews, language }) => {
  // Determine if we should show the finalized version or the draft version
  const [viewMode, setViewMode] = useState<'draft' | 'final'>(masterPlan.finalizedPlan ? 'final' : 'draft');
  
  // The plan currently being displayed
  const currentDisplayPlan = viewMode === 'final' && masterPlan.finalizedPlan ? masterPlan.finalizedPlan : masterPlan;
  
  const [isReviewMode, setIsReviewMode] = useState(false);
  
  // Selections state (persisted in masterPlan if available)
  const [selections, setSelections] = useState<Record<number, number>>(masterPlan.userSelections || {});
  const [reviews, setReviews] = useState<Record<number, Partial<Review>>>({});
  
  // Hover states
  const [hoveredSlotIndex, setHoveredSlotIndex] = useState<number | null>(null);
  const [hoveredOptionIndex, setHoveredOptionIndex] = useState<number | null>(null);
  
  // States for finalization
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [transportMode, setTransportMode] = useState<TransportMode>('driving');
  const [isFinalizing, setIsFinalizing] = useState(false);
  
  // Tips state
  const [tips, setTips] = useState<string[]>([]);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [tipProgress, setTipProgress] = useState(0);

  // Update local view mode if master plan changes externally (e.g. initial load)
  useEffect(() => {
    if (masterPlan.finalizedPlan && viewMode === 'draft') {
       // Optional: Auto-switch if finalized? For now, let user choose, but we init state above.
    }
  }, [masterPlan]);

  // Persist selections to parent component whenever they change
  useEffect(() => {
     if (Object.keys(selections).length > 0 && viewMode === 'draft') {
         // This can be optimized to not trigger on every click, but for now ensures safety
         // We won't call onUpdatePlan here to avoid infinite loops, but we use 'selections' 
         // when finalizing.
     }
  }, [selections, viewMode]);

  // Tip rotation logic
  useEffect(() => {
    if (!isFinalizing) return;
    
    const interval = setInterval(() => {
        setTipProgress(prev => {
            if (prev >= 100) {
                setCurrentTipIndex(current => (current + 1) % tips.length);
                return 0;
            }
            return prev + 0.75; // Slower tip rotation (~7 seconds per tip)
        });
    }, 50);

    return () => clearInterval(interval);
  }, [isFinalizing, tips.length]);

  // If finalized, there is only option 0
  const getActiveOption = (slotIndex: number) => {
    const selectedIdx = viewMode === 'final' ? 0 : (selections[slotIndex] || 0);
    return currentDisplayPlan.itinerary[slotIndex].options[selectedIdx];
  };

  const handleSelectOption = (slotIndex: number, optionIndex: number) => {
    const newSelections = { ...selections, [slotIndex]: optionIndex };
    setSelections(newSelections);
    
    // Update the master plan with these selections so they are saved
    // Note: We are mutating the prop indirectly via onUpdatePlan for persistence
    onUpdatePlan({ ...masterPlan, userSelections: newSelections });
  };

  // Logic to determine what to show on the map
  const getMapMarkers = () => {
    if (viewMode === 'final') {
       // Finalized Mode: 1-N strictly
       return currentDisplayPlan.itinerary.map((item, idx) => {
         const opt = item.options[0];
         return {
           lat: opt.latitude,
           lng: opt.longitude,
           title: opt.locationName,
           label: (idx + 1).toString(),
           color: 'emerald',
           scale: 1.2,
           zIndex: 50
         };
       });
    } else if (hoveredSlotIndex !== null && !isReviewMode) {
      // Selection Mode: Hovering a slot (Detail view)
      const slot = currentDisplayPlan.itinerary[hoveredSlotIndex];
      return slot.options.map((opt, idx) => {
        const isSelected = selections[hoveredSlotIndex] === idx;
        const isHovered = hoveredOptionIndex === idx;
        
        // Priority: Hovered > Selected > Others
        let color = 'gray';
        let zIndex = 1;
        let scale = 1;

        if (isHovered) {
            color = 'orange';
            zIndex = 100;
            scale = 1.3;
        } else if (isSelected) {
            color = 'blue';
            zIndex = 50;
            scale = 1.2;
        }

        return {
            lat: opt.latitude,
            lng: opt.longitude,
            title: opt.locationName,
            label: String.fromCharCode(65 + idx), // A, B, C...
            color: color,
            zIndex: zIndex,
            scale: scale
        };
      });
    } else {
      // Selection Mode: Overview of selected
      return currentDisplayPlan.itinerary.map((item, idx) => {
        const opt = item.options[selections[idx] || 0];
        return {
          lat: opt.latitude,
          lng: opt.longitude,
          title: opt.locationName,
          label: (idx + 1).toString(),
          color: 'blue',
          scale: 1
        };
      });
    }
  };

  const mapMarkers = getMapMarkers();

  // Calculate center based on markers
  const centerLat = mapMarkers.length > 0 ? mapMarkers.reduce((s, p) => s + p.lat, 0) / mapMarkers.length : 51.505;
  const centerLng = mapMarkers.length > 0 ? mapMarkers.reduce((s, p) => s + p.lng, 0) / mapMarkers.length : -0.09;

  const handleRate = (index: number, rating: number) => {
    setReviews(prev => ({ ...prev, [index]: { ...prev[index], rating } }));
  };

  const handleComment = (index: number, comment: string) => {
    setReviews(prev => ({ ...prev, [index]: { ...prev[index], comment } }));
  };

  const submitFeedback = () => {
    const submittedReviews: Review[] = [];
    currentDisplayPlan.itinerary.forEach((item, index) => {
      const activeOption = getActiveOption(index);
      const review = reviews[index];
      if (review && review.rating) {
        submittedReviews.push({
          activityName: activeOption.activity,
          locationName: activeOption.locationName,
          rating: review.rating,
          comment: review.comment || '',
          date: new Date().toISOString()
        });
      }
    });
    if (submittedReviews.length > 0) {
      onSubmitReviews(submittedReviews);
    } else {
      onClose();
    }
  };

  const openDirections = (lat: number, lng: number, mode: string) => {
    const travelMode = mode === 'walking' ? 'walking' : mode === 'public_transport' ? 'transit' : 'driving';
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=${travelMode}`, '_blank');
  };

  const FINALIZING_NOTIFICATION_ID = 9002;

  const handleFinalizePlan = async () => {
    setIsFinalizing(true);
    setShowTransportModal(false);

    // Collect all currently selected options
    const selectedOptions: ActivityOption[] = masterPlan.itinerary.map((item, index) => {
        return item.options[selections[index] || 0];
    });

    // Generate tips based on selection
    setTips(generateTips(selectedOptions));
    setTipProgress(0);
    setCurrentTipIndex(0);

    // Keep screen awake and show persistent notification so Android keeps process alive
    try { await KeepAwake.keepAwake(); } catch {}
    try {
      await LocalNotifications.schedule({
        notifications: [{
          id: FINALIZING_NOTIFICATION_ID,
          title: '⏳ Optimizing your itinerary...',
          body: 'Calculating routes and travel times. Please wait.',
          channelId: 'todayplan-channel',
          ongoing: true,
          autoCancel: false,
          smallIcon: 'ic_launcher',
        }]
      });
    } catch {}

    try {
        const finalized = await finalizeItinerary(masterPlan, selectedOptions, transportMode, "Current Location", language);
        
        // Update the master plan to include the finalized version
        const updatedMasterPlan: DayPlan = {
            ...masterPlan,
            userSelections: selections,
            finalizedPlan: finalized
        };
        
        onUpdatePlan(updatedMasterPlan);
        setViewMode('final');

        // Notify user finalization is complete
        try {
          await LocalNotifications.schedule({
            notifications: [{
              id: Date.now(),
              title: '✅ Itinerary finalized!',
              body: 'Your optimized route is ready. Tap to view.',
              channelId: 'todayplan-channel',
              smallIcon: 'ic_launcher',
            }]
          });
        } catch {}
    } catch (e) {
        console.error("Failed to finalize", e);
        // Notify user of failure
        try {
          await LocalNotifications.schedule({
            notifications: [{
              id: Date.now(),
              title: '⚠️ Optimization failed',
              body: 'Failed to optimize itinerary. Please try again.',
              channelId: 'todayplan-channel',
              smallIcon: 'ic_launcher',
            }]
          });
        } catch {}
    } finally {
        setIsFinalizing(false);
        // Release wake lock and cancel persistent notification
        try { await KeepAwake.allowSleep(); } catch {}
        try { await LocalNotifications.cancel({ notifications: [{ id: FINALIZING_NOTIFICATION_ID }] }); } catch {}
    }
  };

  if (isFinalizing) {
    return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 max-w-lg mx-auto my-10 transition-colors duration-300">
           <div className="relative mb-8">
                <div className="animate-spin rounded-full h-20 w-20 border-[6px] border-slate-100 dark:border-slate-800 border-t-blue-600 dark:border-t-blue-500"></div>
                <div className="absolute inset-0 flex items-center justify-center text-blue-600 dark:text-blue-500">
                    <Navigation className="w-8 h-8 animate-pulse" />
                </div>
           </div>
           
           <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">Optimizing Route...</h3>
           <p className="text-slate-500 dark:text-slate-400 mb-10 text-center max-w-xs mx-auto text-base">
               Finding the best {transportMode === 'driving' ? 'driving' : transportMode === 'public_transport' ? 'transport' : 'walking'} connections and calculating travel times.
           </p>

           {tips.length > 0 && (
               <div className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl p-8 relative overflow-hidden flex flex-col items-center text-center shadow-inner">
                   
                   <div className="mb-4 bg-white dark:bg-slate-700 p-3 rounded-full text-amber-500 shadow-sm border border-slate-100 dark:border-slate-600">
                       <Lightbulb className="w-6 h-6 fill-amber-500" />
                   </div>
                   
                   <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Travel Tip</h4>
                   
                   <div className="min-h-[80px] flex items-center justify-center w-full px-2">
                       <p 
                         key={currentTipIndex}
                         className="text-lg text-slate-800 dark:text-slate-200 font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-3 duration-700"
                       >
                           {tips[currentTipIndex]}
                       </p>
                   </div>

                   {/* Progress Bar Container */}
                   <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full mt-8 overflow-hidden">
                       <div 
                         className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-500 rounded-full transition-all duration-300 ease-out" 
                         style={{ width: `${tipProgress}%` }} 
                       />
                   </div>
               </div>
           )}
        </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-5rem)] h-auto relative">
      
      {/* Transport Selection Modal */}
      {showTransportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl max-w-md w-full animate-in fade-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">How will you travel?</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-6">We will re-order your stops and calculate travel times based on your choice.</p>
              
              <div className="space-y-3 mb-8">
                  <button 
                    onClick={() => setTransportMode('driving')}
                    className={`w-full p-4 rounded-xl border-2 flex items-center transition-all ${transportMode === 'driving' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-500' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 dark:text-slate-300'}`}
                  >
                     <div className={`p-2 rounded-full mr-4 ${transportMode === 'driving' ? 'bg-blue-200 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                        <Car className="w-6 h-6" />
                     </div>
                     <div className="text-left">
                        <div className="font-bold text-slate-900 dark:text-white">Car / Taxi</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">Optimized for driving routes</div>
                     </div>
                  </button>

                  <button 
                    onClick={() => setTransportMode('public_transport')}
                    className={`w-full p-4 rounded-xl border-2 flex items-center transition-all ${transportMode === 'public_transport' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-500' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 dark:text-slate-300'}`}
                  >
                     <div className={`p-2 rounded-full mr-4 ${transportMode === 'public_transport' ? 'bg-blue-200 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                        <Bus className="w-6 h-6" />
                     </div>
                     <div className="text-left">
                        <div className="font-bold text-slate-900 dark:text-white">Public Transport</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">Bus, Subway, or Train connections</div>
                     </div>
                  </button>

                  <button 
                    onClick={() => setTransportMode('walking')}
                    className={`w-full p-4 rounded-xl border-2 flex items-center transition-all ${transportMode === 'walking' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-500' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 dark:text-slate-300'}`}
                  >
                     <div className={`p-2 rounded-full mr-4 ${transportMode === 'walking' ? 'bg-blue-200 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                        <Footprints className="w-6 h-6" />
                     </div>
                     <div className="text-left">
                        <div className="font-bold text-slate-900 dark:text-white">Walking</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">Scenic routes for short distances</div>
                     </div>
                  </button>
              </div>
              
              <div className="flex space-x-3">
                 <Button variant="ghost" className="flex-1 dark:text-slate-300 dark:hover:bg-slate-800" onClick={() => setShowTransportModal(false)}>Cancel</Button>
                 <Button className="flex-1 text-white" onClick={handleFinalizePlan}>Generate Final Plan</Button>
              </div>
           </div>
        </div>
      )}

      {/* Left: Itinerary List / Review Form */}
      <div className="lg:w-1/2 w-full flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden lg:h-full min-h-[500px] transition-colors duration-300">
        {/* View Mode Toggle Switcher (If finalized plan exists) */}
        {masterPlan.finalizedPlan && !isReviewMode && (
             <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
                 <button 
                    onClick={() => setViewMode('draft')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center transition-colors ${viewMode === 'draft' ? 'text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 border-b-2 border-blue-600 dark:border-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                 >
                    <LayoutList className="w-4 h-4 mr-2" />
                    Options & Selection
                 </button>
                 <button 
                    onClick={() => setViewMode('final')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center transition-colors ${viewMode === 'final' ? 'text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 border-b-2 border-emerald-600 dark:border-emerald-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                 >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Finalized Itinerary
                 </button>
             </div>
        )}

        <div className={`p-6 border-b border-slate-100 dark:border-slate-800 text-white flex-shrink-0 transition-colors ${viewMode === 'final' ? 'bg-emerald-600 dark:bg-emerald-700' : 'bg-blue-600 dark:bg-blue-700'}`}>
          <div className="flex justify-between items-start mb-4">
            <div>
               <div className="flex items-center space-x-2">
                 <h1 className="text-2xl font-bold">{isReviewMode ? "Rate Your Experience" : currentDisplayPlan.title}</h1>
                 {viewMode === 'final' && <Check className="w-6 h-6 text-emerald-200 bg-white/20 rounded-full p-1" />}
               </div>
               <div className="flex items-center space-x-4 mt-2 text-blue-100 text-sm">
                 <span className="flex items-center"><Calendar className="w-4 h-4 mr-1"/> {currentDisplayPlan.date || new Date().toLocaleDateString()}</span>
                 {!isReviewMode && currentDisplayPlan.totalCostEstimate && <span className="flex items-center"><DollarSign className="w-4 h-4 mr-1"/> {currentDisplayPlan.totalCostEstimate}</span>}
                 {currentDisplayPlan.transportMode && (
                     <span className="flex items-center uppercase text-xs font-bold bg-white/20 px-2 py-0.5 rounded ml-2">
                         {currentDisplayPlan.transportMode === 'driving' ? <Car className="w-3 h-3 mr-1"/> : currentDisplayPlan.transportMode === 'public_transport' ? <Bus className="w-3 h-3 mr-1"/> : <Footprints className="w-3 h-3 mr-1"/>}
                         {currentDisplayPlan.transportMode.replace('_', ' ')}
                     </span>
                 )}
               </div>
            </div>
            {!isReviewMode && (
              <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/20">
                Close
              </Button>
            )}
          </div>
          <p className="opacity-90 leading-relaxed text-sm line-clamp-2">
            {isReviewMode ? "Rate the places you selected to visit." : currentDisplayPlan.summary}
          </p>
        </div>

        {/* Weather Forecast Banner (Timeline) */}
        {!isReviewMode && currentDisplayPlan.weather && (
          <div className="bg-blue-50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-900/30 text-blue-900 dark:text-blue-100">
             {/* Summary Header */}
             <div className="px-6 py-3 flex items-center justify-between">
                 <div className="flex items-center">
                    <CloudSun className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                    <span className="font-semibold text-sm">{currentDisplayPlan.weather.summary}</span>
                 </div>
                 <div className="italic text-blue-700 dark:text-blue-300 text-xs flex items-center">
                    <span className="bg-white/50 dark:bg-slate-800/50 px-2 py-1 rounded-full">💡 {currentDisplayPlan.weather.advice}</span>
                 </div>
             </div>
             
             {/* Intervals Scroll */}
             <div className="flex overflow-x-auto px-6 pb-3 space-x-3 scrollbar-hide">
                {currentDisplayPlan.weather.intervals?.map((interval, i) => (
                    <div key={i} className="flex flex-col items-center min-w-[70px] p-2 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-blue-100/50 dark:border-blue-900/20 shadow-sm">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{interval.time}</span>
                        <span className="text-md font-semibold text-blue-700 dark:text-blue-300 my-1">
                           {interval.temperature}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis max-w-full" title={interval.condition}>{interval.condition}</span>
                    </div>
                ))}
             </div>
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {currentDisplayPlan.itinerary.map((item, index) => {
            const activeOption = getActiveOption(index);
            const selectedIdx = selections[index] || 0;

            // Helpers for deduplication in finalized view
            const prevOption = index > 0 ? getActiveOption(index - 1) : null;
            const isSameLocationAsPrev = viewMode === 'final' && prevOption &&
              prevOption.locationName === activeOption.locationName;
            const isZeroTravel = (() => {
              const t = activeOption.travelInfo;
              if (!t) return false;
              const zeroDistance = !t.distance || t.distance === '0 km' || t.distance === '0m' || t.distance === '0' || t.distance.startsWith('0 ');
              const zeroDuration = !t.duration || t.duration === '0 min' || t.duration === '0s' || t.duration === '0' || t.duration.startsWith('0 ');
              return zeroDistance && zeroDuration;
            })();
            const isSameDirectionsAsPrev = viewMode === 'final' && prevOption &&
              prevOption.latitude === activeOption.latitude &&
              prevOption.longitude === activeOption.longitude;

            return (
              <div 
                key={index} 
                className={`relative pl-8 border-l-2 transition-colors ${
                    hoveredSlotIndex === index ? 'border-blue-400 dark:border-blue-500' : 'border-slate-200 dark:border-slate-700'
                } ${isReviewMode ? 'pb-6' : 'pb-8'} last:border-0 last:pb-0`}
                onMouseEnter={() => setHoveredSlotIndex(index)}
                onMouseLeave={() => { setHoveredSlotIndex(null); setHoveredOptionIndex(null); }}
              >
                <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 shadow-sm flex items-center justify-center text-[8px] text-white font-bold transition-colors ${
                    hoveredSlotIndex === index ? 'bg-blue-600 dark:bg-blue-500' : 'bg-blue-400 dark:bg-blue-700'
                }`}>
                  {index + 1}
                </div>
                
                <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 font-semibold text-sm mb-3">
                   <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1.5" />
                      {item.time}
                   </div>
                   {!isReviewMode && hoveredSlotIndex === index && viewMode === 'draft' && (
                       <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full animate-in fade-in">
                           Viewing Options on Map
                       </span>
                   )}
                </div>
                
                {!isReviewMode ? (
                  <div className="space-y-3">
                    {/* Only show Option Tabs if NOT finalized view */}
                    {viewMode === 'draft' && (
                        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
                        {item.options.map((opt, optIdx) => (
                            <button
                            key={opt.id}
                            onClick={() => handleSelectOption(index, optIdx)}
                            onMouseEnter={() => setHoveredOptionIndex(optIdx)}
                            onMouseLeave={() => setHoveredOptionIndex(null)}
                            className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm border transition-all text-left w-48 flex flex-col justify-between h-20 relative group ${
                                selectedIdx === optIdx 
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-500 ring-1 ring-blue-500 dark:ring-blue-500' 
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-600'
                            }`}
                            >
                            <div className="absolute top-1 right-2 text-[10px] font-bold text-slate-300 dark:text-slate-600 group-hover:text-blue-400">
                                {String.fromCharCode(65 + optIdx)}
                            </div>
                            <div>
                                <div className={`font-medium truncate pr-4 ${selectedIdx === optIdx ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                    {opt.activity}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{opt.estimatedCost || '$$'}</div>
                            </div>
                            <div className="flex items-center justify-between mt-auto">
                                <div className="flex items-center text-xs font-bold text-amber-500">
                                    <Star className="w-3 h-3 fill-amber-500 mr-1" />
                                    {opt.rating}
                                </div>
                                {selectedIdx === optIdx && <Check className="w-3 h-3 text-blue-600 dark:text-blue-400" />}
                            </div>
                            </button>
                        ))}
                        </div>
                    )}

                    {/* Active Option Details */}
                    <div 
                      className={`${viewMode === 'final' ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'} rounded-xl p-4 border animate-in fade-in duration-300`}
                    >
                      
                      {!isSameLocationAsPrev && <PlaceGallery locationName={activeOption.locationName} />}

                      <div className="flex justify-between items-start mb-2">
                        <div>
                            <div className="flex items-center space-x-2">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{activeOption.locationName}</h3>
                                {activeOption.sourceUri && (
                                    <a 
                                        href={activeOption.sourceUri} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-slate-400 hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400"
                                        title="View on Google Maps"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                )}
                            </div>
                            {activeOption.address && (
                                <div className="flex items-start text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    <MapPin className="w-3 h-3 mr-1 flex-shrink-0 mt-0.5" />
                                    <span>{activeOption.address}</span>
                                </div>
                            )}
                            {viewMode === 'draft' && (
                                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mt-1 block">
                                    Option {String.fromCharCode(65 + (selections[index] || 0))}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center bg-white dark:bg-slate-700 px-2 py-1 rounded border border-slate-200 dark:border-slate-600 shadow-sm">
                           <Star className="w-3 h-3 text-amber-500 fill-amber-500 mr-1" />
                           <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{activeOption.rating}</span>
                        </div>
                      </div>
                      
                      <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">{activeOption.description}</p>
                      
                      {/* NEW SECTION: Working Hours and Website */}
                      {(activeOption.workingHours || activeOption.website) && (
                        <div className="flex flex-wrap gap-y-2 gap-x-4 mb-4 text-xs font-medium text-slate-600 dark:text-slate-400 bg-white/50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                            {activeOption.workingHours && (
                                <div className="flex items-center">
                                    <Clock className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                                    <span>{activeOption.workingHours}</span>
                                </div>
                            )}
                            {activeOption.website && (
                                <a 
                                    href={activeOption.website} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center hover:text-blue-600 dark:hover:text-blue-400 transition-colors hover:underline"
                                >
                                    <Globe className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                                    <span>Visit Website</span>
                                </a>
                            )}
                        </div>
                      )}

                      {/* Finalized Instructions */}
                      {viewMode === 'final' && activeOption.travelInfo?.instructions && (
                          <div className="mb-4 pt-3 border-t border-emerald-200/50 dark:border-emerald-800/30">
                              <div className="flex items-start text-emerald-800 dark:text-emerald-300 text-xs bg-emerald-100/50 dark:bg-emerald-900/30 p-2 rounded">
                                  <ArrowRight className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                                  <span>{activeOption.travelInfo.instructions}</span>
                              </div>
                          </div>
                      )}

                      {/* Enhanced Travel Info Display */}
                      {(!isZeroTravel || !isSameDirectionsAsPrev) && (
                      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {activeOption.travelInfo && !isZeroTravel && (
                             <div className="flex items-center bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                                <div className={`p-2 rounded-full mr-3 ${
                                    activeOption.travelInfo.mode === 'walking' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                                    activeOption.travelInfo.mode === 'public_transport' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' :
                                    'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                }`}>
                                    {activeOption.travelInfo.mode === 'walking' ? <Footprints size={16} /> : 
                                     activeOption.travelInfo.mode === 'public_transport' ? <Bus size={16} /> : <Car size={16} />}
                                </div>
                                <div>
                                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                      {activeOption.travelInfo.mode === 'walking' ? 'Walking' : 
                                       activeOption.travelInfo.mode === 'public_transport' ? 'Public Transport' : 'Driving'}
                                    </div>
                                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center">
                                        {activeOption.travelInfo.duration}
                                        <span className="mx-1.5 text-slate-300 dark:text-slate-600">|</span>
                                        {activeOption.travelInfo.distance}
                                    </div>
                                </div>
                             </div>
                          )}

                          {!isSameDirectionsAsPrev && (
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="w-full sm:w-auto h-auto py-2.5 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                            onClick={() => openDirections(activeOption.latitude, activeOption.longitude, activeOption.travelInfo?.mode)}
                          >
                             <Navigation className="w-4 h-4 mr-2" />
                             Directions
                          </Button>
                          )}
                      </div>
                      )}

                    </div>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">{activeOption.locationName}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{activeOption.activity}</p>
                    
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Rating</span>
                        <StarRating 
                          rating={reviews[index]?.rating || 0} 
                          onRate={(r) => handleRate(index, r)} 
                          size="lg"
                        />
                      </div>
                      {reviews[index]?.rating ? (
                        <textarea
                          className="w-full text-sm p-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder="Any comments?"
                          rows={2}
                          value={reviews[index]?.comment || ''}
                          onChange={(e) => handleComment(index, e.target.value)}
                        />
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
           {!isReviewMode ? (
             viewMode === 'draft' ? (
                <div className="flex space-x-3">
                    <div className="flex-1 text-xs text-slate-500 dark:text-slate-400 flex items-center">
                        {masterPlan.finalizedPlan 
                            ? "You have a finalized itinerary available. Switch views to see it." 
                            : "Select your preferred option for each time slot, then finalize."}
                    </div>
                    {masterPlan.finalizedPlan ? (
                        <Button className="flex-none bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setViewMode('final')}>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            View Finalized Plan
                        </Button>
                    ) : (
                        <Button className="flex-none bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setShowTransportModal(true)}>
                            <Check className="w-4 h-4 mr-2" />
                            Finalize Itinerary
                        </Button>
                    )}
                </div>
             ) : (
                <div className="flex space-x-3">
                   <div className="flex-1 text-xs text-slate-500 dark:text-slate-400 flex items-center">
                        Enjoy your trip! You can switch back to options if needed.
                   </div>
                   <Button className="flex-none text-white" onClick={() => setIsReviewMode(true)}>
                       <Star className="w-4 h-4 mr-2" />
                       Rate & Finish
                   </Button>
                </div>
             )
           ) : (
             <div className="flex space-x-3">
               <Button variant="outline" className="flex-1 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800" onClick={() => setIsReviewMode(false)}>
                 Back
               </Button>
               <Button className="flex-1 text-white" onClick={submitFeedback}>
                 Submit Reviews
               </Button>
             </div>
           )}
        </div>
      </div>

      {/* Right: Map */}
      <div className="lg:w-1/2 w-full bg-slate-200 dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-700 shadow-inner relative h-[300px] lg:h-full flex-shrink-0">
        <GoogleMap 
           center={{ lat: centerLat, lng: centerLng }}
           zoom={13}
           markers={mapMarkers}
           fitToMarkers={true}
        />
        {/* Map Legend Overlay */}
        <div className="absolute top-4 left-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-2 rounded-md shadow border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200">
            {viewMode === 'final' ? (
                <div className="flex items-center text-emerald-700 dark:text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
                    Finalized Route
                </div>
            ) : hoveredSlotIndex !== null ? (
                <span>Showing options for Time Slot {hoveredSlotIndex + 1}</span>
            ) : (
                <span>Showing Selected Options</span>
            )}
        </div>
      </div>
    </div>
  );
};