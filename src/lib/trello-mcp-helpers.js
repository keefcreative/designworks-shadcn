// Trello MCP Helper Functions
// Clean wrappers around MCP tools with consistent error handling and logging

import { trelloMCP } from './mcp-client.js';

/**
 * Create a new Trello card using MCP
 * @param {Object} cardData - Card creation data
 * @param {string} cardData.name - Card title
 * @param {string} cardData.desc - Card description
 * @param {string} cardData.idList - List ID where card should be created
 * @param {string} [cardData.due] - Due date (ISO string)
 * @param {string[]} [cardData.idLabels] - Array of label IDs
 * @param {string[]} [cardData.idMembers] - Array of member IDs
 * @param {string} [cardData.pos] - Position in list ('top', 'bottom', or number)
 * @returns {Promise<Object>} Created card data
 */
export async function createCard(cardData) {
  try {
    console.log('🎯 Creating Trello card via MCP:', cardData.name);
    
    const result = await trelloMCP.callTool('create_card', {
      name: cardData.name,
      desc: cardData.desc || '',
      idList: cardData.idList,
      due: cardData.due || null,
      idLabels: cardData.idLabels || [],
      idMembers: cardData.idMembers || [],
      pos: cardData.pos || 'top'
    });
    
    console.log('✅ Card created successfully via MCP:', result.id);
    return result;
  } catch (error) {
    console.error('❌ MCP card creation failed:', error.message);
    throw new Error(`MCP card creation failed: ${error.message}`);
  }
}

/**
 * Update an existing Trello card using MCP
 * @param {string} cardId - Card ID to update
 * @param {Object} updates - Fields to update
 * @param {string} [updates.name] - New card title
 * @param {string} [updates.desc] - New card description
 * @param {string} [updates.due] - New due date (ISO string)
 * @param {string[]} [updates.idLabels] - New label IDs
 * @param {string[]} [updates.idMembers] - New member IDs
 * @param {boolean} [updates.closed] - Archive status
 * @returns {Promise<Object>} Updated card data
 */
export async function updateCard(cardId, updates) {
  try {
    console.log('🔄 Updating Trello card via MCP:', cardId);
    
    const result = await trelloMCP.callTool('update_card', {
      id: cardId,
      ...updates
    });
    
    console.log('✅ Card updated successfully via MCP:', cardId);
    return result;
  } catch (error) {
    console.error('❌ MCP card update failed:', error.message);
    throw new Error(`MCP card update failed: ${error.message}`);
  }
}

/**
 * Add a comment to a Trello card using MCP
 * @param {string} cardId - Card ID to comment on
 * @param {string} text - Comment text
 * @returns {Promise<Object>} Created comment data
 */
export async function addComment(cardId, text) {
  try {
    console.log('💬 Adding comment to Trello card via MCP:', cardId);
    
    const result = await trelloMCP.callTool('add_comment', {
      id: cardId,
      text: text
    });
    
    console.log('✅ Comment added successfully via MCP:', cardId);
    return result;
  } catch (error) {
    console.error('❌ MCP comment addition failed:', error.message);
    throw new Error(`MCP comment addition failed: ${error.message}`);
  }
}

/**
 * Get card details using MCP
 * @param {string} cardId - Card ID to retrieve
 * @param {string[]} [fields] - Specific fields to retrieve
 * @returns {Promise<Object>} Card data
 */
export async function getCard(cardId, fields = []) {
  try {
    console.log('📋 Getting Trello card via MCP:', cardId);
    
    const result = await trelloMCP.callTool('get_card', {
      id: cardId,
      fields: fields.length > 0 ? fields.join(',') : 'all'
    });
    
    console.log('✅ Card retrieved successfully via MCP:', cardId);
    return result;
  } catch (error) {
    console.error('❌ MCP card retrieval failed:', error.message);
    throw new Error(`MCP card retrieval failed: ${error.message}`);
  }
}

/**
 * Get list details using MCP
 * @param {string} listId - List ID to retrieve
 * @param {string[]} [fields] - Specific fields to retrieve
 * @returns {Promise<Object>} List data
 */
export async function getList(listId, fields = []) {
  try {
    console.log('📝 Getting Trello list via MCP:', listId);
    
    const result = await trelloMCP.callTool('get_list', {
      id: listId,
      fields: fields.length > 0 ? fields.join(',') : 'all'
    });
    
    console.log('✅ List retrieved successfully via MCP:', listId);
    return result;
  } catch (error) {
    console.error('❌ MCP list retrieval failed:', error.message);
    throw new Error(`MCP list retrieval failed: ${error.message}`);
  }
}

/**
 * Get board details using MCP
 * @param {string} boardId - Board ID to retrieve
 * @param {string[]} [fields] - Specific fields to retrieve
 * @returns {Promise<Object>} Board data
 */
export async function getBoard(boardId, fields = []) {
  try {
    console.log('📊 Getting Trello board via MCP:', boardId);
    
    const result = await trelloMCP.callTool('get_board', {
      id: boardId,
      fields: fields.length > 0 ? fields.join(',') : 'all'
    });
    
    console.log('✅ Board retrieved successfully via MCP:', boardId);
    return result;
  } catch (error) {
    console.error('❌ MCP board retrieval failed:', error.message);
    throw new Error(`MCP board retrieval failed: ${error.message}`);
  }
}

/**
 * Search for cards using MCP
 * @param {string} query - Search query
 * @param {Object} [options] - Search options
 * @param {string[]} [options.idBoards] - Board IDs to search in
 * @param {string[]} [options.idOrganizations] - Organization IDs to search in
 * @param {number} [options.cards_limit] - Maximum number of cards to return
 * @returns {Promise<Object>} Search results
 */
export async function searchCards(query, options = {}) {
  try {
    console.log('🔍 Searching Trello cards via MCP:', query);
    
    const result = await trelloMCP.callTool('search', {
      query: query,
      idBoards: options.idBoards || [],
      idOrganizations: options.idOrganizations || [],
      cards_limit: options.cards_limit || 50
    });
    
    console.log('✅ Card search completed via MCP');
    return result;
  } catch (error) {
    console.error('❌ MCP card search failed:', error.message);
    throw new Error(`MCP card search failed: ${error.message}`);
  }
}

/**
 * Get MCP client status and health information
 * @returns {Promise<Object>} Status information
 */
export async function getMCPStatus() {
  try {
    const status = await trelloMCP.getStatus();
    return {
      ...status,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Failed to get MCP status:', error.message);
    return {
      connected: false,
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Test MCP connection and tool availability
 * @returns {Promise<Object>} Test results
 */
export async function testMCPConnection() {
  try {
    console.log('🧪 Testing MCP connection...');
    
    const status = await getMCPStatus();
    const tools = await trelloMCP.getAvailableTools();
    
    const testResult = {
      connectionTest: status.connected,
      toolsAvailable: tools.length > 0,
      availableTools: tools,
      status: status,
      timestamp: new Date().toISOString()
    };
    
    console.log('✅ MCP connection test completed:', testResult);
    return testResult;
  } catch (error) {
    console.error('❌ MCP connection test failed:', error.message);
    return {
      connectionTest: false,
      toolsAvailable: false,
      availableTools: [],
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Create a new Trello board using custom MCP server
 * @param {string} name - Board name
 * @param {Object} [options] - Board creation options
 * @returns {Promise<Object>} Created board data with lists
 */
export async function createBoard(name, options = {}) {
  try {
    console.log('🏗️ Creating Trello board via custom MCP:', name);
    
    const result = await trelloMCP.callTool('create_board', {
      name: name,
      ...options
    });
    
    console.log('✅ Board created successfully via custom MCP:', result.board?.id);
    return result;
  } catch (error) {
    console.error('❌ Custom MCP board creation failed:', error.message);
    throw new Error(`Custom MCP board creation failed: ${error.message}`);
  }
}

/**
 * Get boards using custom MCP server
 * @param {string} [organizationId] - Optional organization ID to filter boards
 * @returns {Promise<Object>} Boards list
 */
export async function getBoards(organizationId = null) {
  try {
    console.log('📋 Getting Trello boards via custom MCP');
    
    const args = organizationId ? { organization_id: organizationId } : {};
    const result = await trelloMCP.callTool('get_boards', args);
    
    console.log('✅ Boards retrieved successfully via custom MCP');
    return result;
  } catch (error) {
    console.error('❌ Custom MCP boards retrieval failed:', error.message);
    throw new Error(`Custom MCP boards retrieval failed: ${error.message}`);
  }
}

/**
 * Add a member to a Trello board using custom MCP server
 * @param {string} boardId - Board ID
 * @param {string} email - Member email address
 * @param {string} [role] - Member role ('admin', 'normal')
 * @returns {Promise<Object>} Member addition result
 */
export async function addMemberToBoard(boardId, email, role = 'normal') {
  try {
    console.log('👤 Adding member to Trello board via custom MCP:', email);
    
    const result = await trelloMCP.callTool('add_member_to_board', {
      board_id: boardId,
      email: email,
      role: role
    });
    
    console.log('✅ Member added successfully via custom MCP:', email);
    return result;
  } catch (error) {
    console.error('❌ Custom MCP member addition failed:', error.message);
    throw new Error(`Custom MCP member addition failed: ${error.message}`);
  }
}

// Export all helper functions
export default {
  createCard,
  updateCard,
  addComment,
  getCard,
  getList,
  getBoard,
  searchCards,
  getMCPStatus,
  testMCPConnection,
  // Custom MCP server tools
  createBoard,
  getBoards,
  addMemberToBoard
};