// MCP Client Service for Trello Integration
// Handles connection, health monitoring, and tool availability tracking

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { mcpLogger } from './mcp-logger.js';
import process from 'process';

class TrelloMCPClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.availableTools = [];
    this.lastHealthCheck = null;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 3;
  }

  async connect() {
    this.connectionAttempts++;
    const serverUrl = process.env.NODE_ENV === 'production'
      ? (process.env.TRELLO_MCP_URL || 'https://dwb-mcp-server-trello.fly.dev')
      : 'http://localhost:3001';
    
    mcpLogger.logConnectionAttempt(serverUrl);

    try {
      const transport = new StdioClientTransport({
        command: process.env.NODE_ENV === 'production' ? 'npx' : 'node',
        args: process.env.NODE_ENV === 'production'
          ? ['dwb-mcp-server-trello', '--url', process.env.TRELLO_MCP_URL || 'https://dwb-mcp-server-trello.fly.dev']
          : ['mcp-server/index.js', '--port', '3001']
      });
      
      this.client = new Client({
        name: "trello-integration",
        version: "1.0.0"
      }, {
        capabilities: {}
      });

      await this.client.connect(transport);
      this.isConnected = true;
      this.connectionAttempts = 0; // Reset on successful connection
      
      // Get available tools
      await this.refreshAvailableTools();
      
      mcpLogger.logConnectionSuccess(serverUrl, this.availableTools);
      
      return true;
    } catch (error) {
      mcpLogger.logConnectionFailure(serverUrl, error);
      this.isConnected = false;
      this.availableTools = [];
      
      if (this.connectionAttempts >= this.maxConnectionAttempts) {
        mcpLogger.error('Max MCP connection attempts reached. Falling back to direct API.', {
          attempts: this.connectionAttempts,
          maxAttempts: this.maxConnectionAttempts
        });
        this.connectionAttempts = 0; // Reset for future attempts
      }
      
      return false;
    }
  }

  async refreshAvailableTools() {
    try {
      if (!this.client) {
        throw new Error('MCP client not initialized');
      }

      const result = await this.client.listTools();
      this.availableTools = result.tools ? result.tools.map(tool => tool.name) : [];
      this.lastHealthCheck = new Date().toISOString();
      
      console.log(`🔧 Refreshed available tools: ${this.availableTools.length} tools found`);
    } catch (error) {
      console.warn('⚠️ Failed to refresh available tools:', error.message);
      this.availableTools = [];
    }
  }

  async getAvailableTools() {
    if (!this.isConnected) {
      const connected = await this.connect();
      if (!connected) {
        return [];
      }
    }
    return this.availableTools;
  }

  async getStatus() {
    return {
      connected: this.isConnected,
      status: this.isConnected ? 'ready' : 'unavailable',
      availableTools: this.availableTools,
      lastHealthCheck: this.lastHealthCheck,
      connectionAttempts: this.connectionAttempts
    };
  }

  async callTool(name, arguments_) {
    if (!this.isConnected) {
      const connected = await this.connect();
      if (!connected) {
        throw new Error('MCP client not connected and connection failed');
      }
    }
    
    if (!this.availableTools.includes(name)) {
      throw new Error(`Tool '${name}' not available. Available tools: ${this.availableTools.join(', ')}`);
    }
    
    try {
      console.log(`🔧 Calling MCP tool: ${name}`);
      const result = await this.client.callTool({
        name,
        arguments: arguments_
      });
      
      // Handle different response formats
      if (result.content && result.content.length > 0) {
        const content = result.content[0];
        if (content.type === 'text' && content.text) {
          try {
            return JSON.parse(content.text);
          } catch {
            return { data: content.text };
          }
        }
        return content;
      }
      
      return result;
    } catch (error) {
      console.error(`❌ MCP tool call failed for ${name}:`, error.message);
      
      // Reset connection on certain errors
      if (error.message.includes('connection') || error.message.includes('transport')) {
        this.isConnected = false;
        this.availableTools = [];
      }
      
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.client) {
        await this.client.close();
      }
      this.isConnected = false;
      this.availableTools = [];
      this.client = null;
      console.log('🔌 MCP Trello client disconnected');
    } catch (error) {
      console.warn('⚠️ Error during MCP client disconnect:', error.message);
    }
  }
}

// Export singleton instance
export const trelloMCP = new TrelloMCPClient();

// Export class for testing
export { TrelloMCPClient };