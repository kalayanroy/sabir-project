import { LocationData, users, userLocationHistory } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

// Enhanced cache for location data to improve performance
// Simple implementation that stores geocoding results with timestamps
const locationCache = new Map<
  string,
  {
    data: {
      address: string;
      city: string;
      country: string;
      raw: NominatimResponse | null;
    };
    timestamp: number;
  }
>();

// Cache time - 30 days in milliseconds
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000;

// Cache cleanup interval - run every hour
const CLEANUP_INTERVAL = 60 * 60 * 1000;

// Periodically clean up old cache entries
setInterval(() => {
  const now = Date.now();
  // Use Array.from to avoid iterator issues
  Array.from(locationCache.entries()).forEach(([key, entry]) => {
    if (now - entry.timestamp > CACHE_TTL) {
      locationCache.delete(key);
    }
  });
}, CLEANUP_INTERVAL);

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
    return locationCache.get(cacheKey)!.data;
  }

  // Call the Nominatim API
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;

    console.log(`[Location] Fetching address for coordinates: ${lat}, ${lon}`);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "SecureLoginSystem/1.0",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch location data: ${response.statusText}`);
    }

    const data = (await response.json()) as NominatimResponse;

    // Process the response
    const result = {
      address: data.display_name,
      city:
        data.address.city ||
        data.address.county ||
        data.address.state ||
        "Unknown",
      country: data.address.country || "Unknown",
      raw: data,
    };

    // Cache the result with timestamp
    locationCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });

    return result;
  } catch (error) {
    console.error("Error in reverse geocoding:", error);

    // Create a fallback result
    const fallbackResult = {
      address: "Address lookup failed",
      city: "Unknown",
      country: "Unknown",
      raw: null,
    };

    // Cache the fallback result too (but with a shorter TTL - 1 hour)
    // This prevents repeated failed API calls
    locationCache.set(cacheKey, {
      data: fallbackResult,
      timestamp: Date.now() - (CACHE_TTL - 3600000), // Will expire in 1 hour
    });

    return fallbackResult;
  }
}

/**
 * Record a user's login or logout event with location data
 */
export async function recordUserLocation(
  userId: number,
  eventType: "login" | "logout",
  locationData: LocationData,
) {
  try {
    // Get user info and device info to include in location history
    const userResult = await db.select({
      username: users.username,
      email: users.email,
      deviceId: users.deviceId,
      deviceName: users.deviceName,
      deviceModel: users.deviceModel,
      devicePlatform: users.devicePlatform,
    }).from(users).where(eq(users.id, userId)).limit(1);

    const user = userResult[0];
    
    if (!user) {
      console.error(`[Location] User not found for ID: ${userId}`);
      return;
    }

    // Make sure we have coordinates
    if (!locationData.latitude || !locationData.longitude) {
      console.log(
        `[Location] No coordinates provided for user ${userId} ${eventType} event`,
      );

      // Still record the event but without location data
      await db.insert(userLocationHistory).values({
        userId,
        username: user.username,
        email: user.email,
        eventType,
        ipAddress: locationData.ipAddress,
        deviceInfo: JSON.stringify({
          timestamp: new Date().toISOString(),
          event: eventType,
          deviceId: user.deviceId || "Unknown",
          deviceName: user.deviceName || "Unknown",
          deviceModel: user.deviceModel || "Unknown",
          devicePlatform: user.devicePlatform || "Unknown",
        }),
      });

      return;
    }

    // Get location data from coordinates
    console.log(
      `[Location] Recording ${eventType} for user ${userId} at ${locationData.latitude},${locationData.longitude}`,
    );
    const geoData = await reverseGeocode(
      locationData.latitude,
      locationData.longitude,
    );

    // Record the location history
    await db.insert(userLocationHistory).values({
      userId,
      username: user.username,
      email: user.email,
      eventType,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      ipAddress: locationData.ipAddress,
      addressInfo: {
        formatted: geoData.address,
        city: geoData.city,
        country: geoData.country,
      },
      deviceInfo: JSON.stringify({
        timestamp: new Date().toISOString(),
        event: eventType,
        deviceId: user.deviceId || "Unknown",
        deviceName: user.deviceName || "Unknown",
        deviceModel: user.deviceModel || "Unknown",
        devicePlatform: user.devicePlatform || "Unknown",
        geoDetails: geoData.raw
          ? {
              osmId: geoData.raw.osm_id,
              placeId: geoData.raw.place_id,
            }
          : null,
      }),
    });

    console.log(
      `[Location] Recorded ${eventType} event for user ${userId} at ${geoData.city}, ${geoData.country}`,
    );
  } catch (error) {
    console.error("[Location] Failed to record user location:", error);
  }
}

/**
 * Get location history for a specific user with enhanced data
 * @param userId The user ID to fetch history for
 * @param limit Maximum number of records to return (default 50)
 */
export async function getUserLocationHistory(
  userId: number,
  limit: number = 50,
) {
  // Get raw records from the database with limit for better performance
  const records = await db.query.userLocationHistory.findMany({
    where: eq(userLocationHistory.userId, userId),
    orderBy: (ulh, { desc }) => [desc(ulh.timestamp)],
    limit, // Add limit to prevent large data fetches
  });

  // Process records to ensure proper formatting and data enrichment
  return records.map((record) => {
    // Parse device info if present
    let deviceInfoObj: any = {};
    try {
      if (record.deviceInfo) {
        deviceInfoObj = JSON.parse(record.deviceInfo as string);
      }
    } catch (e) {
      console.error("Error parsing device info:", e);
    }

    // Ensure addressInfo is properly formatted
    const addressInfo: any = record.addressInfo || {};

    // Get formatted location string
    let locationStr = "Unknown";
    if (addressInfo) {
      const parts: string[] = [];
      if (addressInfo.city) parts.push(addressInfo.city);
      if (addressInfo.state) parts.push(addressInfo.state);
      if (addressInfo.country) parts.push(addressInfo.country);

      if (parts.length > 0) {
        locationStr = parts.join(", ");
      } else if (addressInfo.formatted) {
        locationStr = addressInfo.formatted;
      }
    }

    // Return enhanced record with better formatted data
    return {
      ...record,
      // Convert timestamps to ISO string if they're not already
      timestamp:
        record.timestamp instanceof Date
          ? record.timestamp.toISOString()
          : record.timestamp,
      // Enhance location description
      formattedLocation: locationStr,
      // Extract device name for easier display
      deviceName: deviceInfoObj.deviceName || "Unknown Device",
      // Make sure IP is always available
      ipAddress: record.ipAddress || "Unknown IP",
    };
  });
}

/**
 * Get all users' location history (admin only)
 * @param limit Maximum number of records to return (default 100)
 */
export async function getAllUsersLocationHistory(limit: number = 100) {
  // Get raw records from the database with limits for performance
  const records = await db.query.userLocationHistory.findMany({
    orderBy: (ulh, { desc }) => [desc(ulh.timestamp)],
    limit, // Add limit to prevent large data fetches that could slow down the admin panel
  });

  // Process records for consistency - same enhancement as getUserLocationHistory
  return records.map((record) => {
    // Parse device info if present
    let deviceInfoObj: any = {};
    try {
      if (record.deviceInfo) {
        deviceInfoObj = JSON.parse(record.deviceInfo as string);
      }
    } catch (e) {
      console.error("Error parsing device info:", e);
    }

    // Ensure addressInfo is properly formatted
    const addressInfo: any = record.addressInfo || {};

    // Get formatted location string
    let locationStr = "Unknown";
    if (addressInfo) {
      const parts: string[] = [];
      if (addressInfo.city) parts.push(addressInfo.city);
      if (addressInfo.state) parts.push(addressInfo.state);
      if (addressInfo.country) parts.push(addressInfo.country);

      if (parts.length > 0) {
        locationStr = parts.join(", ");
      } else if (addressInfo.formatted) {
        locationStr = addressInfo.formatted;
      }
    }

    // Return enhanced record with better formatted data
    return {
      ...record,
      // Convert timestamps to ISO string if they're not already
      timestamp:
        record.timestamp instanceof Date
          ? record.timestamp.toISOString()
          : record.timestamp,
      // Enhance location description
      formattedLocation: locationStr,
      // Extract device name for easier display
      deviceName: deviceInfoObj.deviceName || "Unknown Device",
      // Make sure IP is always available
      ipAddress: record.ipAddress || "Unknown IP",
    };
  });
}
