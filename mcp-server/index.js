#!/usr/bin/env node

// Custom Trello MCP Server
// Provides enhanced Trello integration with board creation and member management
// Compatible with Model Context Protocol

import { config } from 'dotenv';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import process from 'node:process';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from parent directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env.local') });

class TrelloMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'dwb-mcp-server-trello',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.apiKey = process.env.TRELLO_API_KEY;
    this.token = process.env.TRELLO_TOKEN;
    
    if (!this.apiKey || !this.token) {
      console.error('❌ Missing Trello credentials. Set TRELLO_API_KEY and TRELLO_TOKEN environment variables.');
      process.exit(1);
    }

    this.setupHandlers();
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'create_board',
            description: 'Create a new Trello board with default client onboarding template',
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Name of the board to create'
                },
                desc: {
                  type: 'string',
                  description: 'Description of the board (optional)'
                }
              },
              required: ['name']
            }
          },
          {
            name: 'get_boards',
            description: 'Get list of boards, optionally filtered by organization',
            inputSchema: {
              type: 'object',
              properties: {
                organization_id: {
                  type: 'string',
                  description: 'Optional organization ID to filter boards'
                }
              }
            }
          },
          {
            name: 'add_member_to_board',
            description: 'Add a member to a board with specified role',
            inputSchema: {
              type: 'object',
              properties: {
                board_id: {
                  type: 'string',
                  description: 'ID of the board'
                },
                email: {
                  type: 'string',
                  description: 'Email address of the member to add'
                },
                role: {
                  type: 'string',
                  enum: ['admin', 'normal'],
                  description: 'Role for the member (admin or normal)',
                  default: 'normal'
                }
              },
              required: ['board_id', 'email']
            }
          },
          // Legacy tools for compatibility
          {
            name: 'add_card_to_list',
            description: 'Add a card to a Trello list',
            inputSchema: {
              type: 'object',
              properties: {
                list_id: { type: 'string', description: 'ID of the list' },
                name: { type: 'string', description: 'Name of the card' },
                desc: { type: 'string', description: 'Description of the card' }
              },
              required: ['list_id', 'name']
            }
          },
          {
            name: 'get_lists',
            description: 'Get lists from a Trello board',
            inputSchema: {
              type: 'object',
              properties: {
                board_id: { type: 'string', description: 'ID of the board' }
              },
              required: ['board_id']
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'create_board':
            return await this.createBoard(args);
          case 'get_boards':
            return await this.getBoards(args);
          case 'add_member_to_board':
            return await this.addMemberToBoard(args);
          case 'add_card_to_list':
            return await this.addCardToList(args);
          case 'get_lists':
            return await this.getLists(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: error.message,
                tool: name,
                timestamp: new Date().toISOString()
              })
            }
          ]
        };
      }
    });
  }

  async createBoard(args) {
    const { name, desc = '' } = args;
    
    console.log(`🏗️ Creating board: ${name}`);
    
    // Create the board
    const boardResponse = await this.callTrelloAPI('POST', '/boards', {
      name,
      desc,
      defaultLists: false // We'll create custom lists
    });

    // Create default client onboarding lists
    const defaultLists = [
      'Welcome & Setup',
      'Requirements Gathering', 
      'Design Brief',
      'In Progress',
      'Client Review',
      'Completed'
    ];

    const lists = {};
    for (const listName of defaultLists) {
      const listResponse = await this.callTrelloAPI('POST', '/lists', {
        name: listName,
        idBoard: boardResponse.id
      });
      
      // Convert to snake_case key
      const key = listName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
      lists[key] = listResponse.id;
    }

    const result = {
      board: {
        id: boardResponse.id,
        name: boardResponse.name,
        url: boardResponse.url
      },
      lists
    };

    console.log(`✅ Board created: ${boardResponse.id}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result)
        }
      ]
    };
  }

  async getBoards(args) {
    const { organization_id } = args;
    
    console.log('📋 Getting boards...');
    
    let url = '/members/me/boards';
    if (organization_id) {
      url = `/organizations/${organization_id}/boards`;
    }

    const boards = await this.callTrelloAPI('GET', url);
    
    const result = {
      boards: boards.map(board => ({
        id: board.id,
        name: board.name,
        url: board.url,
        closed: board.closed
      }))
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result)
        }
      ]
    };
  }

  async addMemberToBoard(args) {
    const { board_id, email, role = 'normal' } = args;
    
    console.log(`👤 Adding member ${email} to board ${board_id}`);
    
    // Add member to board
    await this.callTrelloAPI('PUT', `/boards/${board_id}/members`, {
      email,
      type: role
    });

    const result = {
      success: true,
      member: {
        email,
        role,
        board_id
      }
    };

    console.log(`✅ Member added: ${email}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result)
        }
      ]
    };
  }

  async addCardToList(args) {
    const { list_id, name, desc = '' } = args;
    
    const cardResponse = await this.callTrelloAPI('POST', '/cards', {
      name,
      desc,
      idList: list_id
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            id: cardResponse.id,
            name: cardResponse.name,
            url: cardResponse.url
          })
        }
      ]
    };
  }

  async getLists(args) {
    const { board_id } = args;
    
    const lists = await this.callTrelloAPI('GET', `/boards/${board_id}/lists`);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            lists: lists.map(list => ({
              id: list.id,
              name: list.name,
              closed: list.closed
            }))
          })
        }
      ]
    };
  }

  async callTrelloAPI(method, endpoint, data = {}) {
    const url = `https://api.trello.com/1${endpoint}`;
    const params = new URLSearchParams({
      key: this.apiKey,
      token: this.token,
      ...data
    });

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (method === 'GET') {
      const response = await fetch(`${url}?${params}`);
      if (!response.ok) {
        throw new Error(`Trello API error: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } else {
      options.body = params;
      options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`Trello API error: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    }
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('🚀 Trello MCP Server started');
  }
}

// Health check endpoint for Fly.io
if (process.argv.includes('--health')) {
  console.log('OK');
  process.exit(0);
}

// HTTP wrapper for Fly.io deployment
if (process.env.NODE_ENV === 'production' || process.argv.includes('--http')) {
  const app = express();
  const PORT = process.env.PORT || 8080;

  app.use(express.json());

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).send('OK');
  });

  // Status endpoint
  app.get('/status', (req, res) => {
    res.json({
      name: 'dwb-mcp-server-trello',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
      tools: ['create_board', 'get_boards', 'add_member_to_board']
    });
  });

  // MCP tools endpoint (for testing)
  app.post('/tools/:toolName', async (req, res) => {
    try {
      const { toolName } = req.params;
      const args = req.body;

      const mcpServer = new TrelloMCPServer();
      
      let result;
      switch (toolName) {
        case 'create_board':
          result = await mcpServer.createBoard(args);
          break;
        case 'get_boards':
          result = await mcpServer.getBoards(args);
          break;
        case 'add_member_to_board':
          result = await mcpServer.addMemberToBoard(args);
          break;
        default:
          return res.status(400).json({ error: `Unknown tool: ${toolName}` });
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 HTTP wrapper listening on port ${PORT}`);
    console.log(`🚀 Trello MCP Server HTTP mode started`);
  });
} else {
  // Start the MCP server in stdio mode
  const server = new TrelloMCPServer();
  server.start().catch(console.error);
}