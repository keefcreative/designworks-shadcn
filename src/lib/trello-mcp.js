// Trello Integration MCP Service
// Handles automatic Trello card creation and synchronization
// Supports MCP integration with fallback to direct API calls
// Includes retry logic and comprehensive error handling

import { supabase } from './supabaseClient.js';
import { logActivity } from './supabase-mcp.js';
import * as TrelloMCPHelpers from './trello-mcp-helpers.js';

/**
 * Create a Trello card for a design request
 * @param {string} designRequestId - Design request ID
 * @returns {Promise<Object>} Creation result
 */
export async function createTrelloCard(designRequestId) {
  try {
    console.log('🔄 Creating Trello card for design request...');

    // Get design request with client info
    const { data: designRequest, error: requestError } = await supabase
      .from('design_requests')
      .select(`
        *,
        client:clients(*),
        user:users(*)
      `)
      .eq('id', designRequestId)
      .single();

    if (requestError || !designRequest) {
      throw new Error('Design request not found');
    }

    // Get Trello configuration from client
    const trelloConfig = designRequest.client.trello_config;
    if (!trelloConfig || !trelloConfig.api_key || !trelloConfig.token || !trelloConfig.board_id) {
      throw new Error('Trello configuration not found for client');
    }

    // Prepare card data
    const cardData = {
      name: `${designRequest.short_id}: ${designRequest.project_name || 'Design Request'}`,
      desc: buildCardDescription(designRequest),
      idList: trelloConfig.list_id || await getDefaultListId(trelloConfig),
      pos: 'top',
      due: designRequest.deadline ? new Date(designRequest.deadline).toISOString() : null,
      labels: buildCardLabels(designRequest, trelloConfig),
      members: trelloConfig.default_members || []
    };

    // Create sync log entry
    const syncLog = await createSyncLog({
      client_id: designRequest.client_id,
      design_request_id: designRequestId,
      sync_type: 'trello_card',
      operation: 'create',
      status: 'in_progress',
      synced_by: 'pending' // Will be updated based on method used
    });

    try {
      // Try MCP first, fallback to direct API
      const { trelloResponse, method } = await callTrelloWithFallback('create', cardData, trelloConfig);

      // Update design request with Trello card info
      const { error: updateError } = await supabase
        .from('design_requests')
        .update({
          trello_card_id: trelloResponse.id,
          trello_card_url: trelloResponse.url,
          sync_status: 'synced',
          last_sync_at: new Date().toISOString(),
          sync_error: null
        })
        .eq('id', designRequestId);

      if (updateError) {
        console.error('❌ Failed to update design request with Trello info:', updateError);
      }

      // Update sync log
      await updateSyncLog(syncLog.id, {
        status: 'completed',
        trello_card_id: trelloResponse.id,
        trello_response: trelloResponse,
        synced_by: method,
        completed_at: new Date().toISOString()
      });

      // Log activity
      await logActivity('design_request', designRequestId, 'trello_card_created', {
        trello_card_id: trelloResponse.id,
        trello_card_url: trelloResponse.url
      });

      console.log('✅ Trello card created successfully:', trelloResponse.id);

      return {
        success: true,
        trello_card: trelloResponse,
        message: 'Trello card created successfully!'
      };

    } catch (trelloError) {
      // Update sync log with error
      await updateSyncLog(syncLog.id, {
        status: 'failed',
        error_message: trelloError.message,
        retry_count: 0,
        next_retry_at: calculateNextRetry(0)
      });

      // Update design request sync status
      await supabase
        .from('design_requests')
        .update({
          sync_status: 'failed',
          sync_error: trelloError.message,
          sync_attempts: (designRequest.sync_attempts || 0) + 1
        })
        .eq('id', designRequestId);

      throw trelloError;
    }

  } catch (error) {
    console.error('❌ Create Trello card error:', error);
    throw error;
  }
}

/**
 * Update a Trello card
 * @param {string} designRequestId - Design request ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Update result
 */
export async function updateTrelloCard(designRequestId, updateData) {
  try {
    console.log('🔄 Updating Trello card...');

    // Get design request with Trello info
    const { data: designRequest, error: requestError } = await supabase
      .from('design_requests')
      .select(`
        *,
        client:clients(*)
      `)
      .eq('id', designRequestId)
      .single();

    if (requestError || !designRequest) {
      throw new Error('Design request not found');
    }

    if (!designRequest.trello_card_id) {
      throw new Error('No Trello card associated with this request');
    }

    const trelloConfig = designRequest.client.trello_config;
    if (!trelloConfig || !trelloConfig.api_key || !trelloConfig.token) {
      throw new Error('Trello configuration not found for client');
    }

    // Create sync log entry
    const syncLog = await createSyncLog({
      client_id: designRequest.client_id,
      design_request_id: designRequestId,
      sync_type: 'trello_card',
      operation: 'update',
      status: 'in_progress',
      trello_card_id: designRequest.trello_card_id,
      synced_by: 'pending' // Will be updated based on method used
    });

    try {
      // Prepare update data for Trello
      const trelloUpdateData = {};
      
      if (updateData.name) trelloUpdateData.name = updateData.name;
      if (updateData.desc) trelloUpdateData.desc = updateData.desc;
      if (updateData.due) trelloUpdateData.due = new Date(updateData.due).toISOString();
      if (updateData.idList) trelloUpdateData.idList = updateData.idList;
      if (updateData.closed !== undefined) trelloUpdateData.closed = updateData.closed;

      // Try MCP first, fallback to direct API
      const { trelloResponse, method } = await callTrelloWithFallback(
        'update',
        { id: designRequest.trello_card_id, ...trelloUpdateData },
        trelloConfig
      );

      // Update sync log
      await updateSyncLog(syncLog.id, {
        status: 'completed',
        trello_response: trelloResponse,
        synced_by: method,
        completed_at: new Date().toISOString()
      });

      // Update design request sync status
      await supabase
        .from('design_requests')
        .update({
          sync_status: 'synced',
          last_sync_at: new Date().toISOString(),
          sync_error: null
        })
        .eq('id', designRequestId);

      // Log activity
      await logActivity('design_request', designRequestId, 'trello_card_updated', {
        trello_card_id: designRequest.trello_card_id,
        updated_fields: Object.keys(trelloUpdateData)
      });

      console.log('✅ Trello card updated successfully');

      return {
        success: true,
        trello_card: trelloResponse,
        message: 'Trello card updated successfully!'
      };

    } catch (trelloError) {
      // Update sync log with error
      await updateSyncLog(syncLog.id, {
        status: 'failed',
        error_message: trelloError.message,
        retry_count: 0,
        next_retry_at: calculateNextRetry(0)
      });

      throw trelloError;
    }

  } catch (error) {
    console.error('❌ Update Trello card error:', error);
    throw error;
  }
}

/**
 * Add a comment to a Trello card
 * @param {string} designRequestId - Design request ID
 * @param {string} comment - Comment text
 * @returns {Promise<Object>} Comment result
 */
export async function addTrelloComment(designRequestId, comment) {
  try {
    console.log('🔄 Adding comment to Trello card...');

    // Get design request with Trello info
    const { data: designRequest, error: requestError } = await supabase
      .from('design_requests')
      .select(`
        *,
        client:clients(*)
      `)
      .eq('id', designRequestId)
      .single();

    if (requestError || !designRequest) {
      throw new Error('Design request not found');
    }

    if (!designRequest.trello_card_id) {
      throw new Error('No Trello card associated with this request');
    }

    const trelloConfig = designRequest.client.trello_config;
    if (!trelloConfig || !trelloConfig.api_key || !trelloConfig.token) {
      throw new Error('Trello configuration not found for client');
    }

    // Try MCP first, fallback to direct API
    const { trelloResponse, method } = await callTrelloWithFallback(
      'comment',
      { id: designRequest.trello_card_id, text: comment },
      trelloConfig
    );

    // Log activity
    await logActivity('design_request', designRequestId, 'trello_comment_added', {
      trello_card_id: designRequest.trello_card_id,
      comment_id: trelloResponse.id,
      synced_by: method
    });

    console.log('✅ Trello comment added successfully');

    return {
      success: true,
      comment: trelloResponse,
      message: 'Comment added to Trello card successfully!'
    };

  } catch (error) {
    console.error('❌ Add Trello comment error:', error);
    throw error;
  }
}

/**
 * Process failed sync operations for retry
 * @returns {Promise<Object>} Retry processing result
 */
export async function processFailedSyncs() {
  try {
    console.log('🔄 Processing failed sync operations...');

    // Get failed syncs that are ready for retry
    const { data: failedSyncs, error } = await supabase
      .from('sync_logs')
      .select(`
        *,
        design_request:design_requests(*),
        client:clients(*)
      `)
      .in('status', ['failed', 'retrying'])
      .lte('next_retry_at', new Date().toISOString())
      .lt('retry_count', 5) // Max 5 retries
      .order('created_at', { ascending: true })
      .limit(10); // Process 10 at a time

    if (error) {
      throw new Error(`Failed to get failed syncs: ${error.message}`);
    }

    const results = [];

    for (const syncLog of failedSyncs) {
      try {
        let result;

        if (syncLog.sync_type === 'trello_card' && syncLog.operation === 'create') {
          result = await retryCreateTrelloCard(syncLog);
        } else if (syncLog.sync_type === 'trello_card' && syncLog.operation === 'update') {
          result = await retryUpdateTrelloCard(syncLog);
        }

        results.push({
          sync_log_id: syncLog.id,
          success: true,
          result
        });

      } catch (retryError) {
        // Update retry count and next retry time
        const newRetryCount = syncLog.retry_count + 1;
        const nextRetryAt = newRetryCount >= 5 ? null : calculateNextRetry(newRetryCount);

        await updateSyncLog(syncLog.id, {
          status: newRetryCount >= 5 ? 'failed_permanently' : 'failed',
          error_message: retryError.message,
          retry_count: newRetryCount,
          next_retry_at: nextRetryAt
        });

        results.push({
          sync_log_id: syncLog.id,
          success: false,
          error: retryError.message,
          retry_count: newRetryCount
        });
      }
    }

    console.log(`✅ Processed ${results.length} failed sync operations`);

    return {
      success: true,
      processed_count: results.length,
      results,
      message: `Processed ${results.length} failed sync operations`
    };

  } catch (error) {
    console.error('❌ Process failed syncs error:', error);
    throw error;
  }
}

/**
 * Build card description from design request data
 * @param {Object} designRequest - Design request data
 * @returns {string} Card description
 */
function buildCardDescription(designRequest) {
  let description = `**Design Request: ${designRequest.short_id}**\n\n`;
  
  if (designRequest.context) {
    description += `**Context:**\n${designRequest.context}\n\n`;
  }
  
  if (designRequest.design_needs) {
    description += `**Design Needs:**\n${designRequest.design_needs}\n\n`;
  }
  
  if (designRequest.key_message) {
    description += `**Key Message:**\n${designRequest.key_message}\n\n`;
  }
  
  if (designRequest.size_format) {
    description += `**Size/Format:**\n${designRequest.size_format}\n\n`;
  }
  
  if (designRequest.additional_notes) {
    description += `**Additional Notes:**\n${designRequest.additional_notes}\n\n`;
  }
  
  description += `**Contact:** ${designRequest.contact_email}\n`;
  description += `**Priority:** ${designRequest.priority}\n`;
  description += `**Submitted:** ${new Date(designRequest.created_at).toLocaleDateString()}\n`;
  
  if (designRequest.file_urls && designRequest.file_urls.length > 0) {
    description += `\n**Attached Files:** ${designRequest.file_urls.length} file(s)`;
  }
  
  return description;
}

/**
 * Build card labels based on request data
 * @param {Object} designRequest - Design request data
 * @param {Object} trelloConfig - Trello configuration
 * @returns {Array} Label IDs
 */
function buildCardLabels(designRequest, trelloConfig) {
  const labels = [];
  
  // Priority labels
  if (trelloConfig.priority_labels) {
    const priorityLabel = trelloConfig.priority_labels[designRequest.priority];
    if (priorityLabel) labels.push(priorityLabel);
  }
  
  // Request type labels
  if (trelloConfig.type_labels) {
    const typeLabel = trelloConfig.type_labels[designRequest.request_type];
    if (typeLabel) labels.push(typeLabel);
  }
  
  return labels;
}

/**
 * Get default list ID for new cards
 * @param {Object} trelloConfig - Trello configuration
 * @returns {Promise<string>} List ID
 */
async function getDefaultListId(trelloConfig) {
  if (trelloConfig.default_list_id) {
    return trelloConfig.default_list_id;
  }
  
  // Get first list from board using MCP or direct API
  try {
    const board = await TrelloMCPHelpers.getBoard(trelloConfig.board_id, ['lists']);
    return board.lists?.[0]?.id;
  } catch (mcpError) {
    console.warn('⚠️ MCP board fetch failed, using direct API:', mcpError.message);
    const lists = await callTrelloAPI('GET', `/boards/${trelloConfig.board_id}/lists`, {}, trelloConfig);
    return lists[0]?.id;
  }
}

/**
 * Call Trello using MCP with fallback to direct API
 * @param {string} operation - Operation type ('create', 'update', 'comment')
 * @param {Object} data - Request data
 * @param {Object} trelloConfig - Trello configuration
 * @returns {Promise<{trelloResponse: Object, method: string}>} Response with method used
 */
async function callTrelloWithFallback(operation, data, trelloConfig) {
  try {
    console.log(`🔄 Attempting Trello ${operation} via MCP...`);
    
    let trelloResponse;
    
    switch (operation) {
      case 'create':
        trelloResponse = await TrelloMCPHelpers.createCard({
          name: data.name,
          desc: data.desc,
          idList: data.idList,
          due: data.due,
          idLabels: data.labels || [],
          idMembers: data.members || [],
          pos: data.pos
        });
        break;
        
      case 'update':
        trelloResponse = await TrelloMCPHelpers.updateCard(data.id, {
          name: data.name,
          desc: data.desc,
          due: data.due,
          idList: data.idList,
          closed: data.closed
        });
        break;
        
      case 'comment':
        trelloResponse = await TrelloMCPHelpers.addComment(data.id, data.text);
        break;
        
      default:
        throw new Error(`Unsupported MCP operation: ${operation}`);
    }
    
    console.log(`✅ Trello ${operation} completed via MCP`);
    return { trelloResponse, method: 'mcp' };
    
  } catch (mcpError) {
    console.warn(`⚠️ MCP ${operation} failed, falling back to direct API:`, mcpError.message);
    
    try {
      let trelloResponse;
      
      switch (operation) {
        case 'create':
          trelloResponse = await callTrelloAPI('POST', '/cards', data, trelloConfig);
          break;
          
        case 'update': {
          const { id, ...updateData } = data;
          trelloResponse = await callTrelloAPI('PUT', `/cards/${id}`, updateData, trelloConfig);
          break;
        }
          
        case 'comment':
          trelloResponse = await callTrelloAPI(
            'POST',
            `/cards/${data.id}/actions/comments`,
            { text: data.text },
            trelloConfig
          );
          break;
          
        default:
          throw new Error(`Unsupported direct API operation: ${operation}`);
      }
      
      console.log(`✅ Trello ${operation} completed via direct API (fallback)`);
      return { trelloResponse, method: 'direct_api' };
      
    } catch (directApiError) {
      console.error(`❌ Both MCP and direct API failed for ${operation}:`, directApiError.message);
      throw new Error(`Trello ${operation} failed: MCP (${mcpError.message}) and Direct API (${directApiError.message})`);
    }
  }
}

/**
 * Make a call to the Trello API
 * @param {string} method - HTTP method
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request data
 * @param {Object} trelloConfig - Trello configuration
 * @returns {Promise<Object>} API response
 */
async function callTrelloAPI(method, endpoint, data, trelloConfig) {
  const baseUrl = 'https://api.trello.com/1';
  const url = new URL(`${baseUrl}${endpoint}`);
  
  // Add authentication parameters
  url.searchParams.append('key', trelloConfig.api_key);
  url.searchParams.append('token', trelloConfig.token);
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  if (method !== 'GET' && data) {
    options.body = JSON.stringify(data);
  } else if (method === 'GET' && data) {
    Object.keys(data).forEach(key => {
      url.searchParams.append(key, data[key]);
    });
  }
  
  const response = await fetch(url.toString(), options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Trello API error: ${response.status} ${errorText}`);
  }
  
  return await response.json();
}

/**
 * Create a sync log entry
 * @param {Object} logData - Log data
 * @returns {Promise<Object>} Created log
 */
async function createSyncLog(logData) {
  const { data, error } = await supabase
    .from('sync_logs')
    .insert([logData])
    .select()
    .single();
    
  if (error) {
    throw new Error(`Failed to create sync log: ${error.message}`);
  }
  
  return data;
}

/**
 * Update a sync log entry
 * @param {string} logId - Log ID
 * @param {Object} updateData - Update data
 * @returns {Promise<Object>} Updated log
 */
async function updateSyncLog(logId, updateData) {
  const { data, error } = await supabase
    .from('sync_logs')
    .update(updateData)
    .eq('id', logId)
    .select()
    .single();
    
  if (error) {
    throw new Error(`Failed to update sync log: ${error.message}`);
  }
  
  return data;
}

/**
 * Calculate next retry time with exponential backoff
 * @param {number} retryCount - Current retry count
 * @returns {string} Next retry timestamp
 */
function calculateNextRetry(retryCount) {
  const baseDelay = 5 * 60 * 1000; // 5 minutes
  const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
  const nextRetry = new Date(Date.now() + delay);
  return nextRetry.toISOString();
}

/**
 * Retry creating a Trello card
 * @param {Object} syncLog - Sync log data
 * @returns {Promise<Object>} Retry result
 */
async function retryCreateTrelloCard(syncLog) {
  return await createTrelloCard(syncLog.design_request_id);
}

/**
 * Retry updating a Trello card
 * @param {Object} syncLog - Sync log data
 * @returns {Promise<Object>} Retry result
 */
async function retryUpdateTrelloCard(syncLog) {
  // This would need the original update data, which could be stored in sync log details
  // For now, we'll just sync the current state
  const { data: designRequest } = await supabase
    .from('design_requests')
    .select('*')
    .eq('id', syncLog.design_request_id)
    .single();
    
  if (!designRequest) {
    throw new Error('Design request not found for retry');
  }
  
  return await updateTrelloCard(syncLog.design_request_id, {
    name: `${designRequest.short_id}: ${designRequest.project_name || 'Design Request'}`,
    desc: buildCardDescription(designRequest)
  });
}