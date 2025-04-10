import { LocationData } from "@shared/schema";
import { db } from "./db";
import { userLocationHistory } from "@shared/schema";
import { eq } from "drizzle-orm";

// Cache for location data to avoid frequent API calls to the same coordinates
const locationCache = new Map<string, any>();

/**
 * Interface for the Nominatim API response
 */
interface NominatimResponse {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address: {
    road?: string;
    suburb?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
  boundingbox: string[];
}

/**
 * Fetch location address data from Nominatim Reverse Geocoding API
 */
export async function reverseGeocode(latitude: number, longitude: number) {
  // Format coordinates to 6 decimal places
  const lat = latitude.toFixed(6);
  const lon = longitude.toFixed(6);
  
  // Generate cache key
  const cacheKey = `${lat},${lon}`;
  
  // Check cache first
  if (locationCache.has(cacheKey)) {
    console.log(`[Location] Using cached data for ${cacheKey}`);
    return locationCache.get(cacheKey);
  }
  
  // Call the Nominatim API
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    
    console.log(`[Location] Fetching address for coordinates: ${lat}, ${lon}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SecureLoginSystem/1.0',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch location data: ${response.statusText}`);
    }
    
    const data = await response.json() as NominatimResponse;
    
    // Process the response
    const result = {
      address: data.display_name,
      city: data.address.city || data.address.county || data.address.state || 'Unknown',
      country: data.address.country || 'Unknown',
      raw: data
    };
    
    // Cache the result (valid for 24 hours)
    locationCache.set(cacheKey, result);
    
    // Clean up old cache entries after 24 hours
    setTimeout(() => {
      locationCache.delete(cacheKey);
    }, 24 * 60 * 60 * 1000);
    
    return result;
  } catch (error) {
    console.error('Error in reverse geocoding:', error);
    return {
      address: 'Address lookup failed',
      city: 'Unknown',
      country: 'Unknown',
      raw: null
    };
  }
}

/**
 * Record a user's login or logout event with location data
 */
export async function recordUserLocation(
  userId: number,
  eventType: 'login' | 'logout',
  locationData: LocationData
) {
  try {
    // Make sure we have coordinates
    if (!locationData.latitude || !locationData.longitude) {
      console.log(`[Location] No coordinates provided for user ${userId} ${eventType} event`);
      
      // Still record the event but without location data
      await db.insert(userLocationHistory).values({
        userId,
        eventType,
        ipAddress: locationData.ipAddress,
        deviceInfo: JSON.stringify({
          timestamp: new Date().toISOString(),
          event: eventType
        })
      });
      
      return;
    }
    
    // Get location data from coordinates
    console.log(`[Location] Recording ${eventType} for user ${userId} at ${locationData.latitude},${locationData.longitude}`);
    const geoData = await reverseGeocode(locationData.latitude, locationData.longitude);
    
    // Record the location history
    await db.insert(userLocationHistory).values({
      userId,
      eventType,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      ipAddress: locationData.ipAddress,
      locationAddress: geoData.address,
      city: geoData.city,
      country: geoData.country,
      deviceInfo: JSON.stringify({
        timestamp: new Date().toISOString(),
        event: eventType,
        geoDetails: geoData.raw ? { 
          osmId: geoData.raw.osm_id,
          placeId: geoData.raw.place_id
        } : null
      })
    });
    
    console.log(`[Location] Recorded ${eventType} event for user ${userId} at ${geoData.city}, ${geoData.country}`);
    
  } catch (error) {
    console.error('[Location] Failed to record user location:', error);
  }
}

/**
 * Get location history for a specific user
 */
export async function getUserLocationHistory(userId: number) {
  return await db
    .select()
    .from(userLocationHistory)
    .where(eq(userLocationHistory.userId, userId))
    .orderBy({ timestamp: 'desc' });
}

/**
 * Get all users' location history (admin only)
 */
export async function getAllUsersLocationHistory() {
  return await db
    .select()
    .from(userLocationHistory)
    .orderBy({ timestamp: 'desc' });
}