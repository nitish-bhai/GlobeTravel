



import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { TripDetails, Itinerary, ChatMessage, TravelAdvisory, DayPlan, AccommodationRecommendations, Transportation, FoodRecommendations, WeatherForecast } from '../types';

const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error("API_KEY environment variable not set. Please configure it to use AI features.");
}
const ai = new GoogleGenAI({ apiKey });

// Reusable sub-schemas
const hotelSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING },
        address: { type: Type.STRING, description: "A general address or location." },
        star_rating: { type: Type.NUMBER },
        rating: { type: Type.NUMBER, description: "A numerical user rating out of 5, e.g., 4.5." },
        amenities: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of key amenities." },
        estimated_nightly_cost: { type: Type.NUMBER, description: "In INR." },
    },
    required: ["name", "address", "star_rating", "rating", "amenities", "estimated_nightly_cost"]
};

// Schemas for modular generation
const coreItinerarySchema = {
    type: Type.OBJECT,
    properties: {
        trip_title: { type: Type.STRING, description: "A creative and catchy title for the trip, e.g., 'A Week of Sun and Spice in Goa'." },
        total_estimated_cost: { type: Type.NUMBER, description: "The total estimated cost for the entire trip for all travelers in INR." },
        currency: { type: Type.STRING, description: "The currency for the cost, which must be 'INR'." },
        trip_summary: {
            type: Type.OBJECT,
            properties: {
                description: { type: Type.STRING, description: "A paragraph summarizing the trip's theme and flow." },
                highlights: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A bulleted list of 3-5 key highlights or experiences." },
            },
            required: ["description", "highlights"],
        },
        detailed_cost_breakdown: {
            type: Type.OBJECT,
            properties: {
                stay: { type: Type.NUMBER, description: "Estimated cost for accommodation in INR." },
                travel: { type: Type.NUMBER, description: "Estimated cost for all transportation (flights, trains, local) in INR." },
                food: { type: Type.NUMBER, description: "Estimated cost for meals in INR." },
                activities: { type: Type.NUMBER, description: "Estimated cost for activities and sightseeing in INR." },
                miscellaneous: { type: Type.NUMBER, description: "A small buffer for miscellaneous expenses in INR." },
            },
            required: ["stay", "travel", "food", "activities", "miscellaneous"],
        },
        schedule: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    day: { type: Type.INTEGER },
                    title: { type: Type.STRING },
                    activities: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                time: { type: Type.STRING },
                                description: { type: Type.STRING },
                                type: { type: Type.STRING, description: "Type of activity: 'Food', 'Sightseeing', 'Activity', 'Travel', or 'Accommodation'." },
                                estimated_cost: { type: Type.NUMBER },
                                travel_details: {
                                    type: Type.OBJECT,
                                    properties: {
                                        distance: { type: Type.STRING },
                                        duration: { type: Type.STRING }
                                    }
                                }
                            },
                            required: ["time", "description", "type", "estimated_cost"],
                        },
                    },
                    ai_tip: { type: Type.STRING },
                },
                required: ["day", "title", "activities", "ai_tip"],
            },
        },
    },
    required: ["trip_title", "total_estimated_cost", "currency", "trip_summary", "detailed_cost_breakdown", "schedule"],
};

const accommodationSchema = {
    type: Type.OBJECT,
    properties: {
        accommodation_recommendations: {
            type: Type.OBJECT,
            properties: {
                budget: { type: Type.ARRAY, items: hotelSchema },
                standard: { type: Type.ARRAY, items: hotelSchema },
                luxury: { type: Type.ARRAY, items: hotelSchema },
            },
            required: ["budget", "standard", "luxury"]
        }
    },
    required: ["accommodation_recommendations"]
};

const transportationSchema = {
    type: Type.OBJECT,
    properties: {
        transportation_options: {
            type: Type.OBJECT,
            properties: {
                long_distance_options: {
                    type: Type.ARRAY, items: {
                        type: Type.OBJECT, properties: {
                            mode: { type: Type.STRING }, details: { type: Type.STRING }, estimated_cost: { type: Type.NUMBER }, duration: { type: Type.STRING }, provider_examples: { type: Type.ARRAY, items: { type: Type.STRING } },
                        },
                        required: ["mode", "details", "estimated_cost", "duration"]
                    }
                },
                local_suggestions: {
                    type: Type.ARRAY, items: {
                        type: Type.OBJECT, properties: {
                            mode: { type: Type.STRING }, suggestion: { type: Type.STRING }, estimated_cost_range: { type: Type.STRING },
                        },
                         required: ["mode", "suggestion", "estimated_cost_range"]
                    }
                },
            },
            required: ["long_distance_options", "local_suggestions"]
        }
    },
    required: ["transportation_options"]
};

const foodSchema = {
    type: Type.OBJECT,
    properties: {
        food_recommendations: {
            type: Type.OBJECT,
            properties: {
                restaurants: {
                    type: Type.ARRAY, items: {
                        type: Type.OBJECT, properties: {
                            name: { type: Type.STRING }, cuisine_type: { type: Type.STRING }, estimated_cost_per_person: { type: Type.NUMBER }, rating: { type: Type.NUMBER }, notes: { type: Type.STRING }, price_range: { type: Type.STRING, description: "A price category: '$', '$$', or '$$$'." }, must_try_dishes: { type: Type.ARRAY, items: { type: Type.STRING } }, ambience: { type: Type.STRING },
                        },
                        required: ["name", "cuisine_type", "estimated_cost_per_person", "rating", "notes", "price_range", "must_try_dishes", "ambience"]
                    }
                },
                local_specialties: { type: Type.ARRAY, items: { type: Type.STRING } },
                ai_foodie_tip: { type: Type.STRING }
            },
            required: ["restaurants", "local_specialties", "ai_foodie_tip"]
        }
    },
    required: ["food_recommendations"]
};

const weatherSchema = {
    type: Type.OBJECT,
    properties: {
        weather_forecast: {
            type: Type.OBJECT,
            properties: {
                weekly_summary: { type: Type.STRING },
                daily_forecasts: {
                    type: Type.ARRAY, items: {
                        type: Type.OBJECT, properties: {
                            day: { type: Type.INTEGER }, high_temp_celsius: { type: Type.NUMBER }, low_temp_celsius: { type: Type.NUMBER }, description: { type: Type.STRING }, feels_like_celsius: { type: Type.NUMBER }, humidity_percent: { type: Type.NUMBER }, uv_index: { type: Type.STRING, description: "e.g., '5 (Moderate)'" }, chance_of_rain_percent: { type: Type.NUMBER },
                        },
                        required: ["day", "high_temp_celsius", "low_temp_celsius", "description", "feels_like_celsius", "humidity_percent", "uv_index", "chance_of_rain_percent"]
                    }
                },
                packing_recommendation: { type: Type.STRING }
            },
            required: ["daily_forecasts", "packing_recommendation", "weekly_summary"]
        }
    },
    required: ["weather_forecast"]
};


/**
 * A generic helper to call the Gemini API for critical data, throwing an error on failure.
 * @param prompt - The prompt to send to the AI.
 * @param schema - The expected response schema.
 * @returns The parsed JSON object.
 * @throws An error with a user-friendly message if generation or parsing fails.
 */
const generateContentOrThrow = async <T>(prompt: string, schema: object): Promise<T> => {
    let jsonText = '';
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });

        jsonText = response.text.trim();
        if (!jsonText) {
            throw new Error("The AI returned an empty response. Please try adjusting your trip details.");
        }

        const cleanJsonText = jsonText.replace(/^```json\s*|```$/g, '');
        return JSON.parse(cleanJsonText) as T;

    } catch (error) {
        console.error("Error during critical AI generation or parsing:", error);

        if (error instanceof SyntaxError) {
            console.error("Malformed JSON received from AI:", jsonText);
            throw new Error("The AI returned an invalid data format. We're working on it, but please try again.");
        }
        
        if (error instanceof Error) {
            // Check for specific known issues from Gemini API
            if (error.message.includes('429')) {
                throw new Error("Our AI is a bit busy! This is likely a temporary rate limit issue. Please wait a moment and try again.");
            }
            if (error.message.includes('SAFETY')) {
                throw new Error("The request was blocked for safety reasons. Please try adjusting your destination or interests.");
            }
            // Re-throw other specific errors to be caught by the UI
            throw error;
        }
        
        // Fallback for unknown errors
        throw new Error("An unexpected error occurred while communicating with the AI. Please check your connection and try again.");
    }
};

/**
 * A generic helper to call the Gemini API and parse the JSON response.
 * @param prompt - The prompt to send to the AI.
 * @param schema - The expected response schema.
 * @returns The parsed JSON object.
 */
const generateAndParse = async <T>(prompt: string, schema: object): Promise<T | null> => {
    let jsonText = '';
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });

        jsonText = response.text.trim();
        if (!jsonText) return null;

        const cleanJsonText = jsonText.replace(/^```json\s*|```$/g, '');
        return JSON.parse(cleanJsonText) as T;

    } catch (error) {
        console.error("Error during AI generation or parsing:", error);
        if (error instanceof SyntaxError) {
            console.error("Malformed JSON received from AI:", jsonText);
        }
        return null; // Return null to indicate failure, allowing graceful degradation.
    }
};

export const generateCoreItinerary = async (details: TripDetails): Promise<Itinerary> => {
    const prompt = `
      You are an expert travel planner AI. Your task is to create a comprehensive and complete travel itinerary based on the user's requirements.
      You must generate a valid JSON object that strictly adheres to the provided schema. Do not output any text or explanation outside of the JSON object.

      **Trip Details:**
      - **Departure City:** ${details.departureCity}
      - **Destination:** ${details.destination}
      - **Dates:** From ${details.startDate} to ${details.endDate} (${details.duration} days)
      - **Number of Travelers:** ${details.travellers}
      - **Travel Style:** ${details.travelStyle}
      - **Interests:** ${details.interests.join(', ')}
      ${details.budget ? `- **Target Budget:** Approximately ${details.budget} INR. Plan costs around this value.` : ''}

      **Crucial Instructions for JSON Generation:**
      1.  **Validity is Key:** Your entire output must be a single, valid JSON object conforming to the schema. Do not include any markdown formatting like \`\`\`json.
      2.  **Completeness:** You must fill out ALL required fields in the schema. If you cannot find specific information, provide a realistic and plausible estimate. For example, estimate costs, travel times, or provider names. Do not leave required fields empty.
      3.  **Costs:** All costs must be in INR. The sum of the \`detailed_cost_breakdown\` must exactly match the \`total_estimated_cost\`.
      4.  **Schedule:** Create a plan for every single day of the trip's duration (${details.duration} days). For 'Travel' type activities, if exact details are unknown, provide an estimate for distance and duration in the \`travel_details\` object. Every day plan requires a helpful \`ai_tip\`.
      5.  **No Refusals:** Do not refuse to generate the plan for any reason. If a destination is obscure, create a plausible, creative itinerary based on the user's interests. Your only goal is to produce the requested JSON data.
    `;
    return generateContentOrThrow<Itinerary>(prompt, coreItinerarySchema);
};

export const generateAccommodationRecommendations = async (details: TripDetails): Promise<AccommodationRecommendations | null> => {
    const prompt = `
        Based on a trip to **${details.destination}** for **${details.travellers} people** with a **${details.travelStyle} travel style**, recommend accommodations.
        Provide 3 distinct options for each tier: 'budget', 'standard', and 'luxury'.
        Output must be a valid JSON object adhering to the schema.
    `;
    const result = await generateAndParse<{ accommodation_recommendations: AccommodationRecommendations }>(prompt, accommodationSchema);
    return result?.accommodation_recommendations || null;
};

export const generateTransportationOptions = async (details: TripDetails): Promise<Transportation | null> => {
    const prompt = `
      Suggest transportation options for a trip from **${details.departureCity}** to **${details.destination}**.
      For long-distance options, include examples of typical providers (e.g., airlines like IndiGo, train lines).
      For local transport suggestions (e.g., scooter rental, ride-hailing), provide a realistic estimated cost range (e.g., per day for rentals, per trip for taxis).
      Output must be a valid JSON object adhering to the schema.
    `;
    const result = await generateAndParse<{ transportation_options: Transportation }>(prompt, transportationSchema);
    return result?.transportation_options || null;
};

export const generateFoodRecommendations = async (details: TripDetails): Promise<FoodRecommendations | null> => {
    const prompt = `
      For a trip to **${details.destination}**, provide food recommendations for someone interested in **${details.interests.join(', ')}**.
      Include 3-5 recommended restaurants with details like price range ('$', '$$', or '$$$'), ambiance (e.g., 'Casual', 'Fine Dining', 'Beachfront'), and 1-2 must-try dishes for each.
      Also include a list of must-try local specialties, and one helpful 'ai_foodie_tip'.
      Output must be a valid JSON object adhering to the schema.
    `;
    const result = await generateAndParse<{ food_recommendations: FoodRecommendations }>(prompt, foodSchema);
    return result?.food_recommendations || null;
};

export const generateWeatherForecast = async (details: TripDetails): Promise<WeatherForecast | null> => {
    const prompt = `
        Generate a plausible 7-day weather forecast for **${details.destination}** for a trip starting on **${details.startDate}**.
        For each day, provide high/low temps, feels like temp, humidity percentage, chance of rain percentage, UV index (e.g., "5 Moderate"), and a short description.
        Also provide a weekly summary and a concise packing recommendation based on the forecast.
        Output must be a valid JSON object adhering to the schema.
    `;
    const result = await generateAndParse<{ weather_forecast: WeatherForecast }>(prompt, weatherSchema);
    return result?.weather_forecast || null;
};


export const generateImageForActivity = async (prompt: string): Promise<string | null> => {
    try {
        const fullPrompt = `A beautiful, high-quality, photorealistic photograph representing the following travel scene: "${prompt}". The image should be vibrant, inspiring, and suitable for a travel itinerary banner. No text, no logos, cinematic lighting. Aspect ratio 16:9.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: fullPrompt }],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        const part = response.candidates?.[0]?.content?.parts?.[0];

        if (part?.inlineData) {
            const base64ImageBytes: string = part.inlineData.data;
            const mimeType = part.inlineData.mimeType;
            return `data:${mimeType};base64,${base64ImageBytes}`;
        }
        
        console.warn("No image data found in Gemini response for prompt:", prompt);
        return null;
    } catch (error) {
        console.error("Error generating image with Gemini:", error);
        return null; // Return null on error so the app doesn't crash
    }
};


export const getChatResponse = async (history: ChatMessage[], newMessage: string, itinerary?: Itinerary | null, details?: TripDetails | null): Promise<string> => {
    try {
        let systemInstruction = `You are a helpful and friendly travel assistant chatbot named 'GlobeTrekker AI'. 
        Your goal is to help users with their travel-related questions.
        You can provide information on destinations, suggest activities, and help with general travel advice.
        If you don't know the answer, say so. Be concise and conversational.`;

        if (itinerary && details) {
             // Create a detailed context for the AI, but keep it concise to manage token count.
            const itineraryContext = JSON.stringify({
                destination: details.destination,
                duration: details.duration,
                travellers: details.travellers,
                interests: details.interests,
                travelStyle: details.travelStyle,
                total_estimated_cost: itinerary.total_estimated_cost,
                cost_breakdown: itinerary.detailed_cost_breakdown,
                schedule: itinerary.schedule.map(day => ({
                    day: day.day,
                    title: day.title,
                    activities: day.activities.map(act => ({
                        time: act.time,
                        description: act.description,
                        cost: act.estimated_cost,
                        travel_details: act.travel_details,
                    }))
                })),
                // Summarize other available info
                accommodation_info: itinerary.accommodation_recommendations ? 'Recommendations for budget, standard, and luxury stays are available in the "Stay" tab.' : 'No specific accommodation recommendations generated.',
                transport_info: itinerary.transportation_options ? 'Options for long-distance and local travel are available in the "Transport" tab.' : 'No specific transport options generated.',
                food_info: itinerary.food_recommendations ? 'Restaurant and local specialty recommendations are available in the "Food" tab.' : 'No specific food recommendations generated.',
            });

            systemInstruction = `You are an expert travel assistant chatbot named 'GlobeTrekker AI'. 
            The user is currently viewing a detailed trip plan. Your primary goal is to help them understand, refine, and get more information about their trip using the provided context. You can also answer general travel questions.

            CURRENT ITINERARY CONTEXT:
            ${itineraryContext}

            YOUR CAPABILITIES:
            1.  **Answer Specific Questions:** Use the itinerary context to answer questions about costs ("How much is the flight on Day 1?"), timings, activities, and logistics. Be precise with the data you have.
            2.  **Suggest Alternatives:** If the user dislikes an activity (e.g., "I'm not a fan of museums"), suggest a relevant replacement based on their stated interests: ${details.interests.join(', ')}.
            3.  **Handle Modifications:** If a user wants to change something (e.g., "Can we add more beach time on Day 3?"), acknowledge the request and provide a thoughtful suggestion on how to adjust the schedule. You could suggest replacing an existing activity or adding a new one if time permits.
            4.  **General Knowledge:** If the user asks a question not covered by the itinerary (e.g., "What's the local language?" or "What are some good books to read about ${details.destination}?"), provide helpful, general travel advice.
            5.  **Be Conversational:** Maintain a friendly, concise, and helpful tone. When suggesting changes, explain your reasoning.
            6.  **Simplicity:** Do not output JSON or code. Provide text-based suggestions and answers. Do not try to re-write the entire itinerary. Refer the user to the relevant tabs (e.g., "Stay", "Food") for more details if they ask for recommendations already provided there.`;
        }

        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            history: history.map(msg => ({
                role: msg.role,
                parts: [{ text: msg.text }]
            })),
            config: {
                systemInstruction
            }
        });

        const response = await chat.sendMessage({ message: newMessage });
        return response.text;
    } catch (error) {
        console.error("Error in chat:", error);
        return "Sorry, I encountered an error. Please try again.";
    }
};

const travelAdvisorySchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: "A concise title for the advisory." },
            details: { type: Type.STRING, description: "A detailed explanation of the advisory." },
            severity: { type: Type.STRING, description: "Severity level: 'Low', 'Medium', 'High', or 'Critical'." },
        },
        required: ["title", "details", "severity"],
    }
};

export const getTravelAdvisories = async (destination: string, startDate: string, endDate: string): Promise<TravelAdvisory[] | null> => {
    try {
        const prompt = `
            Acting as a travel safety and information expert, generate a list of potential travel advisories for a trip to ${destination} between ${startDate} and ${endDate}.
            Consider factors like:
            - Common local scams or safety concerns.
            - Potential for severe weather during those dates.
            - Major local events, holidays, or strikes that could cause disruption.
            - Health recommendations or vaccination requirements.
            - Any recent significant local news that might impact travelers.

            If there are no significant advisories, return an empty array or one low-severity advisory with general travel tips.
            Generate up to 3 relevant advisories.
            The output must be a valid JSON array of objects that adheres to the provided schema.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: travelAdvisorySchema,
            },
        });

        const jsonText = response.text.trim();
        const cleanJsonText = jsonText.replace(/^```json\s*|```$/g, '');
        const advisoryData = JSON.parse(cleanJsonText);
        
        if (advisoryData && Array.isArray(advisoryData)) {
            return advisoryData as TravelAdvisory[];
        }
        return null;

    } catch (error) {
        console.error("Error generating travel advisories:", error);
        // Don't throw an error, just return null so the UI can handle it gracefully.
        return null;
    }
};

const geocodeSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING, description: "The name of the location." },
            lat: { type: Type.NUMBER, description: "The latitude." },
            lng: { type: Type.NUMBER, description: "The longitude." },
            day: { type: Type.INTEGER, description: "The day of the trip this location is associated with." },
        },
        required: ["name", "lat", "lng", "day"],
    }
};

export const extractLocationsFromSchedule = async (schedule: DayPlan[], destination: string) => {
    try {
        // FIX: Create a simplified version of the schedule to avoid exceeding token limits on long trips.
        const simplifiedScheduleForGeocoding = schedule.map(day => ({
            day: day.day,
            activities: day.activities.map(activity => ({
                description: activity.description,
            })),
        }));
        
        const prompt = `
            From the following travel schedule for a trip to ${destination}, identify all key points of interest, landmarks, restaurants, hotels, or specific addresses mentioned in the activity descriptions.
            For each distinct location you identify, provide its name, its geographic coordinates (latitude and longitude), and the day number it appears on.
            If a location is mentioned on multiple days, please return an entry for each day.
            The output must be a valid JSON array of objects that adheres to the provided schema.

            Travel Schedule:
            ${JSON.stringify(simplifiedScheduleForGeocoding, null, 2)}
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: geocodeSchema,
            },
        });

        const jsonText = response.text.trim();
        const cleanJsonText = jsonText.replace(/^```json\s*|```$/g, '');
        // FIX: Ensure day is a number, as AI model might return it as a string. Also filter out invalid entries.
        const parsedData = JSON.parse(cleanJsonText);

        if (Array.isArray(parsedData)) {
            return parsedData
                .map(loc => ({
                    ...loc,
                    day: Number(loc.day),
                }))
                .filter(loc => loc.day && !isNaN(loc.day));
        }

        return [];

    } catch (error) {
        console.error("Error geocoding locations:", error);
        return [];
    }
};