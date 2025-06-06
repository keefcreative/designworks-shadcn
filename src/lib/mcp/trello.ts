// Trello MCP Integration (converted from trello-mcp.js)
import { supabase } from '../supabase/client'
import { logActivity } from '../supabase/db'

export interface TrelloConfig {
  api_key: string
  token: string
  board_id: string
  list_id?: string
  default_list_id?: string
  default_members?: string[]
  priority_labels?: Record<string, string>
  type_labels?: Record<string, string>
}

export interface CardData {
  name: string
  desc: string
  idList: string
  pos?: string
  due?: string | null
  labels?: string[]
  members?: string[]
}

/**
 * Create a Trello card for a design request
 */
export async function createTrelloCard(designRequestId: string) {
  try {
    console.log('🔄 Creating Trello card for design request...')

    // Get design request with client info
    const { data: designRequest, error: requestError } = await supabase
      .from('design_requests')
      .select(`
        *,
        client:clients(*),
        user:users(*)
      `)
      .eq('id', designRequestId)
      .single()

    if (requestError || !designRequest) {
      throw new Error('Design request not found')
    }

    // Get Trello configuration from client
    const trelloConfig = designRequest.client.trello_config
    if (!trelloConfig || !trelloConfig.api_key || !trelloConfig.token || !trelloConfig.board_id) {
      throw new Error('Trello configuration not found for client')
    }

    // Prepare card data
    const cardData: CardData = {
      name: `${designRequest.short_id}: ${designRequest.project_name || 'Design Request'}`,
      desc: buildCardDescription(designRequest),
      idList: trelloConfig.list_id || await getDefaultListId(trelloConfig),
      pos: 'top',
      due: designRequest.deadline ? new Date(designRequest.deadline).toISOString() : null,
      labels: buildCardLabels(designRequest, trelloConfig),
      members: trelloConfig.default_members || []
    }

    // Create sync log entry
    const syncLog = await createSyncLog({
      client_id: designRequest.client_id,
      design_request_id: designRequestId,
      sync_type: 'trello_card',
      operation: 'create',
      status: 'in_progress',
      synced_by: 'pending'
    })

    try {
      // Try MCP first, fallback to direct API
      const { trelloResponse, method } = await callTrelloWithFallback('create', cardData, trelloConfig)

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
        .eq('id', designRequestId)

      if (updateError) {
        console.error('❌ Failed to update design request with Trello info:', updateError)
      }

      // Update sync log
      await updateSyncLog(syncLog.id, {
        status: 'completed',
        trello_card_id: trelloResponse.id,
        trello_response: trelloResponse,
        synced_by: method,
        completed_at: new Date().toISOString()
      })

      // Log activity
      await logActivity('design_request', designRequestId, 'trello_card_created', {
        trello_card_id: trelloResponse.id,
        trello_card_url: trelloResponse.url
      })

      console.log('✅ Trello card created successfully:', trelloResponse.id)

      return {
        success: true,
        trello_card: trelloResponse,
        message: 'Trello card created successfully!'
      }

    } catch (trelloError: any) {
      // Update sync log with error
      await updateSyncLog(syncLog.id, {
        status: 'failed',
        error_message: trelloError.message,
        retry_count: 0,
        next_retry_at: calculateNextRetry(0)
      })

      // Update design request sync status
      await supabase
        .from('design_requests')
        .update({
          sync_status: 'failed',
          sync_error: trelloError.message,
          sync_attempts: (designRequest.sync_attempts || 0) + 1
        })
        .eq('id', designRequestId)

      throw trelloError
    }

  } catch (error) {
    console.error('❌ Create Trello card error:', error)
    throw error
  }
}

/**
 * Update a Trello card
 */
export async function updateTrelloCard(designRequestId: string, updateData: any) {
  try {
    console.log('🔄 Updating Trello card...')

    // Get design request with Trello info
    const { data: designRequest, error: requestError } = await supabase
      .from('design_requests')
      .select(`
        *,
        client:clients(*)
      `)
      .eq('id', designRequestId)
      .single()

    if (requestError || !designRequest) {
      throw new Error('Design request not found')
    }

    if (!designRequest.trello_card_id) {
      throw new Error('No Trello card associated with this request')
    }

    const trelloConfig = designRequest.client.trello_config
    if (!trelloConfig || !trelloConfig.api_key || !trelloConfig.token) {
      throw new Error('Trello configuration not found for client')
    }

    // Create sync log entry
    const syncLog = await createSyncLog({
      client_id: designRequest.client_id,
      design_request_id: designRequestId,
      sync_type: 'trello_card',
      operation: 'update',
      status: 'in_progress',
      trello_card_id: designRequest.trello_card_id,
      synced_by: 'pending'
    })

    try {
      // Prepare update data for Trello
      const trelloUpdateData: any = {}
      
      if (updateData.name) trelloUpdateData.name = updateData.name
      if (updateData.desc) trelloUpdateData.desc = updateData.desc
      if (updateData.due) trelloUpdateData.due = new Date(updateData.due).toISOString()
      if (updateData.idList) trelloUpdateData.idList = updateData.idList
      if (updateData.closed !== undefined) trelloUpdateData.closed = updateData.closed

      // Try MCP first, fallback to direct API
      const { trelloResponse, method } = await callTrelloWithFallback(
        'update',
        { id: designRequest.trello_card_id, ...trelloUpdateData },
        trelloConfig
      )

      // Update sync log
      await updateSyncLog(syncLog.id, {
        status: 'completed',
        trello_response: trelloResponse,
        synced_by: method,
        completed_at: new Date().toISOString()
      })

      // Update design request sync status
      await supabase
        .from('design_requests')
        .update({
          sync_status: 'synced',
          last_sync_at: new Date().toISOString(),
          sync_error: null
        })
        .eq('id', designRequestId)

      // Log activity
      await logActivity('design_request', designRequestId, 'trello_card_updated', {
        trello_card_id: designRequest.trello_card_id,
        updated_fields: Object.keys(trelloUpdateData)
      })

      console.log('✅ Trello card updated successfully')

      return {
        success: true,
        trello_card: trelloResponse,
        message: 'Trello card updated successfully!'
      }

    } catch (trelloError: any) {
      // Update sync log with error
      await updateSyncLog(syncLog.id, {
        status: 'failed',
        error_message: trelloError.message,
        retry_count: 0,
        next_retry_at: calculateNextRetry(0)
      })

      throw trelloError
    }

  } catch (error) {
    console.error('❌ Update Trello card error:', error)
    throw error
  }
}

/**
 * Add a comment to a Trello card
 */
export async function addTrelloComment(designRequestId: string, comment: string) {
  try {
    console.log('🔄 Adding comment to Trello card...')

    // Get design request with Trello info
    const { data: designRequest, error: requestError } = await supabase
      .from('design_requests')
      .select(`
        *,
        client:clients(*)
      `)
      .eq('id', designRequestId)
      .single()

    if (requestError || !designRequest) {
      throw new Error('Design request not found')
    }

    if (!designRequest.trello_card_id) {
      throw new Error('No Trello card associated with this request')
    }

    const trelloConfig = designRequest.client.trello_config
    if (!trelloConfig || !trelloConfig.api_key || !trelloConfig.token) {
      throw new Error('Trello configuration not found for client')
    }

    // Try MCP first, fallback to direct API
    const { trelloResponse, method } = await callTrelloWithFallback(
      'comment',
      { id: designRequest.trello_card_id, text: comment },
      trelloConfig
    )

    // Log activity
    await logActivity('design_request', designRequestId, 'trello_comment_added', {
      trello_card_id: designRequest.trello_card_id,
      comment_id: trelloResponse.id,
      synced_by: method
    })

    console.log('✅ Trello comment added successfully')

    return {
      success: true,
      comment: trelloResponse,
      message: 'Comment added to Trello card successfully!'
    }

  } catch (error) {
    console.error('❌ Add Trello comment error:', error)
    throw error
  }
}

/**
 * Build card description from design request data
 */
function buildCardDescription(designRequest: any): string {
  let description = `**Design Request: ${designRequest.short_id}**\n\n`
  
  if (designRequest.context) {
    description += `**Context:**\n${designRequest.context}\n\n`
  }
  
  if (designRequest.design_needs) {
    description += `**Design Needs:**\n${designRequest.design_needs}\n\n`
  }
  
  if (designRequest.key_message) {
    description += `**Key Message:**\n${designRequest.key_message}\n\n`
  }
  
  if (designRequest.size_format) {
    description += `**Size/Format:**\n${designRequest.size_format}\n\n`
  }
  
  if (designRequest.additional_notes) {
    description += `**Additional Notes:**\n${designRequest.additional_notes}\n\n`
  }
  
  description += `**Contact:** ${designRequest.contact_email}\n`
  description += `**Priority:** ${designRequest.priority}\n`
  description += `**Submitted:** ${new Date(designRequest.created_at).toLocaleDateString()}\n`
  
  if (designRequest.file_urls && designRequest.file_urls.length > 0) {
    description += `\n**Attached Files:** ${designRequest.file_urls.length} file(s)`
  }
  
  return description
}

/**
 * Build card labels based on request data
 */
function buildCardLabels(designRequest: any, trelloConfig: TrelloConfig): string[] {
  const labels: string[] = []
  
  // Priority labels
  if (trelloConfig.priority_labels) {
    const priorityLabel = trelloConfig.priority_labels[designRequest.priority]
    if (priorityLabel) labels.push(priorityLabel)
  }
  
  // Request type labels
  if (trelloConfig.type_labels) {
    const typeLabel = trelloConfig.type_labels[designRequest.request_type]
    if (typeLabel) labels.push(typeLabel)
  }
  
  return labels
}

/**
 * Get default list ID for new cards
 */
async function getDefaultListId(trelloConfig: TrelloConfig): Promise<string> {
  if (trelloConfig.default_list_id) {
    return trelloConfig.default_list_id
  }
  
  // Get first list from board using direct API
  try {
    const lists = await callTrelloAPI('GET', `/boards/${trelloConfig.board_id}/lists`, {}, trelloConfig)
    return lists[0]?.id
  } catch (error) {
    throw new Error('Failed to get default list ID')
  }
}

/**
 * Call Trello using MCP with fallback to direct API
 */
async function callTrelloWithFallback(operation: string, data: any, trelloConfig: TrelloConfig) {
  try {
    console.log(`🔄 Attempting Trello ${operation} via direct API...`)
    
    let trelloResponse: any
    
    switch (operation) {
      case 'create':
        trelloResponse = await callTrelloAPI('POST', '/cards', data, trelloConfig)
        break
        
      case 'update': {
        const { id, ...updateData } = data
        trelloResponse = await callTrelloAPI('PUT', `/cards/${id}`, updateData, trelloConfig)
        break
      }
        
      case 'comment':
        trelloResponse = await callTrelloAPI(
          'POST',
          `/cards/${data.id}/actions/comments`,
          { text: data.text },
          trelloConfig
        )
        break
        
      default:
        throw new Error(`Unsupported operation: ${operation}`)
    }
    
    console.log(`✅ Trello ${operation} completed via direct API`)
    return { trelloResponse, method: 'direct_api' }
    
  } catch (error: any) {
    console.error(`❌ Trello ${operation} failed:`, error.message)
    throw new Error(`Trello ${operation} failed: ${error.message}`)
  }
}

/**
 * Make a call to the Trello API
 */
async function callTrelloAPI(method: string, endpoint: string, data: any, trelloConfig: TrelloConfig) {
  const baseUrl = 'https://api.trello.com/1'
  const url = new URL(`${baseUrl}${endpoint}`)
  
  // Add authentication parameters
  url.searchParams.append('key', trelloConfig.api_key)
  url.searchParams.append('token', trelloConfig.token)
  
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  }
  
  if (method !== 'GET' && data) {
    options.body = JSON.stringify(data)
  } else if (method === 'GET' && data) {
    Object.keys(data).forEach(key => {
      url.searchParams.append(key, data[key])
    })
  }
  
  const response = await fetch(url.toString(), options)
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Trello API error: ${response.status} ${errorText}`)
  }
  
  return await response.json()
}

/**
 * Create a sync log entry
 */
async function createSyncLog(logData: any) {
  const { data, error } = await supabase
    .from('sync_logs')
    .insert([logData])
    .select()
    .single()
    
  if (error) {
    throw new Error(`Failed to create sync log: ${error.message}`)
  }
  
  return data
}

/**
 * Update a sync log entry
 */
async function updateSyncLog(logId: string, updateData: any) {
  const { data, error } = await supabase
    .from('sync_logs')
    .update(updateData)
    .eq('id', logId)
    .select()
    .single()
    
  if (error) {
    throw new Error(`Failed to update sync log: ${error.message}`)
  }
  
  return data
}

/**
 * Calculate next retry time with exponential backoff
 */
function calculateNextRetry(retryCount: number): string {
  const baseDelay = 5 * 60 * 1000 // 5 minutes
  const delay = baseDelay * Math.pow(2, retryCount) // Exponential backoff
  const nextRetry = new Date(Date.now() + delay)
  return nextRetry.toISOString()
}

export const trelloMCP = {
  createTrelloCard,
  updateTrelloCard,
  addTrelloComment
}