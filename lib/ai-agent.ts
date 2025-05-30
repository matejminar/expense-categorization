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

export async function getCategorySuggestion(locationContext: LocationContext) {
  try {
    // Validate input
    if (!locationContext || 
        typeof locationContext.latitude !== 'number' || 
        typeof locationContext.longitude !== 'number' || 
        typeof locationContext.amount !== 'number' || 
        typeof locationContext.datetime !== 'string' || 
        !Array.isArray(locationContext.nearbyExpenses)) {
      console.error('Invalid location context:', locationContext);
      return {
        category: 'Other',
        confidence: 0,
        reasoning: 'Invalid input data'
      };
    }

    const response = await fetch('/api/suggest-category', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(locationContext),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting category suggestion:', error);
    return {
      category: 'Other',
      confidence: 0,
      reasoning: error instanceof Error ? error.message : 'Failed to get category suggestion'
    };
  }
} 