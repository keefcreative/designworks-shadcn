// Client Management MCP Service
// Handles client operations, user invitations, and team management
// Supports multi-tenant client isolation

import { supabase } from './supabaseClient.js';
import { logActivity } from './supabase-mcp.js';
import { getCurrentUser } from './auth-mcp.js';
import { setupClientTrelloBoard } from './trello-board-setup.js';

/**
 * Create a new client
 * @param {Object} clientData - Client creation data
 * @returns {Promise<Object>} Creation result
 */
export async function createClient(clientData, options = {}) {
  try {
    console.log('🔄 Creating new client...');

    const currentUser = await getCurrentUser();
    if (!currentUser.user || currentUser.user.role !== 'platform_admin') {
      throw new Error('Only platform admins can create clients');
    }

    const {
      name,
      slug,
      domain,
      logo_url,
      brand_colors,
      settings,
      trello_config,
      subscription_tier,
      owner_email
    } = clientData;

    const {
      setupTrello = false,
      inviteMembers = [],
      boardName = null
    } = options;

    // Check if slug is unique
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingClient) {
      throw new Error('Client slug already exists');
    }

    const { data, error } = await supabase
      .from('clients')
      .insert([{
        name,
        slug,
        domain,
        logo_url,
        brand_colors: brand_colors || {},
        settings: settings || {},
        trello_config: trello_config || {},
        subscription_tier: subscription_tier || 'basic',
        is_active: true
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create client: ${error.message}`);
    }

    // Log the activity
    await logActivity('client', data.id, 'created', {
      name: data.name,
      slug: data.slug,
      subscription_tier: data.subscription_tier
    });

    console.log('✅ Client created successfully:', data.id);

    // Setup Trello board if requested
    let trelloBoardResult = null;
    if (setupTrello) {
      try {
        console.log('🔄 Setting up Trello board for new client...');
        trelloBoardResult = await setupClientTrelloBoard({
          ...data,
          owner_email
        }, {
          setupTrello: true,
          inviteMembers,
          boardName
        });

        if (trelloBoardResult.success) {
          console.log('✅ Trello board setup completed');
        } else {
          console.warn('⚠️ Trello board setup failed:', trelloBoardResult.error);
        }
      } catch (trelloError) {
        console.error('❌ Trello board setup error:', trelloError);
        // Don't fail client creation if Trello setup fails
        trelloBoardResult = {
          success: false,
          error: trelloError.message
        };
      }
    }

    return {
      success: true,
      data,
      trelloBoard: trelloBoardResult,
      message: setupTrello && trelloBoardResult?.success
        ? 'Client created successfully with Trello board!'
        : 'Client created successfully!'
    };

  } catch (error) {
    console.error('❌ Create client error:', error);
    throw error;
  }
}

/**
 * Create a new client with Trello board setup
 * @param {Object} clientData - Client creation data
 * @param {Object} trelloOptions - Trello setup options
 * @returns {Promise<Object>} Creation result
 */
export async function createClientWithTrelloBoard(clientData, trelloOptions = {}) {
  return await createClient(clientData, {
    setupTrello: true,
    ...trelloOptions
  });
}

/**
 * Get client by ID or slug
 * @param {string} identifier - Client ID or slug
 * @returns {Promise<Object>} Client data
 */
export async function getClient(identifier) {
  try {
    console.log('🔄 Getting client data...');

    const currentUser = await getCurrentUser();
    if (!currentUser.user) {
      throw new Error('User not authenticated');
    }

    // Determine if identifier is UUID or slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
    const column = isUUID ? 'id' : 'slug';

    const { data, error } = await supabase
      .from('clients')
      .select(`
        *,
        users:users(count),
        design_requests:design_requests(count)
      `)
      .eq(column, identifier)
      .single();

    if (error) {
      throw new Error(`Failed to get client: ${error.message}`);
    }

    // Check if user has access to this client
    if (currentUser.user.role !== 'platform_admin' && currentUser.client?.id !== data.id) {
      throw new Error('Access denied to this client');
    }

    return {
      success: true,
      data,
      message: 'Client data retrieved successfully!'
    };

  } catch (error) {
    console.error('❌ Get client error:', error);
    throw error;
  }
}

/**
 * Update client information
 * @param {string} clientId - Client ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Update result
 */
export async function updateClient(clientId, updateData) {
  try {
    console.log('🔄 Updating client...');

    const currentUser = await getCurrentUser();
    if (!currentUser.user) {
      throw new Error('User not authenticated');
    }

    // Check permissions
    const canUpdate = currentUser.user.role === 'platform_admin' || 
                     (currentUser.client?.id === clientId && 
                      ['owner', 'admin'].includes(currentUser.user.role));

    if (!canUpdate) {
      throw new Error('Insufficient permissions to update client');
    }

    const { data, error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', clientId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update client: ${error.message}`);
    }

    // Log the activity
    await logActivity('client', clientId, 'updated', {
      updated_fields: Object.keys(updateData),
      updated_by: currentUser.user.id
    });

    console.log('✅ Client updated successfully');

    return {
      success: true,
      data,
      message: 'Client updated successfully!'
    };

  } catch (error) {
    console.error('❌ Update client error:', error);
    throw error;
  }
}

/**
 * List all clients (platform admin only)
 * @param {Object} filters - Optional filters
 * @returns {Promise<Object>} Clients list
 */
export async function listClients(filters = {}) {
  try {
    console.log('🔄 Listing clients...');

    const currentUser = await getCurrentUser();
    if (!currentUser.user || currentUser.user.role !== 'platform_admin') {
      throw new Error('Only platform admins can list all clients');
    }

    let query = supabase
      .from('clients')
      .select(`
        *,
        users:users(count),
        design_requests:design_requests(count)
      `);

    // Apply filters
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }
    if (filters.subscription_tier) {
      query = query.eq('subscription_tier', filters.subscription_tier);
    }

    // Apply sorting
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to list clients: ${error.message}`);
    }

    return {
      success: true,
      data,
      count: data.length,
      message: 'Clients retrieved successfully!'
    };

  } catch (error) {
    console.error('❌ List clients error:', error);
    throw error;
  }
}

/**
 * Invite a user to join a client
 * @param {Object} invitationData - Invitation data
 * @returns {Promise<Object>} Invitation result
 */
export async function inviteUser(invitationData) {
  try {
    console.log('🔄 Inviting user to client...');

    const currentUser = await getCurrentUser();
    if (!currentUser.user) {
      throw new Error('User not authenticated');
    }

    const { email, role, permissions, client_id } = invitationData;

    // Check permissions
    const canInvite = currentUser.user.role === 'platform_admin' || 
                     (currentUser.client?.id === client_id && 
                      ['owner', 'admin'].includes(currentUser.user.role));

    if (!canInvite) {
      throw new Error('Insufficient permissions to invite users');
    }

    // Check if user already exists in this client
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .eq('client_id', client_id)
      .single();

    if (existingUser) {
      throw new Error('User is already a member of this client');
    }

    // Check for existing pending invitation
    const { data: existingInvitation } = await supabase
      .from('user_invitations')
      .select('id')
      .eq('email', email)
      .eq('client_id', client_id)
      .eq('status', 'pending')
      .single();

    if (existingInvitation) {
      throw new Error('User already has a pending invitation');
    }

    // Generate invitation token
    const token = generateInvitationToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const { data, error } = await supabase
      .from('user_invitations')
      .insert([{
        client_id,
        email,
        role: role || 'member',
        permissions: permissions || [],
        invited_by: currentUser.user.id,
        token,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      }])
      .select(`
        *,
        client:clients(*),
        invited_by_user:users!invited_by(*)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to create invitation: ${error.message}`);
    }

    // Log the activity
    await logActivity('user_invitation', data.id, 'created', {
      invited_email: email,
      role: role,
      invited_by: currentUser.user.id
    });

    console.log('✅ User invitation created successfully');

    return {
      success: true,
      data,
      invitation_url: `${window.location.origin}/auth/accept-invitation?token=${token}`,
      message: 'User invitation sent successfully!'
    };

  } catch (error) {
    console.error('❌ Invite user error:', error);
    throw error;
  }
}

/**
 * Accept a user invitation
 * @param {string} token - Invitation token
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} Acceptance result
 */
export async function acceptInvitation(token, userData) {
  try {
    console.log('🔄 Accepting user invitation...');

    // Get invitation by token
    const { data: invitation, error: invitationError } = await supabase
      .from('user_invitations')
      .select(`
        *,
        client:clients(*)
      `)
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (invitationError || !invitation) {
      throw new Error('Invalid or expired invitation');
    }

    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      throw new Error('Invitation has expired');
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, client_id')
      .eq('email', invitation.email)
      .single();

    if (existingUser) {
      if (existingUser.client_id) {
        throw new Error('User is already associated with a client');
      }
      
      // Update existing user with client association
      const { error: updateError } = await supabase
        .from('users')
        .update({
          client_id: invitation.client_id,
          role: invitation.role,
          permissions: invitation.permissions
        })
        .eq('id', existingUser.id);

      if (updateError) {
        throw new Error(`Failed to update user: ${updateError.message}`);
      }
    } else {
      // Register new user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.full_name,
            client_id: invitation.client_id
          }
        }
      });

      if (authError) {
        throw new Error(`Registration failed: ${authError.message}`);
      }

      // Update user record with invitation details
      if (authData.user) {
        const { error: updateError } = await supabase
          .from('users')
          .update({
            client_id: invitation.client_id,
            role: invitation.role,
            permissions: invitation.permissions
          })
          .eq('id', authData.user.id);

        if (updateError) {
          console.error('❌ Failed to update user with invitation details:', updateError);
        }
      }
    }

    // Mark invitation as accepted
    const { error: acceptError } = await supabase
      .from('user_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitation.id);

    if (acceptError) {
      console.error('❌ Failed to mark invitation as accepted:', acceptError);
    }

    // Log the activity
    await logActivity('user_invitation', invitation.id, 'accepted', {
      email: invitation.email,
      client_id: invitation.client_id
    });

    console.log('✅ Invitation accepted successfully');

    return {
      success: true,
      client: invitation.client,
      message: 'Invitation accepted successfully! Welcome to the team!'
    };

  } catch (error) {
    console.error('❌ Accept invitation error:', error);
    throw error;
  }
}

/**
 * List users in a client
 * @param {string} clientId - Client ID (optional, uses current user's client if not provided)
 * @returns {Promise<Object>} Users list
 */
export async function listClientUsers(clientId = null) {
  try {
    console.log('🔄 Listing client users...');

    const currentUser = await getCurrentUser();
    if (!currentUser.user) {
      throw new Error('User not authenticated');
    }

    const targetClientId = clientId || currentUser.client?.id;
    if (!targetClientId) {
      throw new Error('No client specified');
    }

    // Check permissions
    const canView = currentUser.user.role === 'platform_admin' || 
                   currentUser.client?.id === targetClientId;

    if (!canView) {
      throw new Error('Insufficient permissions to view client users');
    }

    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        avatar_url,
        role,
        permissions,
        is_active,
        last_login_at,
        created_at
      `)
      .eq('client_id', targetClientId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list users: ${error.message}`);
    }

    return {
      success: true,
      data,
      count: data.length,
      message: 'Users retrieved successfully!'
    };

  } catch (error) {
    console.error('❌ List client users error:', error);
    throw error;
  }
}

/**
 * Update user role and permissions
 * @param {string} userId - User ID
 * @param {Object} updateData - Role and permission updates
 * @returns {Promise<Object>} Update result
 */
export async function updateUserRole(userId, updateData) {
  try {
    console.log('🔄 Updating user role...');

    const currentUser = await getCurrentUser();
    if (!currentUser.user) {
      throw new Error('User not authenticated');
    }

    // Get target user
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !targetUser) {
      throw new Error('User not found');
    }

    // Check permissions
    const canUpdate = currentUser.user.role === 'platform_admin' || 
                     (currentUser.client?.id === targetUser.client_id && 
                      ['owner', 'admin'].includes(currentUser.user.role));

    if (!canUpdate) {
      throw new Error('Insufficient permissions to update user role');
    }

    const { data, error } = await supabase
      .from('users')
      .update({
        role: updateData.role,
        permissions: updateData.permissions,
        is_active: updateData.is_active
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update user role: ${error.message}`);
    }

    // Log the activity
    await logActivity('user', userId, 'role_updated', {
      old_role: targetUser.role,
      new_role: updateData.role,
      updated_by: currentUser.user.id
    });

    console.log('✅ User role updated successfully');

    return {
      success: true,
      data,
      message: 'User role updated successfully!'
    };

  } catch (error) {
    console.error('❌ Update user role error:', error);
    throw error;
  }
}

/**
 * Generate a secure invitation token
 * @returns {string} Invitation token
 */
function generateInvitationToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}