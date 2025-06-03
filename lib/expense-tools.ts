import {tool } from "ai"
// import { openai } from "@ai-sdk/openai"
import { z } from "zod"
// import { Client } from "@googlemaps/google-maps-services-js"

// // Configure OpenAI client
// const openaiClient = openai("gpt-4o-mini")

// interface AddressComponent {
//   long_name: string;
//   short_name: string;
//   types: string[];
// }

// interface PlaceData {
//   name?: string;
//   types?: string[];
// }

// const mapsClient = new Client({});

// interface LocationInfo {
//   areaType: string;
//   nearbyBusinesses: string[];
//   district: string;
// }

// interface AmountValidation {
//   isReasonable: boolean;
//   typicalRange: { min: number; max: number };
//   confidence: number;
// }

// interface BusinessInfo {
//   type: string;
//   subType: string;
//   confidence: number;
// }

// export const expenseTools = {
//   getLocationContext: tool({
//     description: "Get information about a location including area type, nearby businesses, and district",
//     parameters: z.object({
//       lat: z.number().describe("Latitude of the location"),
//       lng: z.number().describe("Longitude of the location")
//     }),
//     execute: async ({ lat, lng }) => {
//       // Get place details from Google Maps
//       const [placeResult, nearbyResult] = await Promise.all([
//         mapsClient.reverseGeocode({
//           params: {
//             latlng: { lat, lng },
//             key: process.env.GOOGLE_MAPS_API_KEY!,
//           },
//         }),
//         mapsClient.placesNearby({
//           params: {
//             location: { lat, lng },
//             radius: 500, // 500 meters radius
//             key: process.env.GOOGLE_MAPS_API_KEY!,
//           },
//         }),
//       ]);

//       // Extract address components for area type and district
//       const addressComponents = placeResult.data.results[0]?.address_components || [];
//       const areaType = addressComponents.find((comp: AddressComponent) => 
//         comp.types.includes('sublocality') || 
//         comp.types.includes('locality')
//       )?.long_name || 'Unknown';

//       const district = addressComponents.find((comp: AddressComponent) => 
//         comp.types.includes('administrative_area_level_1')
//       )?.long_name || 'Unknown';

//       // Get nearby business types
//       const nearbyBusinesses = nearbyResult.data.results
//         .map((place: PlaceData) => place.types?.[0] || 'unknown')
//         .filter((type: string, index: number, self: string[]) => self.indexOf(type) === index)
//         .slice(0, 5);

//       return {
//         areaType,
//         nearbyBusinesses,
//         district
//       } as LocationInfo;
//     }
//   }),

//   validateAmount: tool({
//     description: "Validate if an amount is reasonable for a category at a specific location",
//     parameters: z.object({
//       amount: z.number().describe("The amount to validate"),
//       category: z.string().describe("The expense category"),
//       location: z.object({
//         lat: z.number().describe("Latitude of the location"),
//         lng: z.number().describe("Longitude of the location")
//       })
//     }),
//     execute: async ({ amount, category, location }) => {
//       // Get place details to understand the business type
//       const placeResult = await mapsClient.placesNearby({
//         params: {
//           location: { lat: location.lat, lng: location.lng },
//           radius: 50, // 50 meters radius for exact location
//           key: process.env.GOOGLE_MAPS_API_KEY!,
//         },
//       });

//       const place = placeResult.data.results[0];
//       if (!place) {
//         return {
//           isReasonable: true,
//           typicalRange: { min: 0, max: amount * 2 },
//           confidence: 0.5
//         };
//       }

//       // Use LLM to analyze if amount is reasonable based on place type
//       const { text } = await generateText({
//         model: openaiClient,
//         prompt: `Analyze if this amount (€${amount}) is reasonable for the category "${category}" at a ${place.types?.join(', ')}.
//         Consider:
//         1. Typical prices for this type of business
//         2. Whether the amount is within normal ranges
//         3. Any special circumstances that might affect the price
        
//         Respond with a JSON object containing:
//         {
//           "isReasonable": boolean,
//           "typicalRange": { "min": number, "max": number },
//           "confidence": number between 0-1
//         }`,
//         temperature: 0.3,
//       });

//       return JSON.parse(text) as AmountValidation;
//     }
//   }),

//   getBusinessType: tool({
//     description: "Get information about the type of business at a specific location",
//     parameters: z.object({
//       lat: z.number().describe("Latitude of the location"),
//       lng: z.number().describe("Longitude of the location")
//     }),
//     execute: async ({ lat, lng }) => {
//       // Get place details from Google Maps
//       const placeResult = await mapsClient.placesNearby({
//         params: {
//           location: { lat, lng },
//           radius: 50, // 50 meters radius for exact location
//           key: process.env.GOOGLE_MAPS_API_KEY!,
//         },
//       });

//       const place = placeResult.data.results[0];
//       if (!place) {
//         return {
//           type: 'unknown',
//           subType: 'unknown',
//           confidence: 0
//         };
//       }

//       // Use LLM to categorize the business type based on Google Places data
//       const { text } = await generateText({
//         model: openaiClient,
//         prompt: `Categorize this business based on its Google Places data:
//         Name: ${place.name}
//         Types: ${place.types?.join(', ')}
        
//         Respond with a JSON object containing:
//         {
//           "type": "primary business type",
//           "subType": "specific subcategory",
//           "confidence": number between 0-1
//         }`,
//         temperature: 0.3,
//       });

//       return JSON.parse(text) as BusinessInfo;
//     }
//   })
// };

// Tool: Get typical amount range for a category
export const getTypicalAmountRange = tool({
  description: "Get the typical min and max amount for a given expense category.",
  parameters: z.object({
    category: z.string().describe("The expense category"),
  }),
  execute: async ({ category }) => {
    console.log('TOOL: getTypicalAmountRange')
    const ranges: Record<string, { min: number; max: number }> = {
      Groceries: { min: 10, max: 100 },
      Restaurants: { min: 15, max: 80 },
      Transportation: { min: 2, max: 50 },
      Entertainment: { min: 5, max: 100 },
      Shopping: { min: 10, max: 500 },
      Health: { min: 5, max: 200 },
      Education: { min: 20, max: 300 },
      Housing: { min: 100, max: 2000 },
      Utilities: { min: 20, max: 300 },
      Microspends: { min: 0, max: 1 },
      Other: { min: 0, max: 100 },
    };
    return ranges[category] || { min: 0, max: 100 };
  },
});

// Tool: Get day of week for a given date
export const getDayOfWeek = tool({
  description: "Get the day of the week for a given date (ISO string).",
  parameters: z.object({
    date: z.string().describe("Date in ISO format"),
  }),
  execute: async ({ date }) => {
    console.log('TOOL: getDayOfWeek')
    const day = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
    return { dayOfWeek: day };
  },
});

// Export as a tools object for agent use
export const simpleExpenseTools = {
  getTypicalAmountRange,
  getDayOfWeek,
}; 