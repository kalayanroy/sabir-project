import { db } from "./db";
import {
  attendance,
  workLocations,
  userWorkLocations,
  userLocationHistory,
  users,
  Attendance,
  WorkLocation,
  InsertAttendance,
} from "@shared/schema";
import { and, eq, gte, lt, sql } from "drizzle-orm";

// Distance calculation using Haversine formula (for calculating distance between coordinates)
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Check if user is within the geofence radius of a work location
export function isWithinGeofence(
  userLat: number,
  userLon: number,
  locationLat: number,
  locationLon: number,
  radiusMeters: number,
): boolean {
  const distance = calculateDistance(
    userLat,
    userLon,
    locationLat,
    locationLon,
  );
  return distance <= radiusMeters;
}

/**
 * Get all work locations
 */
export async function getAllWorkLocations(): Promise<WorkLocation[]> {
  return db.select().from(workLocations);
}

/**
 * Get work locations assigned to a specific user
 */
export async function getUserWorkLocations(
  userId: number,
): Promise<WorkLocation[]> {
  return db
    .select({
      id: workLocations.id,
      name: workLocations.name,
      description: workLocations.description,
      address: workLocations.address,
      latitude: workLocations.latitude,
      longitude: workLocations.longitude,
      radius: workLocations.radius,
      createdAt: workLocations.createdAt,
      updatedAt: workLocations.updatedAt,
    })
    .from(userWorkLocations)
    .innerJoin(
      workLocations,
      eq(userWorkLocations.locationId, workLocations.id),
    )
    .where(eq(userWorkLocations.userId, userId));
}

/**
 * Create a new work location
 */
export async function createWorkLocation(
  location: Omit<WorkLocation, "id" | "createdAt" | "updatedAt">,
): Promise<WorkLocation> {
  const [newLocation] = await db
    .insert(workLocations)
    .values({
      ...location,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return newLocation;
}

/**
 * Get all user-location assignments
 */
export async function getAllUserLocationAssignments(): Promise<any[]> {
  try {
    // Check if the tables exist before querying
    const assignments = await db
      .select({
        id: userWorkLocations.id,
        userId: userWorkLocations.userId,
        locationId: userWorkLocations.locationId,
        assignedAt: userWorkLocations.assignedAt,
        userName: users.username,
        userEmail: users.email,
        locationName: workLocations.name,
        locationAddress: workLocations.address,
      })
      .from(userWorkLocations)
      .innerJoin(users, eq(userWorkLocations.userId, users.id))
      .innerJoin(
        workLocations,
        eq(userWorkLocations.locationId, workLocations.id),
      );

    return assignments;
  } catch (error) {
    console.error("Error getting user location assignments:", error);
    return [];
  }
}

/**
 * Assign a user to a work location
 */
export async function assignUserToWorkLocation(
  userId: number,
  locationId: number,
): Promise<boolean> {
  try {
    // Check if the assignment already exists
    const existing = await db
      .select()
      .from(userWorkLocations)
      .where(
        and(
          eq(userWorkLocations.userId, userId),
          eq(userWorkLocations.locationId, locationId),
        ),
      );

    if (existing.length > 0) {
      return true; // Already assigned
    }

    // Create new assignment
    await db.insert(userWorkLocations).values({
      userId,
      locationId,
      assignedAt: new Date(),
    });

    return true;
  } catch (error) {
    console.error("Error assigning user to work location:", error);
    return false;
  }
}

/**
 * Clock in a user at their assigned work location
 */
export async function clockIn(
  userId: number,
  latitude: number,
  longitude: number,
): Promise<{
  success: boolean;
  message: string;
  attendance?: Attendance;
  isLate?: boolean;
  lateMinutes?: number;
}> {
  try {
    // Check if user is already clocked in for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.userId, userId),
          gte(attendance.date, today),
          lt(attendance.date, tomorrow),
          sql`${attendance.clockOutTime} IS NULL`,
        ),
      );

    if (existingAttendance.length > 0) {
      return {
        success: false,
        message: "You are already clocked in today.",
      };
    }

    // Get user's assigned work locations
    const userLocations = await getUserWorkLocations(userId);

    if (userLocations.length === 0) {
      return {
        success: false,
        message: "You don't have any assigned work locations.",
      };
    }

    // Find the closest work location
    let closestLocation: WorkLocation | null = null;
    let minDistance = Number.MAX_VALUE;

    for (const location of userLocations) {
      const distance = calculateDistance(
        latitude,
        longitude,
        location.latitude,
        location.longitude,
      );

      if (distance < minDistance) {
        minDistance = distance;
        closestLocation = location;
      }
    }

    if (!closestLocation) {
      return {
        success: false,
        message: "Could not determine your work location.",
      };
    }

    // Check if user is within geofence
    const withinGeofence = isWithinGeofence(
      latitude,
      longitude,
      closestLocation.latitude || 0,
      closestLocation.longitude || 0,
      closestLocation.radius || 100,
    );

    // Record location history entry for this clock-in
    const [locationEntry] = await db
      .insert(userLocationHistory)
      .values({
        userId,
        eventType: "clock-in",
        latitude,
        longitude,
        addressInfo: {
          note: `Clock-in at ${closestLocation.name}`,
        },
        deviceInfo: JSON.stringify({
          timestamp: new Date().toISOString(),
          event: "clock-in",
          locationName: closestLocation.name,
          withinGeofence,
        }),
      })
      .returning();

    const clockInLocationId = locationEntry.id;

    // Create attendance record
    const now = new Date();

    // Check if user is late (after 9:00 AM)
    const startTime = new Date(now);
    startTime.setHours(9, 0, 0, 0); // 9:00 AM

    const isLate = now > startTime;
    let lateMinutes = 0;
    let status = withinGeofence ? "present" : "present-remote";

    if (isLate) {
      // Calculate minutes late
      lateMinutes = Math.floor(
        (now.getTime() - startTime.getTime()) / (1000 * 60),
      );
      status = "late";
    }

    const [attendanceRecord] = await db
      .insert(attendance)
      .values({
        userId,
        workLocationId: closestLocation.id,
        clockInTime: now,
        status: status,
        notes: isLate ? `Late by ${lateMinutes} minutes` : undefined,
        isWithinGeofence: withinGeofence,
        clockInLocationId: locationEntry.id,
        date: today,
      })
      .returning();

    let message = `Successfully clocked in at ${closestLocation.name}`;
    if (!withinGeofence) {
      message += " (outside geofence)";
    }
    if (isLate) {
      message += `. Late by: ${lateMinutes} minutes`;
    }

    return {
      success: true,
      message: message,
      attendance: attendanceRecord,
      isLate,
      lateMinutes,
    };
  } catch (error) {
    console.error("Error during clock in:", error);
    return {
      success: false,
      message: "An error occurred during clock in.",
    };
  }
}

/**
 * Clock out a user
 */
export async function clockOut(
  userId: number,
  latitude: number,
  longitude: number,
): Promise<{ success: boolean; message: string; attendance?: Attendance }> {
  try {
    // Check if user is clocked in
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.userId, userId),
          gte(attendance.date, today),
          lt(attendance.date, tomorrow),
          sql`${attendance.clockOutTime} IS NULL`,
        ),
      );

    if (existingAttendance.length === 0) {
      return {
        success: false,
        message: "You are not clocked in today.",
      };
    }

    const attendanceRecord = existingAttendance[0];

    // Get the work location
    const [workLocation] = await db
      .select()
      .from(workLocations)
      .where(eq(workLocations.id, attendanceRecord.workLocationId));

    if (!workLocation) {
      return {
        success: false,
        message: "Work location not found.",
      };
    }

    // Check if user is within geofence
    const withinGeofence = isWithinGeofence(
      latitude,
      longitude,
      workLocation.latitude || 0,
      workLocation.longitude || 0,
      workLocation.radius || 100,
    );

    // Record location history entry for this clock-out
    const [locationEntry] = await db
      .insert(userLocationHistory)
      .values({
        userId,
        eventType: "clock-out",
        latitude,
        longitude,
        addressInfo: {
          note: `Clock-out from ${workLocation.name}`,
        },
        deviceInfo: JSON.stringify({
          timestamp: new Date().toISOString(),
          event: "clock-out",
          locationName: workLocation.name,
          withinGeofence,
        }),
      })
      .returning();

    // Update attendance record
    const now = new Date();
    const clockInTime = new Date(attendanceRecord.clockInTime);
    const totalHoursWorked =
      (now.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

    const [updatedAttendance] = await db
      .update(attendance)
      .set({
        clockOutTime: now,
        clockOutLocationId: locationEntry.id,
        totalHours: totalHoursWorked,
      })
      .where(eq(attendance.id, attendanceRecord.id))
      .returning();

    return {
      success: true,
      message: `Successfully clocked out from ${workLocation.name}. Total hours: ${totalHoursWorked.toFixed(2)}`,
      attendance: updatedAttendance,
    };
  } catch (error) {
    console.error("Error during clock out:", error);
    return {
      success: false,
      message: "An error occurred during clock out.",
    };
  }
}

/**
 * Get attendance records for a specific user
 */
export async function getUserAttendance(
  userId: number,
  startDate?: Date,
  endDate?: Date,
  limit: number = 30,
): Promise<Attendance[]> {
  try {
    // Build the conditions for the query
    let conditions = eq(attendance.userId, userId);

    // Add date range conditions if provided
    if (startDate && endDate) {
      conditions = and(
        conditions,
        gte(attendance.date, startDate),
        lt(attendance.date, endDate),
      );
    } else {
      // Use default conditions if no date range provided
      // This ensures conditions is always SQL<unknown> and never undefined
      conditions = and(conditions);
    }

    // Execute the query with all conditions in a single where clause
    return await db
      .select()
      .from(attendance)
      .where(conditions)
      .orderBy(sql`${attendance.date} DESC`)
      .limit(limit);
  } catch (error) {
    console.error("Error fetching user attendance:", error);
    return [];
  }
}

/**
 * Get all attendance records (admin only)
 */
export async function getAllAttendance(
  startDate?: Date,
  endDate?: Date,
  limit: number = 100,
): Promise<any[]> {
  try {
    // Create a base query with filtering
    let baseQuery;

    if (startDate && endDate) {
      baseQuery = db
        .select()
        .from(attendance)
        .where(
          and(gte(attendance.date, startDate), lt(attendance.date, endDate)),
        );
    } else {
      baseQuery = db.select().from(attendance);
    }

    // Execute the core query first to get attendance records
    const records = await baseQuery
      .orderBy(sql`${attendance.date} DESC`)
      .limit(limit);

    // Now enhance the records with user and location data
    const enhancedRecords = await Promise.all(
      records.map(async (record) => {
        //console.log("Processing record:", record);
        // Get user data
        const [userData] = record.userId
          ? await db.select().from(users).where(eq(users.id, record.userId))
          : [];

        // Get location data
        const [locationData] = record.workLocationId
          ? await db
              .select()
              .from(workLocations)
              .where(eq(workLocations.id, record.workLocationId))
          : [];
        let formattedAddress = locationData?.address || "";
        console.log("Record ClockIN:", record.clockInLocationId);
        if (record.clockInLocationId) {
          const [locationHistory] = await db
            .select()
            .from(userLocationHistory)
            .where(eq(userLocationHistory.id, record.clockInLocationId));
          console.log("Location history:", locationHistory);

          if (locationHistory?.addressInfo) {
            // Extract formatted address from addressInfo
            const addressInfo =
              typeof locationHistory.addressInfo === "string"
                ? JSON.parse(locationHistory.addressInfo)
                : locationHistory.addressInfo;
            console.log("Location Address:", addressInfo);
            if (addressInfo?.formatted) {
              formattedAddress = addressInfo.formatted;
            }
          }
        }
        return {
          ...record,
          userName: userData?.username,
          userEmail: userData?.email,
          locationName: locationData?.name,
          locationAddress: locationData?.address,
        };
      }),
    );

    return enhancedRecords;
  } catch (error) {
    console.error("Error fetching all attendance records:", error);
    return [];
  }
}

/**
 * Calculate user work statistics (admin only)
 */
export async function getUserWorkStats(
  userId: number,
  startDate?: Date,
  endDate?: Date,
): Promise<{
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  totalHours: number;
  averageHoursPerDay: number;
}> {
  try {
    // Set default date range to current month if not provided
    if (!startDate || !endDate) {
      const today = new Date();
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }

    // Get attendance records for the specified period
    const records = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.userId, userId),
          gte(attendance.date, startDate),
          lt(attendance.date, endDate),
        ),
      );

    // Calculate statistics
    const totalDays = records.length;
    const presentDays = records.filter((r) => r.status === "present").length;
    const absentDays = records.filter((r) => r.status === "absent").length;
    const lateDays = records.filter((r) => r.status === "late").length;

    // Calculate total hours
    let totalHours = 0;
    records.forEach((record) => {
      if (record.totalHours) {
        totalHours += record.totalHours;
      }
    });

    // Calculate average hours per day
    const averageHoursPerDay = totalDays > 0 ? totalHours / totalDays : 0;

    return {
      totalDays,
      presentDays,
      absentDays,
      lateDays,
      totalHours,
      averageHoursPerDay,
    };
  } catch (error) {
    console.error("Error calculating user work stats:", error);
    return {
      totalDays: 0,
      presentDays: 0,
      absentDays: 0,
      lateDays: 0,
      totalHours: 0,
      averageHoursPerDay: 0,
    };
  }
}
