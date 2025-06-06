// Trello Board Setup Service
// Handles client board creation, management, and member invitations
// Uses custom dwb-mcp-server-trello for enhanced functionality

import { trelloMCP } from './mcp-client.js';
import { supabase } from './supabaseClient.js';
import { logActivity } from './supabase-mcp.js';

/**
 * Setup a Trello board for a new client
 * @param {Object} clientData - Client information
 * @param {Object} options - Setup options
 * @returns {Promise<Object>} Setup result
 */
export async function setupClientTrelloBoard(clientData, options = {}) {
  try {
    console.log('🔄 Setting up Trello board for client:', clientData.name);

    const { 
      setupTrello = true, 
      inviteMembers = [], 
      boardName = null 
    } = options;

    if (!setupTrello) {
      return {
        success: true,
        skipped: true,
        message: 'Trello setup skipped by user preference'
      };
    }

    // Create the board using custom MCP server
    const boardResult = await createBoardViaMCP(boardName || `${clientData.name} - Project Board`);
    
    if (!boardResult.success) {
      throw new Error(`Board creation failed: ${boardResult.error}`);
    }

    const { board, lists } = boardResult.data;

    // Store board information in Supabase
    const { error: updateError } = await supabase
      .from('clients')
      .update({
        trello_board_id: board.id,
        trello_board_url: board.url,
        trello_list_ids: lists,
        trello_setup_completed: true,
        trello_config: {
          ...clientData.trello_config,
          board_id: board.id,
          list_id: lists.in_progress || Object.values(lists)[0] // Default to first list
        }
      })
      .eq('id', clientData.id);

    if (updateError) {
      console.error('❌ Failed to update client with board info:', updateError);
      // Don't throw here - board was created successfully
    }

    // Add client owner to board if email provided
    if (clientData.owner_email) {
      try {
        await addMemberToBoardViaMCP(board.id, clientData.owner_email, 'admin');
        console.log('✅ Added client owner to board');
      } catch (memberError) {
        console.warn('⚠️ Failed to add owner to board:', memberError.message);
      }
    }

    // Invite additional team members if provided
    if (inviteMembers && inviteMembers.length > 0) {
      const memberResults = await inviteTeamMembersToBoard(board.id, inviteMembers);
      console.log(`📧 Invited ${memberResults.successful} of ${inviteMembers.length} team members`);
    }

    // Log the activity
    await logActivity('client', clientData.id, 'trello_board_created', {
      board_id: board.id,
      board_url: board.url,
      lists_created: Object.keys(lists).length,
      members_invited: inviteMembers.length
    });

    console.log('✅ Trello board setup completed successfully');

    return {
      success: true,
      data: {
        board,
        lists,
        board_url: board.url
      },
      message: 'Trello board created and configured successfully!'
    };

  } catch (error) {
    console.error('❌ Trello board setup error:', error);
    
    // Log the failure
    if (clientData.id) {
      await logActivity('client', clientData.id, 'trello_board_setup_failed', {
        error: error.message
      });
    }

    return {
      success: false,
      error: error.message,
      message: 'Failed to setup Trello board. You can try again later from client settings.'
    };
  }
}

/**
 * Reset/recreate a Trello board for an existing client
 * @param {string} clientId - Client ID
 * @returns {Promise<Object>} Reset result
 */
export async function resetClientTrelloBoard(clientId) {
  try {
    console.log('🔄 Resetting Trello board for client:', clientId);

    // Get client data
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      throw new Error('Client not found');
    }

    // Create new board
    const boardResult = await createBoardViaMCP(`${client.name} - Project Board (Reset)`);
    
    if (!boardResult.success) {
      throw new Error(`Board creation failed: ${boardResult.error}`);
    }

    const { board, lists } = boardResult.data;

    // Update client with new board info
    const { error: updateError } = await supabase
      .from('clients')
      .update({
        trello_board_id: board.id,
        trello_board_url: board.url,
        trello_list_ids: lists,
        trello_setup_completed: true,
        trello_config: {
          ...client.trello_config,
          board_id: board.id,
          list_id: lists.in_progress || Object.values(lists)[0]
        }
      })
      .eq('id', clientId);

    if (updateError) {
      throw new Error(`Failed to update client: ${updateError.message}`);
    }

    // Log the activity
    await logActivity('client', clientId, 'trello_board_reset', {
      old_board_id: client.trello_board_id,
      new_board_id: board.id,
      new_board_url: board.url
    });

    console.log('✅ Trello board reset completed successfully');

    return {
      success: true,
      data: {
        board,
        lists,
        board_url: board.url
      },
      message: 'Trello board reset successfully!'
    };

  } catch (error) {
    console.error('❌ Trello board reset error:', error);
    throw error;
  }
}

/**
 * Invite team members to a Trello board
 * @param {string} boardId - Trello board ID
 * @param {Array} memberEmails - Array of email addresses or member objects
 * @returns {Promise<Object>} Invitation results
 */
export async function inviteTeamMembersToBoard(boardId, memberEmails) {
  try {
    console.log('📧 Inviting team members to board:', boardId);

    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const member of memberEmails) {
      try {
        const email = typeof member === 'string' ? member : member.email;
        const role = typeof member === 'object' ? member.role || 'normal' : 'normal';
        
        await addMemberToBoardViaMCP(boardId, email, role);
        results.successful++;
        console.log(`✅ Invited ${email} to board`);
      } catch (error) {
        results.failed++;
        results.errors.push({
          email: typeof member === 'string' ? member : member.email,
          error: error.message
        });
        console.warn(`⚠️ Failed to invite ${typeof member === 'string' ? member : member.email}:`, error.message);
      }
    }

    return results;

  } catch (error) {
    console.error('❌ Team member invitation error:', error);
    throw error;
  }
}

/**
 * Create a Trello board using the custom MCP server
 * @param {string} boardName - Name for the new board
 * @returns {Promise<Object>} Board creation result
 */
async function createBoardViaMCP(boardName) {
  try {
    console.log('🔧 Creating board via MCP:', boardName);

    // Call the custom MCP server's create_board tool
    const response = await trelloMCP.callTool('create_board', {
      name: boardName
    });

    if (!response || !response.board) {
      throw new Error('Invalid response from MCP server');
    }

    // Extract board and lists information
    const board = response.board;
    const lists = response.lists || {};

    return {
      success: true,
      data: {
        board: {
          id: board.id,
          name: board.name,
          url: board.url
        },
        lists
      }
    };

  } catch (error) {
    console.error('❌ MCP board creation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Add a member to a Trello board using the custom MCP server
 * @param {string} boardId - Trello board ID
 * @param {string} email - Member email address
 * @param {string} role - Member role (admin, normal)
 * @returns {Promise<Object>} Member addition result
 */
async function addMemberToBoardViaMCP(boardId, email, role = 'normal') {
  try {
    console.log('👤 Adding member to board via MCP:', email);

    // Call the custom MCP server's add_member_to_board tool
    const response = await trelloMCP.callTool('add_member_to_board', {
      board_id: boardId,
      email: email,
      role: role
    });

    return response;

  } catch (error) {
    console.error('❌ MCP member addition error:', error);
    throw error;
  }
}

/**
 * Get boards for a client using the custom MCP server
 * @param {string} organizationId - Optional organization ID to filter boards
 * @returns {Promise<Object>} Boards list
 */
export async function getBoardsForClient(organizationId = null) {
  try {
    console.log('📋 Getting boards via MCP');

    const args = organizationId ? { organization_id: organizationId } : {};
    const response = await trelloMCP.callTool('get_boards', args);

    return {
      success: true,
      data: response.boards || [],
      message: 'Boards retrieved successfully'
    };

  } catch (error) {
    console.error('❌ MCP get boards error:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}

/**
 * Check if Trello board setup is completed for a client
 * @param {string} clientId - Client ID
 * @returns {Promise<Object>} Setup status
 */
export async function checkTrelloBoardStatus(clientId) {
  try {
    const { data: client, error } = await supabase
      .from('clients')
      .select('trello_board_id, trello_board_url, trello_setup_completed, trello_list_ids')
      .eq('id', clientId)
      .single();

    if (error) {
      throw new Error(`Failed to get client: ${error.message}`);
    }

    return {
      success: true,
      data: {
        hasBoard: !!client.trello_board_id,
        boardId: client.trello_board_id,
        boardUrl: client.trello_board_url,
        setupCompleted: client.trello_setup_completed,
        lists: client.trello_list_ids || {}
      }
    };

  } catch (error) {
    console.error('❌ Board status check error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}