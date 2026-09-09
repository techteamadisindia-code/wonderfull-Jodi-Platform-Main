export interface CityLocation {
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: number; // UTC offset in hours, e.g., 5.5 for IST
}

export const CITIES_DATABASE: CityLocation[] = [
  // Maharashtra (Primary region for Wonderful Jodi)
  { city: 'Pune', state: 'Maharashtra', country: 'India', latitude: 18.5204, longitude: 73.8567, timezone: 5.5 },
  { city: 'Mumbai', state: 'Maharashtra', country: 'India', latitude: 19.076, longitude: 72.8777, timezone: 5.5 },
  { city: 'Nagpur', state: 'Maharashtra', country: 'India', latitude: 21.1458, longitude: 79.0882, timezone: 5.5 },
  { city: 'Nashik', state: 'Maharashtra', country: 'India', latitude: 19.9975, longitude: 73.7898, timezone: 5.5 },
  { city: 'Chhatrapati Sambhajinagar', state: 'Maharashtra', country: 'India', latitude: 19.8762, longitude: 75.3433, timezone: 5.5 },
  { city: 'Aurangabad', state: 'Maharashtra', country: 'India', latitude: 19.8762, longitude: 75.3433, timezone: 5.5 },
  { city: 'Thane', state: 'Maharashtra', country: 'India', latitude: 19.2183, longitude: 72.9781, timezone: 5.5 },
  { city: 'Pimpri-Chinchwad', state: 'Maharashtra', country: 'India', latitude: 18.6298, longitude: 73.7997, timezone: 5.5 },
  { city: 'Kolhapur', state: 'Maharashtra', country: 'India', latitude: 16.705, longitude: 74.2433, timezone: 5.5 },
  { city: 'Solapur', state: 'Maharashtra', country: 'India', latitude: 17.6599, longitude: 75.9064, timezone: 5.5 },
  { city: 'Navi Mumbai', state: 'Maharashtra', country: 'India', latitude: 19.033, longitude: 73.0297, timezone: 5.5 },
  { city: 'Jalgaon', state: 'Maharashtra', country: 'India', latitude: 21.0077, longitude: 75.5626, timezone: 5.5 },
  { city: 'Amravati', state: 'Maharashtra', country: 'India', latitude: 20.9374, longitude: 77.7796, timezone: 5.5 },
  { city: 'Nanded', state: 'Maharashtra', country: 'India', latitude: 19.1383, longitude: 77.321, timezone: 5.5 },
  { city: 'Sangli', state: 'Maharashtra', country: 'India', latitude: 16.8524, longitude: 74.5815, timezone: 5.5 },
  { city: 'Satara', state: 'Maharashtra', country: 'India', latitude: 17.6805, longitude: 73.9997, timezone: 5.5 },
  { city: 'Ahmednagar', state: 'Maharashtra', country: 'India', latitude: 19.0948, longitude: 74.748, timezone: 5.5 },
  { city: 'Akola', state: 'Maharashtra', country: 'India', latitude: 20.7002, longitude: 77.0082, timezone: 5.5 },
  { city: 'Latur', state: 'Maharashtra', country: 'India', latitude: 18.4088, longitude: 76.5604, timezone: 5.5 },
  { city: 'Dhule', state: 'Maharashtra', country: 'India', latitude: 20.9042, longitude: 74.7749, timezone: 5.5 },
  { city: 'Chandrapur', state: 'Maharashtra', country: 'India', latitude: 19.9615, longitude: 79.2961, timezone: 5.5 },
  { city: 'Parbhani', state: 'Maharashtra', country: 'India', latitude: 19.2686, longitude: 76.7708, timezone: 5.5 },
  { city: 'Kalyan', state: 'Maharashtra', country: 'India', latitude: 19.2437, longitude: 73.1355, timezone: 5.5 },
  { city: 'Panvel', state: 'Maharashtra', country: 'India', latitude: 18.9894, longitude: 73.1175, timezone: 5.5 },

  // Key Metros and Major National Medical Centers
  { city: 'New Delhi', state: 'Delhi', country: 'India', latitude: 28.6139, longitude: 77.209, timezone: 5.5 },
  { city: 'Delhi', state: 'Delhi', country: 'India', latitude: 28.6139, longitude: 77.209, timezone: 5.5 },
  { city: 'Bengaluru', state: 'Karnataka', country: 'India', latitude: 12.9716, longitude: 77.5946, timezone: 5.5 },
  { city: 'Bangalore', state: 'Karnataka', country: 'India', latitude: 12.9716, longitude: 77.5946, timezone: 5.5 },
  { city: 'Hyderabad', state: 'Telangana', country: 'India', latitude: 17.385, longitude: 78.4867, timezone: 5.5 },
  { city: 'Chennai', state: 'Tamil Nadu', country: 'India', latitude: 13.0827, longitude: 80.2707, timezone: 5.5 },
  { city: 'Kolkata', state: 'West Bengal', country: 'India', latitude: 22.5726, longitude: 88.3639, timezone: 5.5 },
  { city: 'Ahmedabad', state: 'Gujarat', country: 'India', latitude: 23.0225, longitude: 72.5714, timezone: 5.5 },
  { city: 'Jaipur', state: 'Rajasthan', country: 'India', latitude: 26.9124, longitude: 75.7873, timezone: 5.5 },
  { city: 'Surat', state: 'Gujarat', country: 'India', latitude: 21.1702, longitude: 72.8311, timezone: 5.5 },
  { city: 'Lucknow', state: 'Uttar Pradesh', country: 'India', latitude: 26.8467, longitude: 80.9462, timezone: 5.5 },
  { city: 'Kanpur', state: 'Uttar Pradesh', country: 'India', latitude: 26.4499, longitude: 80.3319, timezone: 5.5 },
  { city: 'Indore', state: 'Madhya Pradesh', country: 'India', latitude: 22.7196, longitude: 75.8577, timezone: 5.5 },
  { city: 'Bhopal', state: 'Madhya Pradesh', country: 'India', latitude: 23.2599, longitude: 77.4126, timezone: 5.5 },
  { city: 'Patna', state: 'Bihar', country: 'India', latitude: 25.5941, longitude: 85.1376, timezone: 5.5 },
  { city: 'Vadodara', state: 'Gujarat', country: 'India', latitude: 22.3072, longitude: 73.1812, timezone: 5.5 },
  { city: 'Ludhiana', state: 'Punjab', country: 'India', latitude: 30.901, longitude: 75.8573, timezone: 5.5 },
  { city: 'Agra', state: 'Uttar Pradesh', country: 'India', latitude: 27.1767, longitude: 78.0081, timezone: 5.5 },
  { city: 'Varanasi', state: 'Uttar Pradesh', country: 'India', latitude: 25.3176, longitude: 82.9739, timezone: 5.5 },
  { city: 'Visakhapatnam', state: 'Andhra Pradesh', country: 'India', latitude: 17.6868, longitude: 83.2185, timezone: 5.5 },
  { city: 'Coimbatore', state: 'Tamil Nadu', country: 'India', latitude: 11.0168, longitude: 76.9558, timezone: 5.5 },
  { city: 'Vijayawada', state: 'Andhra Pradesh', country: 'India', latitude: 16.5062, longitude: 80.648, timezone: 5.5 },
  { city: 'Jodhpur', state: 'Rajasthan', country: 'India', latitude: 26.2389, longitude: 73.0243, timezone: 5.5 },
  { city: 'Madurai', state: 'Tamil Nadu', country: 'India', latitude: 9.9252, longitude: 78.1198, timezone: 5.5 },
  { city: 'Raipur', state: 'Chhattisgarh', country: 'India', latitude: 21.2514, longitude: 81.6296, timezone: 5.5 },
  { city: 'Kota', state: 'Rajasthan', country: 'India', latitude: 25.2138, longitude: 75.8648, timezone: 5.5 },
  { city: 'Chandigarh', state: 'Chandigarh', country: 'India', latitude: 30.7333, longitude: 76.7794, timezone: 5.5 },
  { city: 'Guwahati', state: 'Assam', country: 'India', latitude: 26.1445, longitude: 91.7362, timezone: 5.5 },
  { city: 'Mysore', state: 'Karnataka', country: 'India', latitude: 12.2958, longitude: 76.6394, timezone: 5.5 },
  { city: 'Hubli', state: 'Karnataka', country: 'India', latitude: 15.3647, longitude: 75.124, timezone: 5.5 },
  { city: 'Bareilly', state: 'Uttar Pradesh', country: 'India', latitude: 28.367, longitude: 79.4304, timezone: 5.5 },
  { city: 'Aligarh', state: 'Uttar Pradesh', country: 'India', latitude: 27.8974, longitude: 78.088, timezone: 5.5 },
  { city: 'Gurugram', state: 'Haryana', country: 'India', latitude: 28.4595, longitude: 77.0266, timezone: 5.5 },
  { city: 'Gurgaon', state: 'Haryana', country: 'India', latitude: 28.4595, longitude: 77.0266, timezone: 5.5 },
  { city: 'Noida', state: 'Uttar Pradesh', country: 'India', latitude: 28.5355, longitude: 77.391, timezone: 5.5 },
  { city: 'Jalandhar', state: 'Punjab', country: 'India', latitude: 31.326, longitude: 75.5762, timezone: 5.5 },
  { city: 'Bhubaneswar', state: 'Odisha', country: 'India', latitude: 20.2961, longitude: 85.8245, timezone: 5.5 },
  { city: 'Salem', state: 'Tamil Nadu', country: 'India', latitude: 11.6643, longitude: 78.146, timezone: 5.5 },
  { city: 'Warangal', state: 'Telangana', country: 'India', latitude: 17.9689, longitude: 79.5941, timezone: 5.5 },
  { city: 'Thiruvananthapuram', state: 'Kerala', country: 'India', latitude: 8.5241, longitude: 76.9366, timezone: 5.5 },
  { city: 'Kochi', state: 'Kerala', country: 'India', latitude: 9.9312, longitude: 76.2673, timezone: 5.5 },
  { city: 'Kozhikode', state: 'Kerala', country: 'India', latitude: 11.2588, longitude: 75.7804, timezone: 5.5 },
  { city: 'Mangalore', state: 'Karnataka', country: 'India', latitude: 12.9141, longitude: 74.856, timezone: 5.5 },
  { city: 'Dehradun', state: 'Uttarakhand', country: 'India', latitude: 30.3165, longitude: 78.0322, timezone: 5.5 },
  { city: 'Ranchi', state: 'Jharkhand', country: 'India', latitude: 23.3441, longitude: 85.3096, timezone: 5.5 },
  { city: 'Gwalior', state: 'Madhya Pradesh', country: 'India', latitude: 26.2183, longitude: 78.1828, timezone: 5.5 },
  { city: 'Jabalpur', state: 'Madhya Pradesh', country: 'India', latitude: 23.1815, longitude: 79.9864, timezone: 5.5 },
  { city: 'Udaipur', state: 'Rajasthan', country: 'India', latitude: 24.5854, longitude: 73.7125, timezone: 5.5 },
  { city: 'Goa (Panaji)', state: 'Goa', country: 'India', latitude: 15.4909, longitude: 73.8278, timezone: 5.5 },
];

/**
 * Resolve geographic place string into structured location with coordinates and timezone.
 * Defaults to Pune, Maharashtra if empty, or provides closest city match.
 */
export function resolveBirthLocation(inputPlace?: string): CityLocation {
  if (!inputPlace || typeof inputPlace !== 'string' || inputPlace.trim().length === 0) {
    return CITIES_DATABASE[0]; // Default Pune, Maharashtra, India
  }

  const query = inputPlace.toLowerCase().trim();

  // 1. Exact match on city
  const exact = CITIES_DATABASE.find((c) => c.city.toLowerCase() === query);
  if (exact) return exact;

  // 2. City + State match (e.g. "Pune, Maharashtra")
  const cityState = CITIES_DATABASE.find((c) =>
    query.includes(c.city.toLowerCase()) && query.includes(c.state.toLowerCase())
  );
  if (cityState) return cityState;

  // 3. Query contains city name
  const cityMatch = CITIES_DATABASE.find((c) => query.includes(c.city.toLowerCase()));
  if (cityMatch) return cityMatch;

  // 4. Query matches state name
  const stateMatch = CITIES_DATABASE.find((c) => query.includes(c.state.toLowerCase()));
  if (stateMatch) return stateMatch;

  // 5. Fallback: Parse city text, provide standard Indian standard timezone coordinates (Pune reference)
  const parts = inputPlace.split(',').map((p) => p.trim());
  return {
    city: parts[0] || 'Pune',
    state: parts[1] || 'Maharashtra',
    country: parts[2] || 'India',
    latitude: 18.5204,
    longitude: 73.8567,
    timezone: 5.5,
  };
}

/**
 * Search cities for autocomplete suggestions
 */
export function searchCities(searchQuery: string): CityLocation[] {
  if (!searchQuery || searchQuery.trim().length < 2) {
    return CITIES_DATABASE.slice(0, 10);
  }
  const q = searchQuery.toLowerCase().trim();
  return CITIES_DATABASE.filter(
    (c) =>
      c.city.toLowerCase().includes(q) ||
      c.state.toLowerCase().includes(q) ||
      `${c.city}, ${c.state}`.toLowerCase().includes(q)
  ).slice(0, 15);
}
