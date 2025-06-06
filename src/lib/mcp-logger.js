// Enhanced MCP Logging and Monitoring Service
// Provides structured logging, metrics collection, and error tracking
// for Trello MCP integration

import process from 'process';

class MCPLogger {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.logLevel = process.env.LOG_LEVEL || (this.isProduction ? 'info' : 'debug');
    this.metrics = {
      connectionAttempts: 0,
      successfulConnections: 0,
      failedConnections: 0,
      toolCalls: 0,
      successfulToolCalls: 0,
      failedToolCalls: 0,
      boardCreations: 0,
      memberInvitations: 0,
      errors: []
    };
  }

  // Log levels: error, warn, info, debug
  shouldLog(level) {
    const levels = { error: 0, warn: 1, info: 2, debug: 3 };
    return levels[level] <= levels[this.logLevel];
  }

  formatLogEntry(level, message, meta = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      service: 'trello-mcp',
      ...meta
    };

    if (this.isProduction) {
      return JSON.stringify(entry);
    } else {
      // Pretty format for development
      const timestamp = new Date().toLocaleTimeString();
      const levelIcon = {
        error: '❌',
        warn: '⚠️',
        info: 'ℹ️',
        debug: '🔍'
      }[level] || '📝';
      
      return `${levelIcon} [${timestamp}] ${message}${Object.keys(meta).length ? ' ' + JSON.stringify(meta, null, 2) : ''}`;
    }
  }

  error(message, meta = {}) {
    if (this.shouldLog('error')) {
      console.error(this.formatLogEntry('error', message, meta));
    }
    
    // Track error metrics
    this.metrics.errors.push({
      timestamp: new Date().toISOString(),
      message,
      ...meta
    });
    
    // Keep only last 100 errors
    if (this.metrics.errors.length > 100) {
      this.metrics.errors = this.metrics.errors.slice(-100);
    }
  }

  warn(message, meta = {}) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatLogEntry('warn', message, meta));
    }
  }

  info(message, meta = {}) {
    if (this.shouldLog('info')) {
      console.log(this.formatLogEntry('info', message, meta));
    }
  }

  debug(message, meta = {}) {
    if (this.shouldLog('debug')) {
      console.log(this.formatLogEntry('debug', message, meta));
    }
  }

  // Connection tracking
  logConnectionAttempt(serverUrl) {
    this.metrics.connectionAttempts++;
    this.info('MCP connection attempt', { serverUrl, attempt: this.metrics.connectionAttempts });
  }

  logConnectionSuccess(serverUrl, availableTools = []) {
    this.metrics.successfulConnections++;
    this.info('MCP connection successful', { 
      serverUrl, 
      toolCount: availableTools.length,
      tools: availableTools 
    });
  }

  logConnectionFailure(serverUrl, error) {
    this.metrics.failedConnections++;
    this.error('MCP connection failed', { 
      serverUrl, 
      error: error.message,
      stack: error.stack 
    });
  }

  // Tool call tracking
  logToolCall(toolName, args = {}) {
    this.metrics.toolCalls++;
    this.debug('MCP tool call', { 
      tool: toolName, 
      args: this.sanitizeArgs(args),
      callId: this.generateCallId()
    });
  }

  logToolSuccess(toolName, result, duration) {
    this.metrics.successfulToolCalls++;
    this.info('MCP tool call successful', { 
      tool: toolName, 
      duration: `${duration}ms`,
      resultType: typeof result
    });
  }

  logToolFailure(toolName, error, duration) {
    this.metrics.failedToolCalls++;
    this.error('MCP tool call failed', { 
      tool: toolName, 
      error: error.message,
      duration: `${duration}ms`
    });
  }

  // Business logic tracking
  logBoardCreation(clientId, boardData) {
    this.metrics.boardCreations++;
    this.info('Trello board created', {
      clientId,
      boardId: boardData.id,
      boardUrl: boardData.url,
      listCount: Object.keys(boardData.lists || {}).length
    });
  }

  logMemberInvitation(boardId, email, success) {
    this.metrics.memberInvitations++;
    if (success) {
      this.info('Member invited to board', { boardId, email });
    } else {
      this.warn('Member invitation failed', { boardId, email });
    }
  }

  logClientSignup(clientId, trelloEnabled, boardCreated) {
    this.info('Client signup completed', {
      clientId,
      trelloEnabled,
      boardCreated,
      timestamp: new Date().toISOString()
    });
  }

  // Utility methods
  sanitizeArgs(args) {
    // Remove sensitive information from logs
    const sanitized = { ...args };
    const sensitiveKeys = ['api_key', 'token', 'password', 'secret'];
    
    sensitiveKeys.forEach(key => {
      if (sanitized[key]) {
        sanitized[key] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  generateCallId() {
    return Math.random().toString(36).substr(2, 9);
  }

  // Metrics and health
  getMetrics() {
    const uptime = process.uptime();
    const successRate = this.metrics.toolCalls > 0 
      ? (this.metrics.successfulToolCalls / this.metrics.toolCalls * 100).toFixed(2)
      : 0;
    
    return {
      ...this.metrics,
      uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
      successRate: `${successRate}%`,
      timestamp: new Date().toISOString()
    };
  }

  getHealthStatus() {
    const metrics = this.getMetrics();
    const recentErrors = this.metrics.errors.filter(
      error => new Date() - new Date(error.timestamp) < 5 * 60 * 1000 // Last 5 minutes
    );
    
    const status = {
      healthy: true,
      checks: {
        connectionSuccess: this.metrics.successfulConnections > 0,
        recentErrors: recentErrors.length < 5,
        successRate: parseFloat(metrics.successRate) > 80
      }
    };
    
    status.healthy = Object.values(status.checks).every(check => check);
    
    return {
      ...status,
      metrics,
      recentErrorCount: recentErrors.length,
      timestamp: new Date().toISOString()
    };
  }

  // Performance monitoring
  startTimer(operation) {
    const startTime = Date.now();
    return {
      end: () => Date.now() - startTime,
      operation
    };
  }

  // Periodic metrics logging (call this from a setInterval)
  logPeriodicMetrics() {
    if (this.shouldLog('info')) {
      const metrics = this.getMetrics();
      this.info('Periodic metrics report', metrics);
    }
  }

  // Reset metrics (useful for testing)
  resetMetrics() {
    this.metrics = {
      connectionAttempts: 0,
      successfulConnections: 0,
      failedConnections: 0,
      toolCalls: 0,
      successfulToolCalls: 0,
      failedToolCalls: 0,
      boardCreations: 0,
      memberInvitations: 0,
      errors: []
    };
  }
}

// Export singleton instance
export const mcpLogger = new MCPLogger();

// Export class for testing
export { MCPLogger };

// Start periodic metrics logging in production
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    mcpLogger.logPeriodicMetrics();
  }, 5 * 60 * 1000); // Every 5 minutes
}