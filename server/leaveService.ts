import { db } from "./db";
import { leaveTypes, leaveBalances, leaveRequests, users } from "@shared/schema";
import { 
  LeaveType, InsertLeaveType, 
  LeaveBalance, InsertLeaveBalance, 
  LeaveRequest, InsertLeaveRequest 
} from "@shared/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { differenceInBusinessDays, format, getYear, isWeekend } from "date-fns";

/**
 * Get all leave types available in the system
 */
export async function getAllLeaveTypes(): Promise<LeaveType[]> {
  return await db.select().from(leaveTypes).orderBy(leaveTypes.name);
}

/**
 * Create a new leave type
 */
export async function createLeaveType(data: InsertLeaveType): Promise<LeaveType> {
  const [leaveType] = await db.insert(leaveTypes).values(data).returning();
  return leaveType;
}

/**
 * Update a leave type
 */
export async function updateLeaveType(id: number, data: Partial<LeaveType>): Promise<LeaveType | undefined> {
  const [updatedLeaveType] = await db
    .update(leaveTypes)
    .set(data)
    .where(eq(leaveTypes.id, id))
    .returning();
  return updatedLeaveType;
}

/**
 * Delete a leave type (only if not actively used)
 */
export async function deleteLeaveType(id: number): Promise<boolean> {
  // Check if leave type has any approved or pending leave requests
  const activeRequestCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(leaveRequests)
    .where(and(
      eq(leaveRequests.leaveTypeId, id),
      sql`${leaveRequests.status} IN ('pending', 'approved')`
    ));
  
  // Check if leave type has any leave balances with used days > 0
  const usedBalanceCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(leaveBalances)
    .where(and(
      eq(leaveBalances.leaveTypeId, id),
      sql`${leaveBalances.usedDays} > 0`
    ));
  
  if (activeRequestCount[0].count > 0) {
    throw new Error("Cannot delete leave type with pending or approved leave requests");
  }
  
  if (usedBalanceCount[0].count > 0) {
    throw new Error("Cannot delete leave type that has been used by employees");
  }
  
  // Delete related unused leave balances first
  await db.delete(leaveBalances).where(eq(leaveBalances.leaveTypeId, id));
  
  // Delete the leave type
  await db.delete(leaveTypes).where(eq(leaveTypes.id, id));
  return true;
}

/**
 * Get leave balances for a specific user
 */
export async function getUserLeaveBalances(userId: number, year: number = new Date().getFullYear()): Promise<any[]> {
  const result = await db
    .select({
      id: leaveBalances.id,
      userId: leaveBalances.userId,
      leaveTypeId: leaveBalances.leaveTypeId,
      leaveTypeName: leaveTypes.name,
      leaveTypeColor: leaveTypes.color,
      year: leaveBalances.year,
      totalDays: leaveBalances.totalDays,
      usedDays: leaveBalances.usedDays,
      pendingDays: leaveBalances.pendingDays,
      remainingDays: sql<number>`${leaveBalances.totalDays} - ${leaveBalances.usedDays}`,
      updatedAt: leaveBalances.updatedAt
    })
    .from(leaveBalances)
    .innerJoin(leaveTypes, eq(leaveBalances.leaveTypeId, leaveTypes.id))
    .where(and(
      eq(leaveBalances.userId, userId),
      eq(leaveBalances.year, year)
    ));
    
  return result;
}

/**
 * Initialize or update leave balances for a user
 */
export async function initializeUserLeaveBalances(userId: number, year: number = new Date().getFullYear()): Promise<LeaveBalance[]> {
  // Get all leave types
  const allLeaveTypes = await getAllLeaveTypes();
  
  // Check existing balances
  const existingBalances = await db
    .select()
    .from(leaveBalances)
    .where(and(
      eq(leaveBalances.userId, userId),
      eq(leaveBalances.year, year)
    ));
  
  const existingTypeIds = existingBalances.map(balance => balance.leaveTypeId);
  
  // Create missing balances
  const newBalances = allLeaveTypes
    .filter(type => !existingTypeIds.includes(type.id))
    .map(type => ({
      userId,
      leaveTypeId: type.id,
      year,
      totalDays: type.allowedDays,
      usedDays: 0,
      pendingDays: 0
    }));
  
  if (newBalances.length > 0) {
    await db.insert(leaveBalances).values(newBalances);
  }
  
  // Return complete set of balances for the user
  const updatedBalances = await db
    .select({
      ...leaveBalances
    })
    .from(leaveBalances)
    .where(and(
      eq(leaveBalances.userId, userId),
      eq(leaveBalances.year, year)
    ));
    
  return updatedBalances;
}

/**
 * Update leave balance for a user
 */
export async function updateLeaveBalance(id: number, data: Partial<LeaveBalance>): Promise<LeaveBalance | undefined> {
  const [updatedBalance] = await db
    .update(leaveBalances)
    .set(data)
    .where(eq(leaveBalances.id, id))
    .returning();
  return updatedBalance;
}

/**
 * Calculate business days between two dates (excluding weekends)
 */
export function calculateLeaveDays(startDate: Date, endDate: Date): number {
  // Business days excluding weekends
  return differenceInBusinessDays(endDate, startDate) + (isWeekend(endDate) ? 0 : 1);
}

/**
 * Create a new leave request
 */
export async function createLeaveRequest(data: Omit<InsertLeaveRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; message: string; request?: LeaveRequest }> {
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  
  // Validate dates
  if (startDate > endDate) {
    return { success: false, message: "Start date must be before end date" };
  }
  
  // Get current year for both dates
  const startYear = getYear(startDate);
  const endYear = getYear(endDate);
  
  // Cross-year leave requests are not yet supported
  if (startYear !== endYear) {
    return { success: false, message: "Leave requests across different years are not supported" };
  }
  
  // Recalculate days to ensure accuracy
  const leaveDays = calculateLeaveDays(startDate, endDate);
  
  // Check leave balance
  const balances = await getUserLeaveBalances(data.userId, startYear);
  const leaveBalance = balances.find(balance => balance.leaveTypeId === data.leaveTypeId);
  
  if (!leaveBalance) {
    return { success: false, message: "No leave balance found for this leave type" };
  }
  
  // Handle null values safely
  const usedDays = leaveBalance.usedDays || 0;
  const pendingDays = leaveBalance.pendingDays || 0;
  const availableDays = leaveBalance.totalDays - usedDays - pendingDays;
  
  if (leaveDays > availableDays) {
    return { success: false, message: `Insufficient leave balance. Available: ${availableDays} days, Requested: ${leaveDays} days` };
  }
  
  // Check for overlapping leave requests
  const overlappingRequests = await db
    .select()
    .from(leaveRequests)
    .where(and(
      eq(leaveRequests.userId, data.userId),
      sql`${leaveRequests.status} IN ('pending', 'approved')`,
      sql`${leaveRequests.startDate} <= ${endDate}`,
      sql`${leaveRequests.endDate} >= ${startDate}`
    ));
  
  if (overlappingRequests.length > 0) {
    return { success: false, message: "You already have an overlapping leave request for this period" };
  }
  
  try {
    // Begin transaction
    const [leaveRequest] = await db.transaction(async (tx) => {
      // Insert leave request with validated data
      const dataToInsert = {
        userId: data.userId,
        leaveTypeId: data.leaveTypeId,
        startDate: startDate,
        endDate: endDate,
        totalDays: leaveDays,
        reason: data.reason,
        status: "pending" as const,
        attachmentUrl: data.attachmentUrl,
      };
      
      const [request] = await tx
        .insert(leaveRequests)
        .values(dataToInsert)
        .returning();
      
      // Update leave balance to increment pending days
      await tx
        .update(leaveBalances)
        .set({ 
          pendingDays: pendingDays + leaveDays,
          updatedAt: new Date()
        })
        .where(eq(leaveBalances.id, leaveBalance.id));
        
      return [request];
    });
    
    return { 
      success: true, 
      message: "Leave request submitted successfully",
      request: leaveRequest
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to create leave request" };
  }
}

/**
 * Get leave requests for a specific user
 */
export async function getUserLeaveRequests(userId: number, status?: string): Promise<any[]> {
  let query = db
    .select({
      id: leaveRequests.id,
      userId: leaveRequests.userId,
      leaveTypeId: leaveRequests.leaveTypeId,
      leaveTypeName: leaveTypes.name,
      leaveTypeColor: leaveTypes.color,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      totalDays: leaveRequests.totalDays,
      reason: leaveRequests.reason,
      status: leaveRequests.status,
      approvedById: leaveRequests.approvedById,
      approverName: users.username,
      approvedAt: leaveRequests.approvedAt,
      rejectionReason: leaveRequests.rejectionReason,
      attachmentUrl: leaveRequests.attachmentUrl,
      createdAt: leaveRequests.createdAt,
    })
    .from(leaveRequests)
    .innerJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
    .leftJoin(users, eq(leaveRequests.approvedById, users.id))
    .where(eq(leaveRequests.userId, userId))
    .orderBy(desc(leaveRequests.startDate));
  
  if (status) {
    query = query.where(eq(leaveRequests.status, status));
  }
  
  return await query;
}

/**
 * Get all leave requests for admin/manager (optionally filtered by status)
 */
export async function getAllLeaveRequests(status?: string): Promise<any[]> {
  let query = db
    .select({
      id: leaveRequests.id,
      userId: leaveRequests.userId,
      username: users.username,
      email: users.email,
      leaveTypeId: leaveRequests.leaveTypeId,
      leaveTypeName: leaveTypes.name,
      leaveTypeColor: leaveTypes.color,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      totalDays: leaveRequests.totalDays,
      reason: leaveRequests.reason,
      status: leaveRequests.status,
      approvedById: leaveRequests.approvedById,
      approverName: sql<string>`CASE WHEN ${leaveRequests.approvedById} IS NOT NULL THEN (SELECT username FROM ${users} WHERE id = ${leaveRequests.approvedById}) ELSE NULL END`,
      approvedAt: leaveRequests.approvedAt,
      rejectionReason: leaveRequests.rejectionReason,
      attachmentUrl: leaveRequests.attachmentUrl,
      createdAt: leaveRequests.createdAt,
    })
    .from(leaveRequests)
    .innerJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
    .innerJoin(users, eq(leaveRequests.userId, users.id))
    .orderBy(desc(leaveRequests.createdAt));
  
  if (status) {
    query = query.where(eq(leaveRequests.status, status));
  }
  
  return await query;
}

/**
 * Approve a leave request
 */
export async function approveLeaveRequest(
  requestId: number, 
  approvedById: number
): Promise<{ success: boolean; message: string; request?: LeaveRequest }> {
  try {
    // Begin transaction
    return await db.transaction(async (tx) => {
      // Get leave request
      const [leaveRequest] = await tx
        .select()
        .from(leaveRequests)
        .where(eq(leaveRequests.id, requestId));
      
      if (!leaveRequest) {
        return { success: false, message: "Leave request not found" };
      }
      
      if (leaveRequest.status !== "pending") {
        return { success: false, message: `Cannot approve request in '${leaveRequest.status}' status` };
      }
      
      // Get user leave balance
      const [leaveBalance] = await tx
        .select()
        .from(leaveBalances)
        .where(and(
          eq(leaveBalances.userId, leaveRequest.userId),
          eq(leaveBalances.leaveTypeId, leaveRequest.leaveTypeId),
          eq(leaveBalances.year, getYear(new Date(leaveRequest.startDate)))
        ));
      
      if (!leaveBalance) {
        return { success: false, message: "Leave balance not found" };
      }
      
      // Update leave request status
      const [updatedRequest] = await tx
        .update(leaveRequests)
        .set({
          status: "approved",
          approvedById,
          approvedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(leaveRequests.id, requestId))
        .returning();
      
      // Update leave balance
      await tx
        .update(leaveBalances)
        .set({
          usedDays: leaveBalance.usedDays + leaveRequest.totalDays,
          pendingDays: leaveBalance.pendingDays - leaveRequest.totalDays,
          updatedAt: new Date()
        })
        .where(eq(leaveBalances.id, leaveBalance.id));
      
      return { 
        success: true, 
        message: "Leave request approved successfully",
        request: updatedRequest
      };
    });
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to approve leave request" };
  }
}

/**
 * Reject a leave request
 */
export async function rejectLeaveRequest(
  requestId: number, 
  approvedById: number,
  rejectionReason?: string
): Promise<{ success: boolean; message: string; request?: LeaveRequest }> {
  try {
    // Begin transaction
    return await db.transaction(async (tx) => {
      // Get leave request
      const [leaveRequest] = await tx
        .select()
        .from(leaveRequests)
        .where(eq(leaveRequests.id, requestId));
      
      if (!leaveRequest) {
        return { success: false, message: "Leave request not found" };
      }
      
      if (leaveRequest.status !== "pending") {
        return { success: false, message: `Cannot reject request in '${leaveRequest.status}' status` };
      }
      
      // Get user leave balance
      const [leaveBalance] = await tx
        .select()
        .from(leaveBalances)
        .where(and(
          eq(leaveBalances.userId, leaveRequest.userId),
          eq(leaveBalances.leaveTypeId, leaveRequest.leaveTypeId),
          eq(leaveBalances.year, getYear(new Date(leaveRequest.startDate)))
        ));
      
      if (!leaveBalance) {
        return { success: false, message: "Leave balance not found" };
      }
      
      // Update leave request status
      const [updatedRequest] = await tx
        .update(leaveRequests)
        .set({
          status: "rejected",
          approvedById,
          approvedAt: new Date(),
          rejectionReason: rejectionReason || "Request denied",
          updatedAt: new Date()
        })
        .where(eq(leaveRequests.id, requestId))
        .returning();
      
      // Update leave balance
      await tx
        .update(leaveBalances)
        .set({
          pendingDays: leaveBalance.pendingDays - leaveRequest.totalDays,
          updatedAt: new Date()
        })
        .where(eq(leaveBalances.id, leaveBalance.id));
      
      return { 
        success: true, 
        message: "Leave request rejected successfully",
        request: updatedRequest
      };
    });
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to reject leave request" };
  }
}

/**
 * Cancel a leave request
 */
export async function cancelLeaveRequest(
  requestId: number, 
  userId: number
): Promise<{ success: boolean; message: string; request?: LeaveRequest }> {
  try {
    // Begin transaction
    return await db.transaction(async (tx) => {
      // Get leave request
      const [leaveRequest] = await tx
        .select()
        .from(leaveRequests)
        .where(eq(leaveRequests.id, requestId));
      
      if (!leaveRequest) {
        return { success: false, message: "Leave request not found" };
      }
      
      // Check if the request belongs to the user
      if (leaveRequest.userId !== userId) {
        return { success: false, message: "You can only cancel your own leave requests" };
      }
      
      if (leaveRequest.status !== "pending" && leaveRequest.status !== "approved") {
        return { success: false, message: `Cannot cancel request in '${leaveRequest.status}' status` };
      }
      
      // Get user leave balance
      const [leaveBalance] = await tx
        .select()
        .from(leaveBalances)
        .where(and(
          eq(leaveBalances.userId, leaveRequest.userId),
          eq(leaveBalances.leaveTypeId, leaveRequest.leaveTypeId),
          eq(leaveBalances.year, getYear(new Date(leaveRequest.startDate)))
        ));
      
      if (!leaveBalance) {
        return { success: false, message: "Leave balance not found" };
      }
      
      // Update leave request status
      const [updatedRequest] = await tx
        .update(leaveRequests)
        .set({
          status: "cancelled",
          updatedAt: new Date()
        })
        .where(eq(leaveRequests.id, requestId))
        .returning();
      
      // Update leave balance based on current status
      if (leaveRequest.status === "pending") {
        await tx
          .update(leaveBalances)
          .set({
            pendingDays: leaveBalance.pendingDays - leaveRequest.totalDays,
            updatedAt: new Date()
          })
          .where(eq(leaveBalances.id, leaveBalance.id));
      } else if (leaveRequest.status === "approved") {
        await tx
          .update(leaveBalances)
          .set({
            usedDays: leaveBalance.usedDays - leaveRequest.totalDays,
            updatedAt: new Date()
          })
          .where(eq(leaveBalances.id, leaveBalance.id));
      }
      
      return { 
        success: true, 
        message: "Leave request cancelled successfully",
        request: updatedRequest
      };
    });
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to cancel leave request" };
  }
}

/**
 * Get leave summary statistics for reporting
 */
export async function getLeaveSummary(year: number = new Date().getFullYear()): Promise<any> {
  // Count leave requests by status
  const statusCounts = await db
    .select({
      status: leaveRequests.status,
      count: sql<number>`count(*)`,
    })
    .from(leaveRequests)
    .where(sql`EXTRACT(YEAR FROM ${leaveRequests.startDate}) = ${year}`)
    .groupBy(leaveRequests.status);

  // Count leave requests by type
  const typeCounts = await db
    .select({
      leaveTypeId: leaveRequests.leaveTypeId,
      leaveTypeName: leaveTypes.name,
      count: sql<number>`count(*)`,
      totalDays: sql<number>`sum(${leaveRequests.totalDays})`,
    })
    .from(leaveRequests)
    .innerJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
    .where(sql`EXTRACT(YEAR FROM ${leaveRequests.startDate}) = ${year}`)
    .groupBy(leaveRequests.leaveTypeId, leaveTypes.name);

  // Count leave requests by month
  const monthCounts = await db
    .select({
      month: sql<number>`EXTRACT(MONTH FROM ${leaveRequests.startDate})`,
      count: sql<number>`count(*)`,
    })
    .from(leaveRequests)
    .where(sql`EXTRACT(YEAR FROM ${leaveRequests.startDate}) = ${year}`)
    .groupBy(sql`EXTRACT(MONTH FROM ${leaveRequests.startDate})`)
    .orderBy(sql`EXTRACT(MONTH FROM ${leaveRequests.startDate})`);

  return {
    byStatus: statusCounts,
    byType: typeCounts,
    byMonth: monthCounts,
    year
  };
}