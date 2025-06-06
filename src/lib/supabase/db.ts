// Supabase database operations (converted from supabase-mcp.js)
import { supabase } from './client'

/**
 * Get current authenticated user's client information
 */
export async function getCurrentUserClient() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error('User not authenticated')
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        *,
        client:clients(*)
      `)
      .eq('id', user.id)
      .single()

    if (userError) {
      throw new Error(`Failed to get user data: ${userError.message}`)
    }

    return {
      user: userData,
      client: userData.client,
      auth_user: user
    }
  } catch (error) {
    console.error('❌ Get current user client error:', error)
    throw error
  }
}

/**
 * Log activity for audit trail
 */
export async function logActivity(entityType: string, entityId: string, action: string, details: any = {}) {
  try {
    const userClient = await getCurrentUserClient()
    
    const { data, error } = await supabase
      .from('activity_logs')
      .insert([{
        client_id: userClient.client?.id,
        user_id: userClient.user.id,
        entity_type: entityType,
        entity_id: entityId,
        action: action,
        details: details,
        ip_address: null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        session_id: userClient.auth_user.id
      }])
      .select()
      .single()

    if (error) {
      console.error('❌ Activity log error:', error)
    }

    return data
  } catch (error) {
    console.error('❌ Log activity error:', error)
  }
}

/**
 * Upload multiple files to Supabase Storage
 */
export async function uploadFiles(files: FileList | File[], bucket = 'design-uploads') {
  try {
    console.log('🔄 Uploading files to Supabase Storage...')
    
    if (!files || files.length === 0) {
      return []
    }

    const uploadPromises = Array.from(files).map(async (file) => {
      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(2, 15)
      const fileExtension = file.name.split('.').pop()
      const fileName = `${timestamp}_${randomString}.${fileExtension}`
      const filePath = `requests/${fileName}`

      const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('❌ File upload error:', error)
        throw new Error(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)

      return {
        name: file.name,
        url: publicUrl,
        path: filePath,
        size: file.size,
        type: file.type
      }
    })

    const uploadResults = await Promise.all(uploadPromises)
    console.log('✅ Files uploaded successfully:', uploadResults.length)
    
    return uploadResults

  } catch (error) {
    console.error('❌ Upload files error:', error)
    throw new Error(`File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Insert design request into database with multi-client support
 */
export async function insertDesignRequest(requestData: any) {
  try {
    console.log('🔄 Inserting design request to database...')

    const userClient = await getCurrentUserClient()
    
    if (!userClient.client) {
      throw new Error('User must be associated with a client to submit requests')
    }

    const shortId = generateShortId()

    const insertData = {
      short_id: shortId,
      client_id: userClient.client.id,
      user_id: userClient.user.id,
      context: requestData.context || null,
      design_needs: requestData.design_needs || null,
      project_name: requestData.project_name || null,
      company_name: requestData.company_name || userClient.client.name,
      key_message: requestData.key_message || null,
      deadline: requestData.deadline || null,
      size_format: requestData.size_format || null,
      file_format_required: requestData.file_format_required || null,
      copy_content: requestData.copy_content || null,
      additional_notes: requestData.additional_notes || null,
      file_urls: requestData.file_urls || [],
      file_names: requestData.file_names || [],
      file_sizes: requestData.file_sizes || [],
      contact_email: requestData.contact_email || userClient.user.email,
      contact_phone: requestData.contact_phone || null,
      request_type: requestData.request_type || 'design_request',
      submitted_via: requestData.submitted_via || 'web_form',
      form_version: requestData.form_version || '2.0',
      status: 'pending',
      priority: requestData.priority || 'normal',
      sync_status: 'pending',
      metadata: requestData.metadata || {}
    }

    const { data, error } = await supabase
      .from('design_requests')
      .insert([insertData])
      .select(`
        *,
        client:clients(*),
        user:users(*)
      `)
      .single()

    if (error) {
      console.error('❌ Database insert error:', error)
      throw new Error(`Failed to save request: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    await logActivity('design_request', data.id, 'created', {
      short_id: shortId,
      request_type: insertData.request_type,
      priority: insertData.priority
    })

    console.log('✅ Design request saved successfully:', data.id)
    
    return {
      success: true,
      data: data,
      message: 'Design request submitted successfully!',
      short_id: shortId
    }

  } catch (error) {
    console.error('❌ Insert design request error:', error)
    throw new Error(`Database operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Generate a short ID for design requests
 */
function generateShortId(): string {
  const year = new Date().getFullYear()
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `DR-${year}-${timestamp}${random}`
}

/**
 * Validate file before upload
 */
export function validateFile(file: File) {
  const maxSize = 10 * 1024 * 1024 // 10MB
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/zip',
    'application/x-zip-compressed',
    'text/plain'
  ]

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File ${file.name} is too large. Maximum size is 10MB.`
    }
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File ${file.name} has an unsupported format. Please use images, PDFs, or text files.`
    }
  }

  return { valid: true }
}

/**
 * Validate multiple files
 */
export function validateFiles(files: FileList | File[]) {
  if (!files || files.length === 0) {
    return { valid: true, files: [] }
  }

  const maxFiles = 10
  const maxTotalSize = 50 * 1024 * 1024 // 50MB total

  if (files.length > maxFiles) {
    return {
      valid: false,
      error: `Too many files selected. Maximum is ${maxFiles} files.`
    }
  }

  let totalSize = 0
  const validationErrors: string[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    totalSize += file.size

    const validation = validateFile(file)
    if (!validation.valid) {
      validationErrors.push(validation.error)
    }
  }

  if (totalSize > maxTotalSize) {
    validationErrors.push('Total file size exceeds 50MB limit.')
  }

  if (validationErrors.length > 0) {
    return {
      valid: false,
      error: validationErrors.join(' ')
    }
  }

  return { valid: true }
}

export const db = {
  getCurrentUserClient,
  logActivity,
  uploadFiles,
  insertDesignRequest,
  validateFile,
  validateFiles
}