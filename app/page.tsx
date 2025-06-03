"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MapPin, Euro, Sparkles, History } from "lucide-react"
import { getCategorySuggestion } from "@/lib/ai-agent"
import { CATEGORIES } from "@/lib/constants"

interface Expense {
  id: string
  amount: number
  category: string
  latitude: number
  longitude: number
  datetime: string // ISO string
  location?: string
}

interface LocationSuggestion {
  category: string
  confidence: number
  distance: number
  count: number
  reasoning?: string
}

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c * 1000 // Return distance in meters
}

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function FinanceTracker() {
  const [amount, setAmount] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; label?: string } | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)

  // Debounce the amount value
  const debouncedAmount = useDebounce(amount, 500); // 500ms delay

  // Simulate getting current location
  const getCurrentLocation = () => {
    setIsLoadingLocation(true)
    // Simulate location fetch with some realistic coordinates around a city
    setTimeout(() => {
      const locations = [
        // { lat: 48.2082, lng: 16.3719, label: "Vienna city center" },
        { lat: 48.2035, lng: 16.3618, label: "Naschmarkt area" },
        { lat: 48.2167, lng: 16.3833, label: "Prater park" },
        // { lat: 48.2100, lng: 16.3700, label: "Stephansplatz" },
        // { lat: 48.1865, lng: 16.3126, label: "Schönbrunn Palace" },
      ]
      const randomLocation = locations[Math.floor(Math.random() * locations.length)]
      // Add some random variation to simulate exact location
      const lat = randomLocation.lat + (Math.random() - 0.5) * 0.002
      const lng = randomLocation.lng + (Math.random() - 0.5) * 0.002

      setCurrentLocation({ lat, lng, label: randomLocation.label })
      setIsLoadingLocation(false)
    }, 1000)
  }

  // Generate AI suggestions based on location
  const generateSuggestions = async (lat: number, lng: number) => {
    const currentAmount = Number(debouncedAmount) || 0;
    if (currentAmount <= 0) {
      setSuggestions([]);
      return;
    }

    const RADIUS_THRESHOLD = 500 // 500 meters

    // Get nearby expenses
    const nearbyExpenses = expenses
      .map((expense) => ({
        category: expense.category,
        amount: expense.amount,
        distance: calculateDistance(lat, lng, expense.latitude, expense.longitude),
        datetime: expense.datetime,
      }))
      .filter((expense) => expense.distance <= RADIUS_THRESHOLD)

    try {
      const suggestion = await getCategorySuggestion({
        latitude: lat,
        longitude: lng,
        amount: currentAmount,
        nearbyExpenses,
        datetime: new Date().toISOString(), // Pass current datetime if needed
      })

      setSuggestions([
        {
          category: suggestion.category,
          confidence: suggestion.confidence,
          distance: 0, // We don't have this from the AI
          count: nearbyExpenses.length,
          reasoning: suggestion.reasoning,
        },
      ])
    } catch (error) {
      console.error('Error getting AI suggestions:', error)
      setSuggestions([])
    }
  }

  // Effect to generate suggestions when location or debounced amount changes
  useEffect(() => {
    const currentAmount = Number(debouncedAmount) || 0;
    if (currentLocation && expenses.length > 0 && currentAmount > 0) {
      generateSuggestions(currentLocation.lat, currentLocation.lng)
    } else {
      setSuggestions([]);
    }
  }, [currentLocation, expenses, debouncedAmount])

  // Load expenses from localStorage on mount
  useEffect(() => {
    const savedExpenses = localStorage.getItem("expenses")
    if (savedExpenses) {
      const parsed = JSON.parse(savedExpenses).map((exp: Expense) => ({
        ...exp,
        datetime: typeof exp.datetime === 'string' ? exp.datetime : new Date().toISOString(),
      }))
      setExpenses(parsed)
    }
  }, [])

  // Save expenses to localStorage
  useEffect(() => {
    if (expenses.length > 0) {
      localStorage.setItem("expenses", JSON.stringify(expenses))
    }
  }, [expenses])

  const handleSubmit = () => {
    if (!amount || !selectedCategory || !currentLocation) return

    const newExpense: Expense = {
      id: Date.now().toString(),
      amount: Number.parseFloat(amount),
      category: selectedCategory,
      latitude: currentLocation.lat,
      longitude: currentLocation.lng,
      datetime: new Date().toISOString(),
      location: currentLocation.label || undefined,
    }

    setExpenses((prev) => [newExpense, ...prev])
    setAmount("")
    setSelectedCategory("")
    setSuggestions([])
  }

  const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Smart Expense Tracker</h1>
          <p className="text-gray-600">AI-powered category suggestions based on your location</p>
        </div>

        {/* Current Location Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="w-5 h-5" />
              Current Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentLocation ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Lat: {currentLocation.lat.toFixed(4)}, Lng: {currentLocation.lng.toFixed(4)}
                </p>
                {currentLocation.label && (
                  <div className="text-xs text-gray-400 italic">{currentLocation.label}</div>
                )}
                <Badge variant="secondary" className="text-xs">
                  Location acquired
                </Badge>
              </div>
            ) : (
              <Button onClick={getCurrentLocation} disabled={isLoadingLocation} className="w-full">
                {isLoadingLocation ? "Getting location..." : "Get Current Location"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Expense Entry Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Euro className="w-5 h-5" />
              Log Expense
            </CardTitle>
            <CardDescription>Enter the amount manually, let AI suggest the category</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (€)</Label>
              <Input
                id="amount"
                type="text"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            {/* AI Suggestions */}
            {suggestions.length > 0 && Number(amount) > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  AI Suggestions
                </Label>
                <div className="grid grid-cols-1 gap-2">
                  {suggestions.map((suggestion) => (
                    <Button
                      key={suggestion.category}
                      variant={selectedCategory === suggestion.category ? "default" : "outline"}
                      className="justify-between h-auto p-3"
                      onClick={() => setSelectedCategory(suggestion.category)}
                    >
                      <div className="text-left w-full">
                        <div className="font-medium">{suggestion.category}</div>
                        <div className="text-xs opacity-70">
                          {suggestion.count} times nearby • {suggestion.confidence}% confidence
                        </div>
                        {suggestion.reasoning && (
                          <div
                            className="text-xs text-gray-500 mt-1 break-words whitespace-pre-line max-h-24 overflow-hidden text-ellipsis cursor-help"
                            title={suggestion.reasoning}
                          >
                            {suggestion.reasoning}
                          </div>
                        )}
                      </div>
                      {suggestion.distance > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {suggestion.distance.toFixed(0)}m
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleSubmit}
              className="w-full"
              disabled={!amount || !selectedCategory || !currentLocation}
            >
              Log Expense
            </Button>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">€{totalSpent.toFixed(2)}</div>
              <div className="text-sm text-gray-600">{expenses.length} expenses logged</div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Expenses */}
        {expenses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {expenses.slice(0, 5).map((expense) => (
                  <div key={expense.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">€{expense.amount.toFixed(2)}</div>
                      <div className="text-sm text-gray-600">{expense.category}</div>
                      <div className="text-xs text-gray-400">
                        Lat: {expense.latitude.toFixed(4)}, Lng: {expense.longitude.toFixed(4)}
                        {expense.location && (
                          <>
                            <br />
                            <span className="italic">{expense.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">{new Date(expense.datetime).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
