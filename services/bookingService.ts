import type { Activity, FlightBookingDetails, FlightInfo, Hotel, HotelBookingDetails, LocalTransportBookingDetails, BookingConfirmation } from '../types';


/**
 * Creates a unique key for an activity to use with localStorage.
 * @param activity - The activity object.
 * @returns A string key.
 */
const createActivityKey = (activity: Activity): string => {
  // Create a simple hash from the description to use as a key
  const cleanedDescription = activity.description.replace(/[^a-zA-Z0-9]/g, '');
  return `booking_${cleanedDescription.slice(0, 30)}_${activity.time.replace(':', '')}`;
};


/**
 * Simulates calling a train booking API.
 * In a real application, this would make a network request to a third-party service.
 * @param activity - The travel activity object from the itinerary.
 * @returns A promise that resolves with a confirmation message.
 */
export const bookTrainTicket = (activity: Activity): Promise<string> => {
  console.log('Simulating train ticket booking for:', activity.description);

  return new Promise((resolve, reject) => {
    // Simulate network delay
    setTimeout(() => {
      // Simulate a successful booking
      if (Math.random() > 0.1) { // 90% success rate
        resolve(`Booking confirmed for: ${activity.description}. Check your email for details.`);
      } else {
        // Simulate a failure
        reject(new Error('Booking failed. Please try again later.'));
      }
    }, 1000); // 1 second delay
  });
};

/**
 * Simulates calling a hotel booking API and saves confirmation to localStorage.
 * In a real application, this would make a network request to a third-party service.
 * @param activity - The accommodation activity object from the itinerary.
 * @returns A promise that resolves with a confirmation object.
 */
export const bookHotel = (activity: Activity, bookingDetails: HotelBookingDetails): Promise<BookingConfirmation> => {
  console.log('Simulating hotel booking for:', activity.description, 'with details:', bookingDetails);

  return new Promise((resolve, reject) => {
    // Simulate network delay
    setTimeout(() => {
      // Simulate validation errors
      if (!/^\d{16}$/.test(bookingDetails.payment.cardNumber.replace(/\s/g, ''))) {
        return reject(new Error('The provided card number is invalid. Please check and try again.'));
      }
      if (!/^\d{3,4}$/.test(bookingDetails.payment.cvc)) {
          return reject(new Error('The CVC is invalid. Please check the 3 or 4 digit code on your card.'));
      }

      // Simulate a successful booking
      if (Math.random() > 0.2) { // 80% success rate
        try {
            const bookingId = `GT-HTL-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
            const bookingConfirmation = {
                activityDescription: activity.description,
                bookingTime: new Date().toISOString(),
                guests: bookingDetails.guests.map(g => g.name).filter(Boolean),
                status: 'Confirmed',
                bookingId
            };
            const key = createActivityKey(activity);
            localStorage.setItem(key, JSON.stringify(bookingConfirmation));
            resolve({
                confirmationMessage: `Hotel booking confirmed for: ${activity.description}.`,
                bookingId
            });
        } catch (error) {
            reject(new Error('Failed to save booking. Your browser storage might be full.'));
        }
      } else {
        // Simulate a failure
        const errorTypes = [
            'The hotel booking service is temporarily unavailable. Please try again in a few moments.', 
            'Your card was declined. Please check the details or try a different card.', 
            'Unfortunately, this hotel is not available for the selected dates.'
        ];
        const randomError = errorTypes[Math.floor(Math.random() * errorTypes.length)];
        reject(new Error(randomError));
      }
    }, 1000);
  });
};


/**
 * Checks localStorage to see if an accommodation for a given activity has already been booked.
 * @param activity - The accommodation activity object.
 * @returns True if the accommodation is booked, false otherwise.
 */
export const checkHotelBookingStatus = (activity: Activity): boolean => {
    try {
        const key = createActivityKey(activity);
        const storedBooking = localStorage.getItem(key);
        return storedBooking !== null;
    } catch (error) {
        console.error("Could not check booking status from localStorage", error);
        return false;
    }
};

export const AIRLINES = ['SkyLink Airlines', 'AeroVista', 'CloudHopper', 'Quantum Flights', 'Horizon Air'];

/**
 * Simulates calling a flight search API.
 * @param activity - The travel activity object.
 * @param passengers - Number of passengers.
 * @param preferences - Optional search preferences for airlines, time and stops.
 * @returns A promise that resolves with an array of mock flight information.
 */
export const searchFlights = (
    activity: Activity,
    passengers: number,
    preferences?: { airlines?: string[]; time?: 'Any' | 'Morning' | 'Afternoon' | 'Evening', maxStops?: number }
): Promise<FlightInfo[]> => {
    console.log(`Simulating flight search for: ${activity.description} for ${passengers} passengers with preferences:`, preferences);

    return new Promise((resolve) => {
        setTimeout(() => {
            const mockResults: FlightInfo[] = [];
            const basePrice = activity.estimated_cost / passengers * 0.8; // Base price is 80% of estimated cost per person

            for (let i = 0; i < 20; i++) { // Generate more results to allow for filtering
                const airline = AIRLINES[Math.floor(Math.random() * AIRLINES.length)];
                const departureHour = 6 + Math.floor(Math.random() * 15); // 6 AM to 8 PM
                const durationHours = 4 + Math.floor(Math.random() * 6);
                const arrivalHour = (departureHour + durationHours) % 24;
                const priceFluctuation = 1 + (Math.random() - 0.5) * 0.4; // +/- 20%
                
                mockResults.push({
                    airline,
                    departureTime: `${departureHour.toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
                    arrivalTime: `${arrivalHour.toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
                    duration: `${durationHours}h ${Math.floor(Math.random() * 60)}m`,
                    price: Math.round(basePrice * priceFluctuation),
                    stops: Math.floor(Math.random() * 3), // Generates 0, 1, or 2 stops
                });
            }

            let filteredResults = mockResults;

            // Filter by airline
            if (preferences?.airlines && preferences.airlines.length > 0) {
                filteredResults = filteredResults.filter(flight => preferences.airlines!.includes(flight.airline));
            }

            // Filter by time
            if (preferences?.time && preferences.time !== 'Any') {
                filteredResults = filteredResults.filter(flight => {
                    const departureHour = parseInt(flight.departureTime.split(':')[0], 10);
                    if (preferences.time === 'Morning' && departureHour >= 5 && departureHour < 12) return true;
                    if (preferences.time === 'Afternoon' && departureHour >= 12 && departureHour < 18) return true;
                    if (preferences.time === 'Evening' && departureHour >= 18) return true;
                    return false;
                });
            }

            // Filter by stops
            if (preferences?.maxStops !== undefined && preferences.maxStops < 2) { // 2 means any
                filteredResults = filteredResults.filter(flight => flight.stops <= preferences.maxStops!);
            }
            
            resolve(filteredResults);
        }, 500); // 0.5 second delay
    });
};

/**
 * Simulates booking a flight ticket and saves the confirmation to localStorage.
 * @param activity - The flight activity object.
 * @param bookingDetails - Passenger and payment info.
 * @returns A promise that resolves with a confirmation object.
 */
export const bookFlightTicket = (activity: Activity, bookingDetails: FlightBookingDetails): Promise<BookingConfirmation> => {
  console.log('Simulating flight ticket booking for:', activity.description, 'with details:', bookingDetails);
  
  return new Promise((resolve, reject) => {
    setTimeout(() => {
        // Simulate validation errors
        if (!/^\d{16}$/.test(bookingDetails.payment.cardNumber.replace(/\s/g, ''))) {
            return reject(new Error('The provided card number is invalid. Please check and try again.'));
        }
        if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(bookingDetails.payment.expiryDate)) {
            return reject(new Error('The expiry date is invalid. Please use MM/YY format.'));
        }
        const [month, year] = bookingDetails.payment.expiryDate.split('/');
        const expiry = new Date(2000 + parseInt(year), parseInt(month));
        if (expiry < new Date()) {
             return reject(new Error('This card has expired. Please use a different payment method.'));
        }

        if (Math.random() > 0.2) { // 80% success rate
             try {
                const bookingId = `GT-FLY-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
                const bookingConfirmation = {
                    activityDescription: activity.description,
                    bookingTime: new Date().toISOString(),
                    passengers: bookingDetails.passengers.map(p => p.name).filter(Boolean),
                    status: 'Confirmed',
                    bookingId,
                };
                const key = createActivityKey(activity);
                localStorage.setItem(key, JSON.stringify(bookingConfirmation));
                resolve({
                    confirmationMessage: `Flight booked for ${bookingDetails.passengers.length} passenger(s)!`,
                    bookingId
                });
            } catch (error) {
                reject(new Error('Failed to save booking. Your browser storage might be full.'));
            }
        } else {
            const errorTypes = [
                'The flight booking service is temporarily unavailable. Please try again in a few moments.',
                'Your card was declined. Please check the details or try a different card.',
                'Sorry, seats on this flight are no longer available.'
            ];
            const randomError = errorTypes[Math.floor(Math.random() * errorTypes.length)];
            reject(new Error(randomError));
        }
    }, 1500);
  });
};

/**
 * Checks localStorage to see if a flight for a given activity has already been booked.
 * @param activity - The flight activity object.
 * @returns True if the flight is booked, false otherwise.
 */
export const checkFlightBookingStatus = (activity: Activity): boolean => {
    try {
        const key = createActivityKey(activity);
        const storedBooking = localStorage.getItem(key);
        return storedBooking !== null;
    } catch (error) {
        console.error("Could not check booking status from localStorage", error);
        return false;
    }
};

/**
 * Simulates booking local transport and saves confirmation to localStorage.
 * @param activity - The travel activity.
 * @param bookingDetails - Payment info.
 * @returns A promise resolving with a confirmation object.
 */
export const bookLocalTransport = (activity: Activity, bookingDetails: LocalTransportBookingDetails): Promise<BookingConfirmation> => {
    console.log('Simulating local transport booking for:', activity.description);
    return new Promise((resolve, reject) => {
        setTimeout(() => {
             if (!/^\d{16}$/.test(bookingDetails.payment.cardNumber.replace(/\s/g, ''))) {
                return reject(new Error('The provided card number is invalid. Please check and try again.'));
            }
            if (Math.random() > 0.15) { // 85% success
                try {
                    const bookingId = `GT-RIDE-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
                    const key = createActivityKey(activity);
                    const bookingConfirmation = {
                      status: 'Confirmed',
                      bookingTime: new Date().toISOString(),
                      bookingId
                    };
                    localStorage.setItem(key, JSON.stringify(bookingConfirmation));
                    resolve({
                        confirmationMessage: `Your ride for "${activity.description}" is confirmed.`,
                        bookingId,
                    });
                } catch (error) {
                    reject(new Error('Failed to save booking. Your browser storage might be full.'));
                }
            } else {
                reject(new Error('The ride service is currently unavailable in this area. Please try again later.'));
            }
        }, 1000);
    });
};

/**
 * Checks if local transport for an activity has been booked.
 * @param activity - The travel activity.
 * @returns True if booked, false otherwise.
 */
export const checkLocalTransportBookingStatus = (activity: Activity): boolean => {
    try {
        const key = createActivityKey(activity);
        return localStorage.getItem(key) !== null;
    } catch {
        return false;
    }
};

/**
 * Retrieves booking details from localStorage.
 * @param activity The activity to get details for.
 * @returns The parsed booking details object or null.
 */
export const getBookingDetails = (activity: Activity): any | null => {
    try {
        const key = createActivityKey(activity);
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error("Failed to retrieve booking details", error);
        return null;
    }
};