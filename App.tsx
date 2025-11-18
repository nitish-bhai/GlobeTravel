
import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import TripForm from './components/TripForm';
import { 
    generateCoreItinerary,
    generateAccommodationRecommendations,
    generateTransportationOptions,
    generateFoodRecommendations,
    generateWeatherForecast,
    generateImageForActivity,
    getTravelAdvisories,
    extractLocationsFromSchedule 
} from './services/geminiService';
import type { TripDetails, Itinerary, User, SavedTrip, UserPreferences, TravelAdvisory, LocationPoint, AccommodationRecommendations, Transportation, FoodRecommendations, WeatherForecast } from './types';
import ChatBot from './components/ChatBot';
import AuthPage from './components/AuthPage';
import UserProfilePage from './components/UserProfilePage';
import HeroSection from './components/HeroSection';
import { GlobeIcon } from './components/icons';
import ItineraryReport from './components/ItineraryReport';
import ShareModal from './components/ShareModal';
import { auth, onAuthStateChanged, logout, FirebaseUser } from './services/firebase';

type View = 'hero' | 'form' | 'results' | 'login' | 'profile';
type AuthView = 'login' | 'signup';

const loadingMessages = [
    "Analyzing your preferences...",
    "Discovering hidden gems...",
    "Calculating travel times...",
    "Building your personalized schedule...",
    "Crafting recommendations...",
    "Finalizing your adventure..."
];

const LoadingState = ({ message }: { message: string }) => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 pt-20 text-center p-4 transition-colors duration-300">
        <div className="relative flex items-center justify-center h-48 w-48">
            <div className="absolute h-full w-full border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
            <div className="absolute h-full w-full border-t-4 border-cyan-600 dark:border-cyan-400 rounded-full animate-spin"></div>
            <GlobeIcon className="h-24 w-24 text-cyan-600 dark:border-cyan-400 animate-pulse" />
        </div>
        <h2 className="mt-8 text-2xl font-bold text-gray-800 dark:text-gray-100">Crafting Your Journey...</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-300 text-lg font-semibold w-full max-w-md">{message}</p>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">This can take up to 10 seconds. Good things come to those who wait!</p>
    </div>
);


function App() {
  const [tripDetails, setTripDetails] = useState<TripDetails | null>(null);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('hero');
  const [viewHistory, setViewHistory] = useState<View[]>(['hero']);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState(loadingMessages[0]);
  const [currentTripId, setCurrentTripId] = useState<string | null>(null);
  const [authView, setAuthView] = useState<AuthView>('login');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({});
  const [travelAdvisories, setTravelAdvisories] = useState<TravelAdvisory[] | null>(null);
  const [mapLocations, setMapLocations] = useState<LocationPoint[] | null>(null);

  const generateAndAddImagesSequentially = useCallback(async (itineraryForImages: Itinerary, detailsForImages: TripDetails) => {
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    // Set loading state for all images initially
    setItinerary(currentItinerary => ({
        ...(currentItinerary || itineraryForImages),
        schedule: (currentItinerary?.schedule || itineraryForImages.schedule).map(day => ({...day, imageLoading: true}))
    }));

    // Generate images sequentially to avoid hitting API rate limits
    for (const dayToProcess of itineraryForImages.schedule) {
        try {
            const imageUrl = await generateImageForActivity(`A trip to ${detailsForImages.destination}: ${dayToProcess.title}`);
            
            // Use functional update to avoid stale state issues inside the loop
            setItinerary(currentItinerary => {
                if (!currentItinerary) return null;
                const newSchedule = [...currentItinerary.schedule];
                const dayIndexToUpdate = newSchedule.findIndex(d => d.day === dayToProcess.day);
                
                if (dayIndexToUpdate !== -1) {
                    newSchedule[dayIndexToUpdate] = {
                        ...newSchedule[dayIndexToUpdate],
                        imageUrl: imageUrl || undefined,
                        imageLoading: false,
                    };
                }
                return { ...currentItinerary, schedule: newSchedule };
            });
        } catch (error) {
            console.error(`Failed to generate image for Day ${dayToProcess.day}:`, error);
            // Stop loading for this specific image on error, but continue with others
            setItinerary(currentItinerary => {
                if (!currentItinerary) return null;
                const newSchedule = [...currentItinerary.schedule];
                const dayIndexToUpdate = newSchedule.findIndex(d => d.day === dayToProcess.day);
                if (dayIndexToUpdate !== -1) {
                    newSchedule[dayIndexToUpdate].imageLoading = false;
                }
                return { ...currentItinerary, schedule: newSchedule };
            });
        }
        // Add a delay to avoid hitting image generation rate limits
        await delay(1500);
    }
  }, []);

  // Effect to listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: FirebaseUser | null) => {
      if (user && user.email) {
        const appUser: User = { email: user.email };
        setCurrentUser(appUser);
        setIsAuthenticated(true);
        // Load preferences for logged in user
        const savedPrefs = localStorage.getItem(`userPrefs_${user.email}`);
        if (savedPrefs) {
            setUserPreferences(JSON.parse(savedPrefs));
        }
        // If user is logged in and on the login page, redirect them
        if (view === 'login') {
            navigateTo('hero');
        }
      } else {
        setCurrentUser(null);
        setIsAuthenticated(false);
        setUserPreferences({}); // Clear preferences on logout
      }
    });
    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [view]);


  useEffect(() => {
    // Helper function to load trip data and then fetch images
    const loadTripAndGenerateImages = (details: TripDetails, savedItinerary: Itinerary, tripId: string) => {
        setTripDetails(details);
        // Set text-only itinerary first for a fast paint
        setItinerary(savedItinerary); 
        setCurrentTripId(tripId);
        // Asynchronously generate and add images for the loaded trip
        generateAndAddImagesSequentially(savedItinerary, details);
    };

    // Check for shared trip link first
    const urlParams = new URLSearchParams(window.location.search);
    const tripId = urlParams.get('tripId');
    if (tripId) {
        try {
            const sharedTripJSON = localStorage.getItem(`trip_${tripId}`);
            if (sharedTripJSON) {
                const { details, itinerary: sharedItinerary } = JSON.parse(sharedTripJSON);
                loadTripAndGenerateImages(details, sharedItinerary, tripId);
                // Clean the URL to avoid reloading the same shared trip on refresh
                window.history.replaceState({}, document.title, window.location.pathname);
                navigateTo('results'); // Navigate to results view for shared trip
                return; // Stop further execution to avoid overriding with lastTrip
            }
        } catch (e) {
            console.error("Failed to load shared trip from local storage", e);
        }
    }

    // If no shared trip, check for last trip in local storage
    try {
        const lastTripDetailsJSON = localStorage.getItem('lastTripDetails');
        const lastItineraryJSON = localStorage.getItem('lastItinerary');
        if (lastTripDetailsJSON && lastItineraryJSON) {
            const details = JSON.parse(lastTripDetailsJSON);
            const savedItinerary = JSON.parse(lastItineraryJSON);
            // Generate a shareable ID for this session
            const newTripId = Date.now().toString(36) + Math.random().toString(36).substr(2);
            loadTripAndGenerateImages(details, savedItinerary, newTripId);
            navigateTo('results'); // Navigate to results for last loaded trip
        }
    } catch (e) {
        console.error("Failed to load trip from local storage", e);
        localStorage.removeItem('lastTripDetails');
        localStorage.removeItem('lastItinerary');
    }
  }, [generateAndAddImagesSequentially]);

  useEffect(() => {
    let interval: number;
    if (isLoading) {
      interval = window.setInterval(() => {
        setCurrentLoadingMessage(prev => {
          const currentIndex = loadingMessages.indexOf(prev);
          const nextIndex = (currentIndex + 1) % loadingMessages.length;
          return loadingMessages[nextIndex];
        });
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);
  
  // Persist any changes to the itinerary (e.g., reordering, priority) to localStorage
  useEffect(() => {
    if (itinerary && tripDetails) {
        const { 
            accommodationLoading, 
            transportationLoading, 
            foodLoading, 
            weatherLoading, 
            ...restOfItinerary 
        } = itinerary;

        const storableItinerary = {
            ...restOfItinerary,
            schedule: restOfItinerary.schedule.map(({ imageUrl, imageLoading, ...day }) => day),
        };

        try {
            localStorage.setItem('lastTripDetails', JSON.stringify(tripDetails));
            localStorage.setItem('lastItinerary', JSON.stringify(storableItinerary));
            if (currentTripId) {
                 localStorage.setItem(`trip_${currentTripId}`, JSON.stringify({ details: tripDetails, itinerary: storableItinerary }));
            }
        } catch (e) {
            console.error("Failed to save trip to localStorage: Quota may be exceeded.", e);
        }
    }
  }, [itinerary, tripDetails, currentTripId]);


  const navigateTo = (newView: View) => {
    if (viewHistory[viewHistory.length - 1] !== newView) {
      setViewHistory(prev => [...prev, newView]);
    }
    setView(newView);
  };

  const handleBack = () => {
    if (viewHistory.length <= 1) return;
    const newHistory = [...viewHistory];
    newHistory.pop();
    setViewHistory(newHistory);
    setView(newHistory[newHistory.length - 1]);
  };


  const handleFormSubmit = async (details: TripDetails) => {
    setIsLoading(true);
    setError(null);
    setTripDetails(details);
    setItinerary(null);
    setTravelAdvisories(null);
    setMapLocations(null);
    navigateTo('results');
    
    try {
      const coreItinerary = await generateCoreItinerary(details);
      
      const tripId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      setCurrentTripId(tripId);
      
      const initialItinerary: Itinerary = {
          ...coreItinerary,
          schedule: coreItinerary.schedule.map(day => ({ ...day, imageLoading: true })), // Set loading state for all images
          accommodationLoading: true,
          transportationLoading: true,
          foodLoading: true,
          weatherLoading: true,
      };
      setItinerary(initialItinerary);
      setIsLoading(false); // Hide main loading screen, reveal itinerary report with loaders

      // This async function will fetch all supplemental data and images sequentially to avoid rate-limiting.
      const fetchSupplementalDataAndImages = async () => {
          const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

          // 1. Fetch supplemental text-based data
          const supplementalFetches = [
              { key: 'accommodation', fetcher: () => generateAccommodationRecommendations(details) },
              { key: 'transportation', fetcher: () => generateTransportationOptions(details) },
              { key: 'food', fetcher: () => generateFoodRecommendations(details) },
              { key: 'weather', fetcher: () => generateWeatherForecast(details) },
              { key: 'advisories', fetcher: () => getTravelAdvisories(details.destination, details.startDate, details.endDate) },
              { key: 'locations', fetcher: () => extractLocationsFromSchedule(coreItinerary.schedule, details.destination) },
          ];

          for (const fetchInfo of supplementalFetches) {
              await delay(1200); // Add a 1.2-second delay BETWEEN each API call.
              try {
                  const result = await fetchInfo.fetcher();
                  if (fetchInfo.key === 'advisories') {
                      setTravelAdvisories(result as TravelAdvisory[] | null);
                  } else if (fetchInfo.key === 'locations') {
                      setMapLocations(result as LocationPoint[] | null);
                  } else {
                      setItinerary(current => {
                          if (!current) return null;
                          const updatedItinerary = { ...current };
                          switch (fetchInfo.key) {
                              case 'accommodation':
                                  updatedItinerary.accommodation_recommendations = result as AccommodationRecommendations || undefined;
                                  updatedItinerary.accommodationLoading = false;
                                  break;
                              case 'transportation':
                                  updatedItinerary.transportation_options = result as Transportation || undefined;
                                  updatedItinerary.transportationLoading = false;
                                  break;
                              case 'food':
                                  updatedItinerary.food_recommendations = result as FoodRecommendations || undefined;
                                  updatedItinerary.foodLoading = false;
                                  break;
                              case 'weather':
                                  updatedItinerary.weather_forecast = result as WeatherForecast || undefined;
                                  updatedItinerary.weatherLoading = false;
                                  break;
                          }
                          return updatedItinerary;
                      });
                  }
              } catch (e) {
                  console.error(`Failed to fetch ${fetchInfo.key}:`, e);
                  // Gracefully handle individual fetch failures by stopping their loading indicators
                  if (fetchInfo.key === 'advisories') {
                      setTravelAdvisories([]); // Stop loading, show error/empty state
                  } else if (fetchInfo.key === 'locations') {
                      setMapLocations([]); // Stop loading, show error/empty state
                  } else {
                      setItinerary(current => {
                          if (!current) return null;
                          const updatedItinerary = { ...current };
                          switch (fetchInfo.key) {
                              case 'accommodation': updatedItinerary.accommodationLoading = false; break;
                              case 'transportation': updatedItinerary.transportationLoading = false; break;
                              case 'food': updatedItinerary.foodLoading = false; break;
                              case 'weather': updatedItinerary.weatherLoading = false; break;
                          }
                          return updatedItinerary;
                      });
                  }
              }
          }

          // 2. After all text data is fetched, fetch images sequentially
          await generateAndAddImagesSequentially(initialItinerary, details);
      };

      fetchSupplementalDataAndImages();

    } catch(err) {
      setError(err instanceof Error ? err.message : "An error occurred while generating the itinerary. Please check your connection and try again.");
      navigateTo('form');
      setIsLoading(false);
    }
  };
  
  const handleLogout = async () => {
    try {
        await logout();
        // The onAuthStateChanged listener will handle state cleanup.
        setView('hero');
        setViewHistory(['hero']);
    } catch (error) {
        console.error("Logout Error:", error);
        alert("Failed to log out. Please try again.");
    }
  };

  const handleSaveTrip = () => {
    if (!currentUser || !tripDetails || !itinerary) {
      alert("You must be logged in to save a trip.");
      return;
    }
    const savedTrips: SavedTrip[] = JSON.parse(localStorage.getItem(`savedTrips_${currentUser.email}`) || '[]');
    const newTrip: SavedTrip = { details: tripDetails, itinerary };
    if (!savedTrips.some(trip => JSON.stringify(trip.itinerary.trip_title) === JSON.stringify(newTrip.itinerary.trip_title))) {
      savedTrips.push(newTrip);
      localStorage.setItem(`savedTrips_${currentUser.email}`, JSON.stringify(savedTrips));
      alert("Trip saved successfully!");
    } else {
      alert("This trip is already saved.");
    }
  };

  const handleLoadTrip = (savedTrip: SavedTrip) => {
    setTripDetails(savedTrip.details);
    setItinerary(savedTrip.itinerary);
    // Generate a new shareable ID for this session
    const tripId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    setCurrentTripId(tripId);
    navigateTo('results');
  };
  
  const handleEditTrip = () => navigateTo('form');

  const handleEditSavedTrip = (savedTrip: SavedTrip) => {
    setTripDetails(savedTrip.details);
    setItinerary(null); // Clear old itinerary before showing form
    setCurrentTripId(null);
    navigateTo('form');
  };

  const handlePlanNewTrip = () => {
    const initialDetails: Partial<TripDetails> = {
      destination: '',
      departureCity: userPreferences.defaultDepartureCity || '',
      startDate: '',
      endDate: '',
      travellers: 1,
      travelStyle: userPreferences.defaultTravelStyle || 'Standard',
      interests: userPreferences.defaultInterests || [],
    };
    setTripDetails(initialDetails as TripDetails);
    setItinerary(null);
    setCurrentTripId(null);
    localStorage.removeItem('lastTripDetails');
    localStorage.removeItem('lastItinerary');
    navigateTo('form');
  }

  const handleShare = () => {
    if (!tripDetails || !itinerary) return;
    setIsShareModalOpen(true);
  };
  
  const handleUpdatePreferences = (prefs: UserPreferences) => {
    if (currentUser) {
        setUserPreferences(prefs);
        localStorage.setItem(`userPrefs_${currentUser.email}`, JSON.stringify(prefs));
    }
  };

  const handleLoginClick = () => {
    setAuthView('login');
    navigateTo('login');
  };

  const handleSignUpClick = () => {
    setAuthView('signup');
    navigateTo('login');
  };

  const renderContent = () => {
    const canGoBack = viewHistory.length > 1;

    switch (view) {
      case 'hero':
        return <HeroSection onPlanTripClick={() => navigateTo('form')} />;
      case 'form':
        return (
            <div>
                {error && <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg dark:bg-red-900/50 dark:border-red-700 dark:text-red-300" role="alert">{error}</div>}
                <TripForm 
                    onSubmit={handleFormSubmit} 
                    isLoading={isLoading} 
                    initialDetails={tripDetails}
                    onBack={handleBack}
                    canGoBack={canGoBack}
                />
            </div>
        );
      case 'results':
        if (isLoading) {
          return <LoadingState message={currentLoadingMessage} />;
        }
       
        if (itinerary && tripDetails) {
          return (
            <div className="bg-gray-50 dark:bg-gray-950 min-h-screen transition-colors duration-300 pt-20">
               <main className="container mx-auto p-4 md:p-6">
                 <ItineraryReport 
                    itinerary={itinerary} 
                    details={tripDetails} 
                    setItinerary={setItinerary}
                    isAuthenticated={isAuthenticated}
                    onSaveTrip={handleSaveTrip}
                    onShare={handleShare}
                    onEditTrip={handleEditTrip}
                    onPlanNewTrip={handlePlanNewTrip}
                    travelAdvisories={travelAdvisories}
                    mapLocations={mapLocations}
                  />
               </main>
              {isShareModalOpen && tripDetails && itinerary && (
                <ShareModal 
                    isOpen={isShareModalOpen}
                    onClose={() => setIsShareModalOpen(false)}
                    itinerary={itinerary}
                    // FIX: Pass 'tripDetails' from state to the 'details' prop. The 'details' variable was not defined in this scope.
                    details={tripDetails}
                />
              )}
            </div>
          );
        }
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 pt-20">
             <div className="text-center">
                <p className="text-lg text-gray-600 dark:text-gray-300">Something went wrong.</p>
                <button onClick={() => navigateTo('form')} className="mt-4 bg-cyan-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-cyan-700 transition duration-300">
                    Start Over
                </button>
             </div>
          </div>
        );
      case 'login':
        return <AuthPage onBack={handleBack} canGoBack={canGoBack} initialView={authView} />;
      case 'profile':
        if (currentUser) {
          return <UserProfilePage 
            user={currentUser} 
            onLoadTrip={handleLoadTrip} 
            onPlanNewTrip={handlePlanNewTrip} 
            onBack={handleBack} 
            canGoBack={canGoBack} 
            onEditTrip={handleEditSavedTrip}
            preferences={userPreferences}
            onPreferencesChange={handleUpdatePreferences}
          />;
        }
        // Fallback if no user, though this state should not be reachable if logic is correct
        navigateTo('login');
        return null;
      default:
        return null;
    }
  };

  return (
    <div className="antialiased text-gray-900 dark:text-gray-100">
      <Navbar 
        isAuthenticated={isAuthenticated}
        userEmail={currentUser?.email || null}
        onLoginClick={handleLoginClick}
        onSignUpClick={handleSignUpClick}
        onLogout={handleLogout}
        onProfileClick={() => navigateTo('profile')}
      />
      {renderContent()}
      <ChatBot itinerary={itinerary} details={tripDetails} />
    </div>
  );
}

export default App;
