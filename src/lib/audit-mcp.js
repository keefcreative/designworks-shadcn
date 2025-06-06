// Audit Logging MCP Service
// Handles comprehensive audit logging and activity tracking
// Provides querying and reporting capabilities

import { supabase } from './supabaseClient.js';
import { getCurrentUser } from './auth-mcp.js';

/**
 * Get activity logs for a client
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Activity logs
 */
export async function getActivityLogs(filters = {}) {
  try {
    console.log('🔄 Getting activity logs...');

    const currentUser = await getCurrentUser();
    if (!currentUser.user) {
      throw new Error('User not authenticated');
    }

    let query = supabase
      .from('activity_logs')
      .select(`
        *,
        user:users(id, email, full_name),
        client:clients(id, name)
      `);

    // Apply client filter based on user permissions
    if (currentUser.user.role !== 'platform_admin') {
      query = query.eq('client_id', currentUser.client?.id);
    } else if (filters.client_id) {
      query = query.eq('client_id', filters.client_id);
    }

    // Apply additional filters
    if (filters.entity_type) {
      query = query.eq('entity_type', filters.entity_type);
    }
    if (filters.entity_id) {
      query = query.eq('entity_id', filters.entity_id);
    }
    if (filters.action) {
      query = query.eq('action', filters.action);
    }
    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    if (filters.start_date) {
      query = query.gte('created_at', filters.start_date);
    }
    if (filters.end_date) {
      query = query.lte('created_at', filters.end_date);
    }

    // Apply pagination
    const limit = Math.min(filters.limit || 50, 100);
    const offset = filters.offset || 0;
    
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to get activity logs: ${error.message}`);
    }

    return {
      success: true,
      data,
      count,
      pagination: {
        limit,
        offset,
        has_more: data.length === limit
      },
      message: 'Activity logs retrieved successfully!'
    };

  } catch (error) {
    console.error('❌ Get activity logs error:', error);
    throw error;
  }
}

/**
 * Get sync logs for monitoring Trello synchronization
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Sync logs
 */
export async function getSyncLogs(filters = {}) {
  try {
    console.log('🔄 Getting sync logs...');

    const currentUser = await getCurrentUser();
    if (!currentUser.user) {
      throw new Error('User not authenticated');
    }

    let query = supabase
      .from('sync_logs')
      .select(`
        *,
        design_request:design_requests(id, short_id, project_name),
        client:clients(id, name)
      `);

    // Apply client filter based on user permissions
    if (currentUser.user.role !== 'platform_admin') {
      query = query.eq('client_id', currentUser.client?.id);
    } else if (filters.client_id) {
      query = query.eq('client_id', filters.client_id);
    }

    // Apply additional filters
    if (filters.sync_type) {
      query = query.eq('sync_type', filters.sync_type);
    }
    if (filters.operation) {
      query = query.eq('operation', filters.operation);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.design_request_id) {
      query = query.eq('design_request_id', filters.design_request_id);
    }
    if (filters.start_date) {
      query = query.gte('created_at', filters.start_date);
    }
    if (filters.end_date) {
      query = query.lte('created_at', filters.end_date);
    }

    // Apply pagination
    const limit = Math.min(filters.limit || 50, 100);
    const offset = filters.offset || 0;
    
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get sync logs: ${error.message}`);
    }

    return {
      success: true,
      data,
      pagination: {
        limit,
        offset,
        has_more: data.length === limit
      },
      message: 'Sync logs retrieved successfully!'
    };

  } catch (error) {
    console.error('❌ Get sync logs error:', error);
    throw error;
  }
}

/**
 * Get activity statistics for dashboard
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Activity statistics
 */
export async function getActivityStats(filters = {}) {
  try {
    console.log('🔄 Getting activity statistics...');

    const currentUser = await getCurrentUser();
    if (!currentUser.user) {
      throw new Error('User not authenticated');
    }

    const clientFilter = currentUser.user.role === 'platform_admin' && filters.client_id 
      ? filters.client_id 
      : currentUser.client?.id;

    if (!clientFilter && currentUser.user.role !== 'platform_admin') {
      throw new Error('Client not found');
    }

    // Get date range (default to last 30 days)
    const endDate = filters.end_date || new Date().toISOString();
    const startDate = filters.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Build base query
    let baseQuery = supabase
      .from('activity_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (clientFilter) {
      baseQuery = baseQuery.eq('client_id', clientFilter);
    }

    // Get total activities
    const { count: totalActivities } = await baseQuery;

    // Get activities by action
    const { data: actionStats } = await supabase
      .from('activity_logs')
      .select('action')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .eq('client_id', clientFilter || undefined);

    const actionCounts = actionStats?.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {}) || {};

    // Get activities by entity type
    const { data: entityStats } = await supabase
      .from('activity_logs')
      .select('entity_type')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .eq('client_id', clientFilter || undefined);

    const entityCounts = entityStats?.reduce((acc, log) => {
      acc[log.entity_type] = (acc[log.entity_type] || 0) + 1;
      return acc;
    }, {}) || {};

    // Get daily activity counts for chart
    const { data: dailyStats } = await supabase
      .from('activity_logs')
      .select('created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .eq('client_id', clientFilter || undefined)
      .order('created_at', { ascending: true });

    const dailyCounts = dailyStats?.reduce((acc, log) => {
      const date = new Date(log.created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {}) || {};

    // Get sync statistics
    const { data: syncStats } = await supabase
      .from('sync_logs')
      .select('status')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .eq('client_id', clientFilter || undefined);

    const syncCounts = syncStats?.reduce((acc, log) => {
      acc[log.status] = (acc[log.status] || 0) + 1;
      return acc;
    }, {}) || {};

    return {
      success: true,
      data: {
        total_activities: totalActivities || 0,
        date_range: { start_date: startDate, end_date: endDate },
        action_breakdown: actionCounts,
        entity_breakdown: entityCounts,
        daily_activity: dailyCounts,
        sync_status_breakdown: syncCounts
      },
      message: 'Activity statistics retrieved successfully!'
    };

  } catch (error) {
    console.error('❌ Get activity stats error:', error);
    throw error;
  }
}

/**
 * Get user activity summary
 * @param {string} userId - User ID (optional, defaults to current user)
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} User activity summary
 */
export async function getUserActivitySummary(userId = null, filters = {}) {
  try {
    console.log('🔄 Getting user activity summary...');

    const currentUser = await getCurrentUser();
    if (!currentUser.user) {
      throw new Error('User not authenticated');
    }

    const targetUserId = userId || currentUser.user.id;

    // Check permissions
    const canView = currentUser.user.role === 'platform_admin' || 
                   currentUser.user.id === targetUserId ||
                   (currentUser.client?.id && ['owner', 'admin'].includes(currentUser.user.role));

    if (!canView) {
      throw new Error('Insufficient permissions to view user activity');
    }

    // Get date range (default to last 30 days)
    const endDate = filters.end_date || new Date().toISOString();
    const startDate = filters.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Get user info
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        role,
        last_login_at,
        created_at,
        client:clients(id, name)
      `)
      .eq('id', targetUserId)
      .single();

    if (userError) {
      throw new Error(`Failed to get user data: ${userError.message}`);
    }

    // Get activity summary
    const { data: activities } = await supabase
      .from('activity_logs')
      .select('action, entity_type, created_at')
      .eq('user_id', targetUserId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });

    const activitySummary = {
      total_activities: activities?.length || 0,
      actions_breakdown: activities?.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {}) || {},
      entities_breakdown: activities?.reduce((acc, log) => {
        acc[log.entity_type] = (acc[log.entity_type] || 0) + 1;
        return acc;
      }, {}) || {},
      recent_activities: activities?.slice(0, 10) || []
    };

    return {
      success: true,
      data: {
        user: userData,
        activity_summary: activitySummary,
        date_range: { start_date: startDate, end_date: endDate }
      },
      message: 'User activity summary retrieved successfully!'
    };

  } catch (error) {
    console.error('❌ Get user activity summary error:', error);
    throw error;
  }
}

/**
 * Export activity logs to CSV format
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} CSV export result
 */
export async function exportActivityLogs(filters = {}) {
  try {
    console.log('🔄 Exporting activity logs...');

    const currentUser = await getCurrentUser();
    if (!currentUser.user) {
      throw new Error('User not authenticated');
    }

    // Check permissions
    const canExport = currentUser.user.role === 'platform_admin' || 
                     ['owner', 'admin'].includes(currentUser.user.role);

    if (!canExport) {
      throw new Error('Insufficient permissions to export activity logs');
    }

    // Get activity logs with expanded limit for export
    const logsResult = await getActivityLogs({
      ...filters,
      limit: 10000 // Large limit for export
    });

    if (!logsResult.success) {
      throw new Error('Failed to retrieve activity logs for export');
    }

    // Convert to CSV format
    const csvHeaders = [
      'Date/Time',
      'User Email',
      'User Name',
      'Client',
      'Entity Type',
      'Entity ID',
      'Action',
      'Details',
      'IP Address',
      'User Agent'
    ];

    const csvRows = logsResult.data.map(log => [
      new Date(log.created_at).toISOString(),
      log.user?.email || 'N/A',
      log.user?.full_name || 'N/A',
      log.client?.name || 'N/A',
      log.entity_type,
      log.entity_id || 'N/A',
      log.action,
      JSON.stringify(log.details || {}),
      log.ip_address || 'N/A',
      log.user_agent || 'N/A'
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    // Log the export activity
    await supabase
      .from('activity_logs')
      .insert([{
        client_id: currentUser.client?.id,
        user_id: currentUser.user.id,
        entity_type: 'activity_logs',
        entity_id: null,
        action: 'exported',
        details: {
          export_filters: filters,
          record_count: logsResult.data.length
        }
      }]);

    return {
      success: true,
      data: {
        csv_content: csvContent,
        record_count: logsResult.data.length,
        filename: `activity_logs_${new Date().toISOString().split('T')[0]}.csv`
      },
      message: 'Activity logs exported successfully!'
    };

  } catch (error) {
    console.error('❌ Export activity logs error:', error);
    throw error;
  }
}

/**
 * Clean up old activity logs (platform admin only)
 * @param {number} retentionDays - Number of days to retain logs
 * @returns {Promise<Object>} Cleanup result
 */
export async function cleanupOldLogs(retentionDays = 365) {
  try {
    console.log('🔄 Cleaning up old activity logs...');

    const currentUser = await getCurrentUser();
    if (!currentUser.user || currentUser.user.role !== 'platform_admin') {
      throw new Error('Only platform admins can clean up logs');
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Delete old activity logs
    const { data: deletedActivityLogs, error: activityError } = await supabase
      .from('activity_logs')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select('id');

    if (activityError) {
      throw new Error(`Failed to delete activity logs: ${activityError.message}`);
    }

    // Delete old sync logs
    const { data: deletedSyncLogs, error: syncError } = await supabase
      .from('sync_logs')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select('id');

    if (syncError) {
      throw new Error(`Failed to delete sync logs: ${syncError.message}`);
    }

    const activityCount = deletedActivityLogs?.length || 0;
    const syncCount = deletedSyncLogs?.length || 0;

    // Log the cleanup activity
    await supabase
      .from('activity_logs')
      .insert([{
        client_id: null,
        user_id: currentUser.user.id,
        entity_type: 'system',
        entity_id: null,
        action: 'logs_cleanup',
        details: {
          retention_days: retentionDays,
          cutoff_date: cutoffDate.toISOString(),
          deleted_activity_logs: activityCount,
          deleted_sync_logs: syncCount
        }
      }]);

    console.log(`✅ Cleaned up ${activityCount + syncCount} old log entries`);

    return {
      success: true,
      data: {
        deleted_activity_logs: activityCount,
        deleted_sync_logs: syncCount,
        total_deleted: activityCount + syncCount,
        cutoff_date: cutoffDate.toISOString()
      },
      message: `Successfully cleaned up ${activityCount + syncCount} old log entries`
    };

  } catch (error) {
    console.error('❌ Cleanup old logs error:', error);
    throw error;
  }
}