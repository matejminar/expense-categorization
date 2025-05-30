import { NextResponse } from 'next/server'
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { simpleExpenseTools } from "@/lib/expense-tools"

// Define valid categories
export const CATEGORIES = [
  'Groceries',
  'Restaurants',
  'Transportation',
  'Entertainment',
  'Shopping',
  'Health',
  'Education',
  'Housing',
  'Utilities',
  'Other'
] as const;

type Category = typeof CATEGORIES[number];

interface LocationContext {
  latitude: number;
  longitude: number;
  amount: number;
  datetime: string;
  nearbyExpenses: Array<{
    category: string;
    amount: number;
    distance: number;
    datetime: string;
  }>;
}

export async function POST(request: Request) {
    console.log('here');
  try {
    // Validate request body
    const body = await request.json();
    console.log('Received request body:', body);

    if (!body || typeof body !== 'object') {
      console.error('Invalid request body:', body);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const locationContext: LocationContext = body;

    // Validate required fields
    if (typeof locationContext.latitude !== 'number' || 
        typeof locationContext.longitude !== 'number' || 
        typeof locationContext.amount !== 'number' || 
        typeof locationContext.datetime !== 'string' || 
        !Array.isArray(locationContext.nearbyExpenses)) {
      console.error('Missing required fields:', locationContext);
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const prompt = `You are an AI assistant that helps categorize expenses based on location, amount, datetime, and spending patterns.
    You will be given the current location, amount, datetime, and nearby expenses (with their datetimes). Your task is to suggest the most likely category
    for a new expense at this location, along with a confidence score.

    IMPORTANT: 
    1. You must respond with a valid JSON object only, no other text. The response must be in this exact format:
    {
      "category": "string",
      "confidence": number,
      "reasoning": "string"
    }
    
    2. The category MUST be one of these exact values: ${CATEGORIES.join(', ')}. Do not suggest any other categories.

    Consider these factors when making your suggestion:
    1. The frequency of categories in nearby expenses
    2. The typical spending patterns in the area
    3. The context of the location (e.g., shopping district, restaurant area)
    4. The amount of the expense and typical amounts for different categories
    5. Amount patterns in nearby expenses
    6. The datetime and day of week for the current and nearby expenses (use the getDayOfWeek tool if needed)

    Current location: ${locationContext.latitude}, ${locationContext.longitude}
    Current amount: €${locationContext.amount}
    Current datetime: ${locationContext.datetime}
    Nearby expenses: ${JSON.stringify(locationContext.nearbyExpenses)}`;

    console.log('Sending request to OpenAI...');
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt,
      temperature: 0.7,
      tools: simpleExpenseTools,

      maxSteps: 3
    });
    console.log('Received response from OpenAI:', text);

    try {
      // Clean the response text to ensure it's valid JSON
      const cleanedText = text.trim().replace(/^[^{]*/, '').replace(/[^}]*$/, '');
      const suggestion = JSON.parse(cleanedText);
      
      // Validate the suggestion object
      if (!suggestion.category || typeof suggestion.confidence !== 'number' || !suggestion.reasoning) {
        throw new Error('Invalid suggestion format');
      }

      // Validate that the category is one of our predefined categories
      if (!CATEGORIES.includes(suggestion.category as Category)) {
        console.error('Invalid category suggested:', suggestion.category);
        return NextResponse.json({
          category: 'Other',
          confidence: 0,
          reasoning: `Invalid category suggested: ${suggestion.category}. Must be one of: ${CATEGORIES.join(', ')}`
        });
      }

      // Ensure confidence is between 0 and 95
      const finalConfidence = Math.min(95, Math.max(0, suggestion.confidence));

      const response = {
        ...suggestion,
        confidence: finalConfidence
      };
      console.log('Sending response:', response);
      return NextResponse.json(response);
    } catch (error) {
      console.error('Error parsing AI response:', error);
      console.error('Raw response:', text);
      return NextResponse.json({
        category: 'Other',
        confidence: 0,
        reasoning: 'Failed to parse AI response'
      });
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 