import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Itinerary, TripDetails, Activity, Hotel, FlightInfo, TravelAdvisory, LocationPoint } from '../types';
import { 
    RouteIcon, BedIcon, CarIcon, UtensilsIcon, CloudSunIcon,
    FoodIcon, SightseeingIcon, ActivityIcon, TravelIcon, AccommodationIcon, InfoIcon, 
    CheckCircleIcon, FilterIcon, GripVerticalIcon, SunIcon, TrainIcon, CloudIcon, CloudRainIcon,
    CloudLightningIcon, CloudSnowIcon, ScooterIcon,
    PlaneIcon, SparklesIcon, MapIcon, XCircleIcon, BriefcaseIcon, PieChartIcon, ShareIcon, DownloadIcon, GlobeIcon, SpinnerIcon
} from './icons';
import FlightBookingModal from './FlightBookingModal';
import HotelBookingModal from './HotelBookingModal';
import LocalTransportBookingModal from './LocalTransportBookingModal';
import BookingDetailsModal from './BookingDetailsModal';
import { checkFlightBookingStatus, checkHotelBookingStatus, checkLocalTransportBookingStatus } from '../services/bookingService';
import FlightSearchModal from './FlightSearchModal';
import MapView from './MapView';
import TravelAlerts from './TravelAlerts';
import MapWidget from './MapWidget';

interface ItineraryReportProps {
  itinerary: Itinerary;
  details: TripDetails;
  setItinerary: React.Dispatch<React.SetStateAction<Itinerary | null>>;
  isAuthenticated: boolean;
  onSaveTrip: () => void;
  onShare: () => void;
  onEditTrip: () => void;
  onPlanNewTrip: () => void;
  travelAdvisories: TravelAdvisory[] | null;
  mapLocations: LocationPoint[] | null;
}

type Tab = 'Summary' | 'Budget' | 'Itinerary' | 'Map' | 'Stay' | 'Transport' | 'Food' | 'Weather';
type Priority = 'High' | 'Medium' | 'Low';
const PRIORITIES: Priority[] = ['High', 'Medium', 'Low'];
const ACTIVITY_TYPES: Activity['type'][] = ['Food', 'Sightseeing', 'Activity', 'Travel', 'Accommodation'];

/**
 * An image component that gracefully falls back to a placeholder if the image fails to load.
 */
const ImageWithFallback: React.FC<{src: string; alt: string; fallback: React.ReactNode}> = ({ src, alt, fallback }) => {
    const [error, setError] = useState(false);

    useEffect(() => {
        setError(false);
    }, [src]);

    if (error) {
        return <>{fallback}</>;
    }

    return <img src={src} alt={alt} className="w-full h-full object-cover" onError={() => setError(true)} />;
};

/**
 * Generates a consistent dummy image URL from picsum.photos based on keywords.
 */
const getDummyImageUrl = (destination: string, keywords: string, day: number) => {
    // Creates a consistent seed from the inputs to get a consistent image from picsum.photos
    const seed = `${destination.slice(0, 5)}${keywords.slice(0, 5)}${day}`.replace(/[^a-zA-Z0-9]/g, '');
    return `https://picsum.photos/seed/${seed}/800/600`;
};


const SectionLoader: React.FC<{ text: string }> = ({ text }) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="relative flex items-center justify-center h-16 w-16">
            <div className="absolute h-full w-full border-2 border-gray-200 dark:border-gray-600 rounded-full"></div>
            <div className="absolute h-full w-full border-t-2 border-cyan-500 rounded-full animate-spin"></div>
        </div>
        <p className="mt-4 font-semibold text-gray-700 dark:text-gray-300">{text}</p>
    </div>
);

const SectionError: React.FC<{ text: string }> = ({ text }) => (
     <div className="flex flex-col items-center justify-center py-12 text-center bg-red-50 dark:bg-red-900/30 rounded-lg">
        <XCircleIcon className="h-12 w-12 text-red-500 dark:text-red-400" />
        <p className="mt-4 font-semibold text-red-700 dark:text-red-300">{text}</p>
        <p className="text-sm text-red-600 dark:text-red-400">Please try regenerating the trip.</p>
    </div>
);


const ItineraryReport: React.FC<ItineraryReportProps> = ({ itinerary, details, setItinerary, isAuthenticated, onSaveTrip, onShare, onEditTrip, onPlanNewTrip, travelAdvisories, mapLocations }) => {
  const [activeTab, setActiveTab] = useState<Tab>('Summary');
  const [bookingModal, setBookingModal] = useState<{type: 'flight' | 'hotel' | 'ride', activity: Activity} | null>(null);
  const [flightSearchModalState, setFlightSearchModalState] = useState<{ activity: Activity; dayIndex: number; activityIndex: number } | null>(null);
  const [bookingDetailsModalActivity, setBookingDetailsModalActivity] = useState<Activity | null>(null);
  const [bookingUpdateKey, setBookingUpdateKey] = useState(0);

  const [activeFilters, setActiveFilters] = useState<{ types: string[], priorities: string[] }>({ types: [], priorities: [] });
  const dragActivity = useRef<{ dayIndex: number, activityIndex: number } | null>(null);
  const dragOverActivity = useRef<{ dayIndex: number, activityIndex: number } | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<{ dayIndex: number; activityIndex: number } | null>(null);
  
  // Ensure all activities have a default priority
  useEffect(() => {
    let needsUpdate = false;
    const scheduleWithPriorities = itinerary.schedule.map(day => {
        const newActivities = day.activities.map(activity => {
            if (!activity.priority) {
                needsUpdate = true;
                return { ...activity, priority: 'Medium' as Priority };
            }
            return activity;
        });
        return { ...day, activities: newActivities };
    });

    if (needsUpdate) {
        setItinerary({ ...itinerary, schedule: scheduleWithPriorities });
    }
  }, [itinerary, setItinerary]);


  const tabs: { name: Tab; icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
    { name: 'Summary', icon: BriefcaseIcon },
    { name: 'Itinerary', icon: RouteIcon },
    { name: 'Map', icon: MapIcon },
    { name: 'Stay', icon: BedIcon },
    { name: 'Transport', icon: CarIcon },
    { name: 'Food', icon: UtensilsIcon },
    { name: 'Weather', icon: CloudSunIcon },
    { name: 'Budget', icon: PieChartIcon },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  const handleBookingComplete = () => {
    setBookingModal(null);
    setBookingDetailsModalActivity(null);
    setBookingUpdateKey(k => k + 1); // Trigger re-render to update booking status
  };

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'Food': return <FoodIcon className="h-6 w-6 text-orange-500" />;
      case 'Sightseeing': return <SightseeingIcon className="h-6 w-6 text-blue-500" />;
      case 'Activity': return <ActivityIcon className="h-6 w-6 text-green-500" />;
      case 'Travel': return <TravelIcon className="h-6 w-6 text-purple-500" />;
      case 'Accommodation': return <AccommodationIcon className="h-6 w-6 text-pink-500" />;
      default: return <InfoIcon className="h-6 w-6 text-gray-500" />;
    }
  };

  const handlePriorityChange = (dayIndex: number, activityIndex: number, priority: Priority) => {
    const newItinerary = JSON.parse(JSON.stringify(itinerary));
    newItinerary.schedule[dayIndex].activities[activityIndex].priority = priority;
    setItinerary(newItinerary);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, params: { dayIndex: number, activityIndex: number }) => {
    dragActivity.current = params;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, params: { dayIndex: number, activityIndex: number }) => {
    dragOverActivity.current = params;
     if (dragActivity.current?.dayIndex === params.dayIndex) {
      setDragOverInfo(params);
    }
  };

  const handleDragEnd = () => {
    if (!dragActivity.current || !dragOverActivity.current) return;

    const { dayIndex: sourceDayIndex, activityIndex: sourceActivityIndex } = dragActivity.current;
    const { dayIndex: targetDayIndex, activityIndex: targetActivityIndex } = dragOverActivity.current;

    // Prevent dragging between different days
    if (sourceDayIndex !== targetDayIndex) {
        dragActivity.current = null;
        dragOverActivity.current = null;
        setDragOverInfo(null);
        return;
    }
    
    const newItinerary = JSON.parse(JSON.stringify(itinerary));
    const dayActivities = newItinerary.schedule[sourceDayIndex].activities;
    const [draggedItem] = dayActivities.splice(sourceActivityIndex, 1);
    dayActivities.splice(targetActivityIndex, 0, draggedItem);
    
    setItinerary(newItinerary);

    dragActivity.current = null;
    dragOverActivity.current = null;
    setDragOverInfo(null);
  };

    const handleFlightSelect = (selectedFlight: FlightInfo) => {
        if (!flightSearchModalState) return;

        const { dayIndex, activityIndex } = flightSearchModalState;

        const newItinerary = JSON.parse(JSON.stringify(itinerary));

        const activityToUpdate = newItinerary.schedule[dayIndex].activities[activityIndex];
        activityToUpdate.description = `${activityToUpdate.description.split(' - Selected:')[0]} - Selected: ${selectedFlight.airline} (${selectedFlight.departureTime} - ${selectedFlight.arrivalTime})`;
        activityToUpdate.estimated_cost = selectedFlight.price * details.travellers;

        setItinerary(newItinerary);
        setFlightSearchModalState(null); // Close modal after selection
    };

  const priorityStyles: { [key in Priority]: string } = {
    High: 'border-l-4 border-red-500',
    Medium: 'border-l-4 border-amber-500',
    Low: 'border-l-4 border-sky-500',
  };
  
  const priorityDropdownBg: { [key in Priority]: string } = {
    High: 'bg-red-500 hover:bg-red-600',
    Medium: 'bg-amber-500 hover:bg-amber-600',
    Low: 'bg-sky-500 hover:bg-sky-600',
  };

  const handleFilterToggle = (filterType: 'types' | 'priorities', value: string) => {
    setActiveFilters(prev => {
        const currentFilters = prev[filterType];
        const newFilters = currentFilters.includes(value)
            ? currentFilters.filter(item => item !== value)
            : [...currentFilters, value];
        return { ...prev, [filterType]: newFilters };
    });
  };

  const filteredSchedule = useMemo(() => {
    if (activeFilters.types.length === 0 && activeFilters.priorities.length === 0) {
        return itinerary.schedule;
    }
    return itinerary.schedule.map(day => ({
        ...day,
        activities: day.activities.filter(activity => {
            const typeMatch = activeFilters.types.length === 0 || activeFilters.types.includes(activity.type);
            const priorityMatch = activeFilters.priorities.length === 0 || activeFilters.priorities.includes(activity.priority || 'Medium');
            return typeMatch && priorityMatch;
        })
    })).filter(day => day.activities.length > 0);
  }, [itinerary.schedule, activeFilters]);

  const handleExportPDF = () => {
    const jspdf = (window as any).jspdf;

    // More robust check for both jspdf and the autotable plugin
    if (typeof jspdf === 'undefined' || typeof jspdf.jsPDF.API.autoTable === 'undefined') {
        alert("The PDF export library is not available. Please check your internet connection and try again.");
        console.error("jsPDF or jsPDF-autotable not loaded.");
        return;
    }

    const { jsPDF } = jspdf;
    const doc = new jsPDF();

    const addSectionTitle = (title: string, y: number) => {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(title, 14, y);
        return y + 8;
    };

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(itinerary.trip_title, 14, 20);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`A personalized itinerary for ${details.travellers} traveler(s) to ${details.destination}`, 14, 28);
    doc.text(`From ${details.startDate} to ${details.endDate}`, 14, 34);

    let yPos = 45;

    yPos = addSectionTitle("Trip Summary", yPos);
    doc.setFontSize(11);
    const summaryLines = doc.splitTextToSize(itinerary.trip_summary.description, 180);
    doc.text(summaryLines, 14, yPos);
    yPos += summaryLines.length * 5 + 5;
    
    doc.setFont('helvetica', 'bold');
    doc.text("Highlights:", 14, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    itinerary.trip_summary.highlights.forEach(highlight => {
        doc.text(`• ${highlight}`, 18, yPos);
        yPos += 6;
    });
    yPos += 5;

    yPos = addSectionTitle("Budget Breakdown", yPos);
    const budgetData = [
        ["Category", "Estimated Cost"],
        ["Stay", formatCurrency(itinerary.detailed_cost_breakdown.stay)],
        ["Travel", formatCurrency(itinerary.detailed_cost_breakdown.travel)],
        ["Food", formatCurrency(itinerary.detailed_cost_breakdown.food)],
        ["Activities", formatCurrency(itinerary.detailed_cost_breakdown.activities)],
        ["Miscellaneous", formatCurrency(itinerary.detailed_cost_breakdown.miscellaneous)],
        [{ content: "Total Estimated Cost", styles: { fontStyle: 'bold' } }, { content: formatCurrency(itinerary.total_estimated_cost), styles: { fontStyle: 'bold' } }],
    ];
    doc.autoTable({
        startY: yPos,
        head: budgetData.slice(0, 1),
        body: budgetData.slice(1),
        theme: 'grid',
        headStyles: { fillColor: [0, 172, 193] },
    });
    yPos = doc.autoTable.previous.finalY + 10;

    itinerary.schedule.forEach(day => {
        if (yPos > 260) {
            doc.addPage();
            yPos = 20;
        }
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`Day ${day.day}: ${day.title}`, 14, yPos);
        yPos += 8;

        const scheduleData = day.activities.map(activity => [
            activity.time,
            activity.description,
            formatCurrency(activity.estimated_cost)
        ]);

        doc.autoTable({
            startY: yPos,
            head: [['Time', 'Activity / Description', 'Est. Cost']],
            body: scheduleData,
            theme: 'striped',
            headStyles: { fillColor: [74, 85, 104] },
            columnStyles: {
                0: { cellWidth: 20 },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 30, halign: 'right' }
            }
        });
        yPos = doc.autoTable.previous.finalY + 10;
    });

    doc.save(`GlobeTrekker_Trip_to_${details.destination}.pdf`);
  };

  const imageFallback = (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 text-center p-4">
      <GlobeIcon className="h-12 w-12 text-gray-400 dark:text-gray-500" />
      <p className="mt-2 text-sm font-semibold text-gray-600 dark:text-gray-400">Image not available</p>
      <p className="text-xs text-gray-500 dark:text-gray-500">A relevant placeholder is shown instead.</p>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'Summary':
        return (
            <div className="space-y-6">
                <div>
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Trip Overview</h3>
                    <p className="text-gray-600 dark:text-gray-300">{itinerary.trip_summary.description}</p>
                </div>
                <div>
                    <h4 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-3">Key Highlights</h4>
                    <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
                        {itinerary.trip_summary.highlights.map((highlight, i) => <li key={i}>{highlight}</li>)}
                    </ul>
                </div>
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                    <MapWidget destination={details.destination} />
                </div>
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                   {travelAdvisories === null ? (
                        <SectionLoader text="Checking for travel advisories..." />
                    ) : (
                        <TravelAlerts tripDetails={details} advisories={travelAdvisories} />
                    )}
                </div>
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Not what you wanted?</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">You can easily modify your trip details or start a fresh plan.</p>
                    <div className="mt-4 flex justify-center gap-3">
                        <button onClick={onEditTrip} className="bg-cyan-100 hover:bg-cyan-200 text-cyan-800 dark:bg-cyan-900/50 dark:hover:bg-cyan-900 dark:text-cyan-300 font-bold py-2 px-4 rounded-lg transition-all transform active:scale-95 duration-300">
                        Edit This Trip
                        </button>
                        <button onClick={onPlanNewTrip} className="bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white font-bold py-2 px-4 rounded-lg transition-all transform active:scale-95 duration-300">
                        Plan a New Trip
                        </button>
                    </div>
                </div>
            </div>
        );
      case 'Budget':
        const breakdown = itinerary.detailed_cost_breakdown;
        const total = itinerary.total_estimated_cost;
        const budgetData = total > 0 ? [
            { label: 'Stay', value: breakdown.stay, color: 'bg-blue-500' },
            { label: 'Travel', value: breakdown.travel, color: 'bg-purple-500' },
            { label: 'Food', value: breakdown.food, color: 'bg-orange-500' },
            { label: 'Activities', value: breakdown.activities, color: 'bg-green-500' },
            { label: 'Misc.', value: breakdown.miscellaneous, color: 'bg-gray-500' },
        ] : [];
        return (
            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-6 p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                    <p className="font-semibold text-gray-600 dark:text-gray-300">Total Estimated Cost</p>
                    <p className="text-4xl font-bold text-cyan-800 dark:text-cyan-300">{formatCurrency(total)}</p>
                </div>
                {details.budget && (
                    <div className={`p-3 mb-6 rounded-lg text-center ${total > details.budget ? 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200' : 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'}`}>
                        Your target budget is {formatCurrency(details.budget)}. You are {total > details.budget ? `${formatCurrency(total - details.budget)} over` : `${formatCurrency(details.budget - total)} under`} budget.
                    </div>
                )}
                <div className="space-y-4">
                    {total > 0 && (
                        <div className="w-full flex h-6 rounded-full overflow-hidden shadow-inner bg-gray-200 dark:bg-gray-700">
                            {budgetData.map(item => (
                                <div key={item.label} className={item.color} style={{ width: `${(item.value / total) * 100}%` }} title={`${item.label}: ${formatCurrency(item.value)}`}></div>
                            ))}
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                        {budgetData.map(item => (
                            <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center">
                                    <span className={`h-3 w-3 rounded-full mr-3 ${item.color}`}></span>
                                    <span className="text-gray-600 dark:text-gray-300">{item.label} ({(item.value / total * 100).toFixed(0)}%)</span>
                                </div>
                                <span className="font-semibold text-gray-800 dark:text-gray-100">{formatCurrency(item.value)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
      case 'Itinerary':
        return (
          <div className="space-y-8" key={bookingUpdateKey}>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                         <FilterIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                         <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Filter Activities</h4>
                    </div>
                    {(activeFilters.types.length > 0 || activeFilters.priorities.length > 0) &&
                        <button onClick={() => setActiveFilters({ types: [], priorities: [] })} className="text-sm text-cyan-600 dark:text-cyan-400 hover:underline">Clear Filters</button>
                    }
                </div>
                <div className="space-y-3">
                    <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">By Type</p>
                        <div className="flex flex-wrap gap-2">
                            {ACTIVITY_TYPES.map(type => (
                                <button key={type} onClick={() => handleFilterToggle('types', type)} className={`px-3 py-1 rounded-full font-semibold text-xs transition-all transform active:scale-95 ${activeFilters.types.includes(type) ? 'bg-cyan-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500'}`}>{type}</button>
                            ))}
                        </div>
                    </div>
                     <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">By Priority</p>
                        <div className="flex flex-wrap gap-2">
                           {PRIORITIES.map(priority => (
                                <button key={priority} onClick={() => handleFilterToggle('priorities', priority)} className={`px-3 py-1 rounded-full font-semibold text-xs transition-all transform active:scale-95 ${activeFilters.priorities.includes(priority) ? 'bg-cyan-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500'}`}>{priority}</button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {filteredSchedule.map((dayPlan) => {
                const dayIndex = itinerary.schedule.findIndex(d => d.day === dayPlan.day);
                return (
                  <div key={dayPlan.day}>
                     <div className="relative rounded-xl overflow-hidden mb-4 shadow-lg h-48 md:h-64 bg-gray-200 dark:bg-gray-700">
                        {dayPlan.imageLoading ? (
                             <div className="w-full h-full bg-gray-300 dark:bg-gray-600 animate-pulse flex items-center justify-center">
                                <SparklesIcon className="h-12 w-12 text-gray-400 dark:text-gray-500" />
                            </div>
                        ) : (
                            <ImageWithFallback 
                                src={dayPlan.imageUrl || getDummyImageUrl(details.destination, dayPlan.title, dayPlan.day)}
                                alt={dayPlan.title} 
                                fallback={imageFallback}
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
                        <div className="absolute bottom-0 left-0 p-4 md:p-6 text-white">
                          <p className="font-semibold text-lg">Day {dayPlan.day}</p>
                          <h3 className="text-2xl md:text-3xl font-bold" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{dayPlan.title}</h3>
                        </div>
                      </div>

                    <div className="space-y-1">
                      {dayPlan.activities.map((activity, activityIndex) => {
                        const isFlight = activity.type === 'Travel' && activity.description.toLowerCase().includes('flight');
                        const isFlightSelected = isFlight && activity.description.includes('Selected:');
                        const isLocalRide = activity.type === 'Travel' && !isFlight;
                        const isAccommodation = activity.type === 'Accommodation';
                        
                        const isFlightBooked = isFlight && checkFlightBookingStatus(activity);
                        const isRideBooked = isLocalRide && checkLocalTransportBookingStatus(activity);
                        const isHotelBooked = isAccommodation && checkHotelBookingStatus(activity);
                        const isBooked = isFlightBooked || isRideBooked || isHotelBooked;
                        
                        const originalActivityIndex = itinerary.schedule[dayIndex].activities.findIndex(a => a.description === activity.description && a.time === activity.time);

                        const handleBookButtonClick = () => {
                          if (isBooked) {
                            setBookingDetailsModalActivity(activity);
                          } else if (isFlight) {
                             if(isFlightSelected) {
                                setBookingModal({ type: 'flight', activity });
                             } else {
                                setFlightSearchModalState({ activity, dayIndex, activityIndex: originalActivityIndex });
                             }
                          } else if (isLocalRide) {
                            setBookingModal({ type: 'ride', activity });
                          } else if (isAccommodation) {
                            setBookingModal({ type: 'hotel', activity });
                          }
                        };


                        return (
                            <div 
                                key={`${dayPlan.day}-${activity.time}-${activity.description}`}
                                draggable
                                onDragStart={(e) => handleDragStart(e, { dayIndex, activityIndex: originalActivityIndex })}
                                onDragEnter={(e) => handleDragEnter(e, { dayIndex, activityIndex: originalActivityIndex })}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => e.preventDefault()}
                                className={`relative flex items-start gap-3 p-3 rounded-lg transition-shadow group bg-white dark:bg-gray-800 hover:shadow-md ${priorityStyles[activity.priority || 'Medium']} cursor-grab active:cursor-grabbing`}
                            >
                                {dragOverInfo?.dayIndex === dayIndex && dragOverInfo?.activityIndex === originalActivityIndex && (
                                    <div className="absolute -top-1 left-4 right-4 h-1.5 bg-cyan-400 rounded-full z-10" />
                                )}
                                <div className="text-gray-400 pt-1">
                                    <GripVerticalIcon className="h-5 w-5" />
                                </div>
                                <div className="flex-shrink-0 pt-0.5">{getActivityIcon(activity.type)}</div>
                                <div className="flex-grow">
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-gray-700 dark:text-gray-200">{activity.time}</p>
                                        {isBooked && (
                                            <span className="flex items-center gap-1 text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 px-2 py-0.5 rounded-full">
                                                <CheckCircleIcon className="h-3 w-3" /> Booked
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-gray-800 dark:text-gray-100">{activity.description}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Est. Cost: {formatCurrency(activity.estimated_cost)}</p>
                                </div>
                                 <div className="flex items-center gap-2 flex-shrink-0">
                                    <div className="relative">
                                        <select 
                                            value={activity.priority}
                                            onChange={(e) => handlePriorityChange(dayIndex, originalActivityIndex, e.target.value as Priority)}
                                            className={`-webkit-appearance-none -moz-appearance-none appearance-none text-white font-semibold text-xs py-1 pl-2 pr-6 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${priorityDropdownBg[activity.priority || 'Medium']}`}
                                            aria-label="Set priority"
                                        >
                                            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                        <svg className="w-4 h-4 text-white absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                    {(isFlight || isLocalRide || isAccommodation) && (
                                        <button 
                                            onClick={handleBookButtonClick}
                                            className={`text-sm font-semibold py-1.5 px-3 rounded-md transition-all transform active:scale-95 flex items-center gap-1 whitespace-nowrap
                                            ${isBooked 
                                                ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900'
                                                : 'bg-cyan-100 text-cyan-800 hover:bg-cyan-200 dark:bg-cyan-900/50 dark:text-cyan-300 dark:hover:bg-cyan-900'
                                            }`}
                                        >
                                            {isBooked ? <> <CheckCircleIcon className="h-4 w-4" /> View </> : (isFlight ? (isFlightSelected ? 'Book Now' : 'Search Flights') : 'Book')}
                                        </button>
                                    )}
                                 </div>
                            </div>
                        );
                      })}
                    </div>
                    <div className="mt-4">
                        <div className="bg-sky-50 dark:bg-sky-900/50 p-3 rounded-lg flex items-start gap-3">
                            <InfoIcon className="h-5 w-5 text-sky-600 dark:text-sky-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-sky-800 dark:text-sky-300"><span className="font-semibold">AI Tip:</span> {dayPlan.ai_tip}</p>
                        </div>
                    </div>
                  </div>
                )
            })}
             {filteredSchedule.length === 0 && (
                <div className="text-center py-10">
                    <p className="text-gray-500 dark:text-gray-400">No activities match your current filters.</p>
                </div>
            )}
          </div>
        );
       case 'Map':
        if (mapLocations === null) {
            return (
                <div className="flex flex-col items-center justify-center h-96 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <SpinnerIcon className="h-12 w-12 text-cyan-600 animate-spin" />
                    <p className="mt-4 text-lg font-semibold text-gray-700 dark:text-gray-300">Plotting your adventure on the map...</p>
                </div>
            )
        }
        return <MapView schedule={itinerary.schedule} details={details} locations={mapLocations} />;
      case 'Stay':
        if (itinerary.accommodationLoading) {
            return <SectionLoader text="Finding the best hotels for your stay..." />;
        }
        if (!itinerary.accommodation_recommendations) {
            return <SectionError text="Could not load accommodation suggestions." />;
        }
        const renderHotel = (hotel: Hotel) => {
            const hotelActivity: Activity = {
                time: 'Check-in',
                description: `Stay at ${hotel.name}`,
                type: 'Accommodation',
                estimated_cost: hotel.estimated_nightly_cost * (details.duration || 1),
            };
            const isBooked = checkHotelBookingStatus(hotelActivity);
            return (
                <div key={hotel.name} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start">
                           <h5 className="font-bold text-gray-800 dark:text-gray-100 flex-grow pr-2">{hotel.name}</h5>
                           <div className="flex flex-col items-end flex-shrink-0">
                                <span className="text-sm font-bold bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full">{hotel.rating} ★</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{hotel.star_rating}-Star</span>
                           </div>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{hotel.address}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-2"><span className="font-semibold">Amenities:</span> {hotel.amenities.join(', ')}</p>
                        <p className="font-semibold text-gray-800 dark:text-gray-200 mt-2">{formatCurrency(hotel.estimated_nightly_cost)} / night</p>
                    </div>
                     <button 
                        onClick={() => isBooked ? setBookingDetailsModalActivity(hotelActivity) : setBookingModal({ type: 'hotel', activity: hotelActivity })}
                        className="text-sm font-semibold py-2 px-3 mt-3 rounded-md transition-all transform active:scale-95 flex items-center justify-center gap-1.5
                            ${isBooked 
                                ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900'
                                : 'bg-cyan-100 text-cyan-800 hover:bg-cyan-200 dark:bg-cyan-900/50 dark:text-cyan-300 dark:hover:bg-cyan-900'
                            }"
                    >
                        {isBooked ? <> <CheckCircleIcon className="h-4 w-4" /> View Booking </> : 'Book This Hotel'}
                    </button>
                </div>
            );
        };
        return (
            <div className="space-y-6" key={bookingUpdateKey}>
                <div>
                    <h4 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-3">Budget Options</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {itinerary.accommodation_recommendations.budget.map(renderHotel)}
                    </div>
                </div>
                 <div>
                    <h4 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-3">Standard Options</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {itinerary.accommodation_recommendations.standard.map(renderHotel)}
                    </div>
                </div>
                 <div>
                    <h4 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-3">Luxury Options</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {itinerary.accommodation_recommendations.luxury.map(renderHotel)}
                    </div>
                </div>
            </div>
        );
      case 'Transport':
        if (itinerary.transportationLoading) {
            return <SectionLoader text="Mapping out your travel options..." />;
        }
        if (!itinerary.transportation_options) {
            return <SectionError text="Could not load transportation suggestions." />;
        }
        const getTransportIcon = (mode: string) => {
            const m = mode.toLowerCase();
            if (m.includes('flight')) return <PlaneIcon className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />;
            if (m.includes('train')) return <TrainIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />;
            if (m.includes('bus')) return <CarIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />;
            if (m.includes('scooter') || m.includes('bike')) return <ScooterIcon className="h-6 w-6 text-rose-600 dark:text-rose-400" />;
            if (m.includes('ride-hail') || m.includes('taxi') || m.includes('car')) return <CarIcon className="h-6 w-6 text-sky-600 dark:text-sky-400" />;
            return <TravelIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />;
        };
        return (
            <div className="space-y-6">
                <div>
                    <h4 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-3">Getting to {details.destination}</h4>
                    <div className="space-y-3">
                    {itinerary.transportation_options.long_distance_options.map((opt, i) => (
                        <div key={i} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg flex items-center gap-4">
                            <div className="flex-shrink-0">{getTransportIcon(opt.mode)}</div>
                            <div className="flex-grow">
                                <p className="font-bold text-gray-800 dark:text-gray-100">{opt.mode}: {opt.details}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Duration: {opt.duration}</p>
                                {opt.provider_examples && opt.provider_examples.length > 0 &&
                                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">Providers: {opt.provider_examples.join(', ')}</p>
                                }
                            </div>
                            <p className="font-semibold text-lg text-gray-800 dark:text-gray-200">{formatCurrency(opt.estimated_cost)}</p>
                        </div>
                    ))}
                    </div>
                </div>
                 <div>
                    <h4 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-3">Local Transport</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {itinerary.transportation_options.local_suggestions.map((sugg, i) => (
                            <div key={i} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg flex items-start gap-3">
                                <div className="flex-shrink-0 mt-1">{getTransportIcon(sugg.mode)}</div>
                                <div>
                                    <p className="font-bold text-gray-800 dark:text-gray-100">{sugg.mode}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-300">{sugg.suggestion}</p>
                                    {sugg.estimated_cost_range &&
                                         <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1 bg-gray-200 dark:bg-gray-600 inline-block px-2 py-0.5 rounded">~{sugg.estimated_cost_range}</p>
                                    }
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
        case 'Food':
        if (itinerary.foodLoading) {
            return <SectionLoader text="Finding the tastiest local spots..." />;
        }
        if (!itinerary.food_recommendations) {
            return <SectionError text="Could not load food recommendations." />;
        }
        return (
            <div className="space-y-6">
                <div>
                    <h4 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-3">Restaurant Recommendations</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {itinerary.food_recommendations.restaurants.map((r, i) => (
                            <div key={i} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                <div className="flex justify-between items-start">
                                    <h5 className="font-bold text-gray-800 dark:text-gray-100">{r.name}</h5>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="text-sm font-bold text-gray-600 dark:text-gray-300">{r.price_range}</span>
                                        <span className="text-sm font-bold bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full">{r.rating} ★</span>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{r.cuisine_type} • {r.ambience}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 italic">"{r.notes}"</p>
                                {r.must_try_dishes && r.must_try_dishes.length > 0 &&
                                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-2"><span className="font-semibold">Must-Try:</span> {r.must_try_dishes.join(', ')}</p>
                                }
                                <p className="font-semibold text-gray-800 dark:text-gray-200 mt-2">~{formatCurrency(r.estimated_cost_per_person)} per person</p>
                            </div>
                        ))}
                    </div>
                </div>
                 <div>
                    <h4 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-3">Local Specialties to Try</h4>
                    <div className="flex flex-wrap gap-2">
                        {itinerary.food_recommendations.local_specialties.map((dish, i) => (
                           <span key={i} className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 text-sm font-medium px-3 py-1 rounded-full">{dish}</span>
                        ))}
                    </div>
                </div>
                {itinerary.food_recommendations.ai_foodie_tip && (
                     <div className="mt-4">
                        <div className="bg-sky-50 dark:bg-sky-900/50 p-3 rounded-lg flex items-start gap-3">
                            <InfoIcon className="h-5 w-5 text-sky-600 dark:text-sky-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-sky-800 dark:text-sky-300"><span className="font-semibold">AI Foodie Tip:</span> {itinerary.food_recommendations.ai_foodie_tip}</p>
                        </div>
                    </div>
                )}
            </div>
        );
      case 'Weather':
        if (itinerary.weatherLoading) {
            return <SectionLoader text="Checking the weather forecast..." />;
        }
        if (!itinerary.weather_forecast) {
            return <SectionError text="Could not load the weather forecast." />;
        }
        const getWeatherIcon = (description: string) => {
            const desc = description.toLowerCase();
            if (desc.includes('storm') || desc.includes('thunder')) return <CloudLightningIcon className="h-10 w-10 text-gray-500" />;
            if (desc.includes('rain') || desc.includes('drizzle')) return <CloudRainIcon className="h-10 w-10 text-blue-500" />;
            if (desc.includes('snow')) return <CloudSnowIcon className="h-10 w-10 text-cyan-500" />;
            if (desc.includes('sun') || desc.includes('clear')) return <SunIcon className="h-10 w-10 text-yellow-500" />;
            if (desc.includes('cloud')) return <CloudIcon className="h-10 w-10 text-gray-500" />;
            return <CloudSunIcon className="h-10 w-10 text-yellow-600" />;
        };
        return (
            <div className="space-y-6">
                 <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">7-Day Forecast</h3>
                 {itinerary.weather_forecast.weekly_summary && (
                     <p className="text-gray-600 dark:text-gray-300 -mt-2">{itinerary.weather_forecast.weekly_summary}</p>
                 )}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {itinerary.weather_forecast.daily_forecasts.slice(0, 7).map((day, i) => (
                         <div key={i} className="bg-sky-50 dark:bg-sky-900/50 p-4 rounded-lg">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-lg text-sky-800 dark:text-sky-200">Day {day.day}</p>
                                    <p className="text-xs text-sky-600 dark:text-sky-400 mt-1 capitalize whitespace-nowrap">{day.description}</p>
                                </div>
                                <div className="flex justify-center">{getWeatherIcon(day.description)}</div>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-sky-200 dark:border-sky-700 pt-2">
                                <div className="text-sm">
                                    <p className="font-bold text-xl text-sky-900 dark:text-sky-100">{day.high_temp_celsius}° / {day.low_temp_celsius}°</p>
                                    <p className="text-xs text-sky-700 dark:text-sky-300">Feels like {day.feels_like_celsius}°</p>
                                </div>
                                <div className="text-sm text-sky-800 dark:text-sky-200">
                                    <p>💧 {day.humidity_percent}% Humidity</p>
                                    <p>☀️ UV: {day.uv_index}</p>
                                    <p>☔️ {day.chance_of_rain_percent}% Rain</p>
                                </div>
                            </div>
                         </div>
                     ))}
                 </div>
                 <div className="pt-2">
                    <div className="bg-sky-50 dark:bg-sky-900/50 p-3 rounded-lg flex items-start gap-3">
                        <InfoIcon className="h-5 w-5 text-sky-600 dark:text-sky-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-sky-800 dark:text-sky-300"><span className="font-semibold">What to Pack:</span> {itinerary.weather_forecast.packing_recommendation}</p>
                    </div>
                </div>
            </div>
        );
      default: return null;
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl dark:border dark:border-gray-700 transition-colors duration-300">
        <div className="p-6 md:p-8 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-start flex-wrap gap-4">
                <div className="flex-grow">
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">{itinerary.trip_title}</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">A detailed plan for your trip to {details.destination}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={handleExportPDF} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-all transform active:scale-95 duration-300 flex items-center gap-2 text-sm">
                        <DownloadIcon className="h-4 w-4" /> Export PDF
                    </button>
                    <button onClick={onShare} className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-4 rounded-lg transition-all transform active:scale-95 duration-300 flex items-center gap-2 text-sm">
                        <ShareIcon className="h-4 w-4" /> Share
                    </button>
                    {isAuthenticated && (
                        <button onClick={onSaveTrip} className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-all transform active:scale-95 duration-300 flex items-center gap-2 text-sm">
                            <CheckCircleIcon className="h-4 w-4" /> Save Trip
                        </button>
                    )}
                </div>
            </div>
        </div>

        <div className="sticky top-[70px] z-20 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md">
            <div className="px-6 md:px-8 border-b border-gray-200 dark:border-gray-700">
                <nav className="flex space-x-2 overflow-x-auto" aria-label="Tabs">
                    {tabs.map(tab => {
                    const isActive = activeTab === tab.name;
                    return (
                        <button
                        key={tab.name}
                        onClick={() => setActiveTab(tab.name)}
                        className={`flex items-center gap-2 whitespace-nowrap py-3 px-4 font-medium text-sm transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-cyan-500 dark:focus-visible:ring-offset-gray-800 rounded-t-md
                            ${isActive
                            ? 'border-b-2 border-cyan-500 text-cyan-600 dark:text-cyan-400'
                            : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'
                            }`}
                        >
                        <tab.icon className={`h-5 w-5 ${isActive ? 'text-cyan-500' : 'text-gray-400'}`} />
                        {tab.name}
                        </button>
                    );
                    })}
                </nav>
            </div>
        </div>
        
        <div className="p-6 md:p-8">
          {renderContent()}
        </div>
      </div>
      
      {flightSearchModalState && (
        <FlightSearchModal
            activity={flightSearchModalState.activity}
            travelersCount={details.travellers}
            onClose={() => setFlightSearchModalState(null)}
            onFlightSelect={handleFlightSelect}
        />
      )}
      {bookingModal?.type === 'flight' && (
        <FlightBookingModal 
            activity={bookingModal.activity} 
            travelersCount={details.travellers}
            onClose={() => setBookingModal(null)}
            onBookingComplete={handleBookingComplete}
        />
      )}
      {bookingModal?.type === 'hotel' && (
        <HotelBookingModal 
            activity={bookingModal.activity}
            travelersCount={details.travellers}
            onClose={() => setBookingModal(null)}
            onBookingComplete={handleBookingComplete}
        />
      )}
       {bookingModal?.type === 'ride' && (
        <LocalTransportBookingModal 
            activity={bookingModal.activity}
            onClose={() => setBookingModal(null)}
            onBookingComplete={handleBookingComplete}
        />
      )}
      {bookingDetailsModalActivity && (
        <BookingDetailsModal
            activity={bookingDetailsModalActivity}
            onClose={() => setBookingDetailsModalActivity(null)}
        />
      )}
    </>
  );
};

export default ItineraryReport;