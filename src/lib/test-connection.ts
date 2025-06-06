// Test database connectivity and MCP server communication
import { supabase } from './supabase/client'

export async function testDatabaseConnection() {
  try {
    console.log('🔄 Testing Supabase connection...')
    
    // Test basic connection
    const { data, error } = await supabase
      .from('clients')
      .select('id, name')
      .limit(1)
    
    if (error) {
      console.error('❌ Database connection failed:', error)
      return { success: false, error: error.message }
    }
    
    console.log('✅ Database connection successful')
    return { success: true, data }
    
  } catch (error: any) {
    console.error('❌ Database test error:', error)
    return { success: false, error: error.message }
  }
}

export async function testMCPServer() {
  try {
    console.log('🔄 Testing MCP server connection...')
    
    const mcpUrl = process.env.MCP_SERVER_URL || 'dwb-mcp-server-trello.fly.dev'
    const response = await fetch(`https://${mcpUrl}/health`)
    
    if (!response.ok) {
      throw new Error(`MCP server responded with status: ${response.status}`)
    }
    
    const healthData = await response.json()
    console.log('✅ MCP server connection successful')
    return { success: true, data: healthData }
    
  } catch (error: any) {
    console.error('❌ MCP server test error:', error)
    return { success: false, error: error.message }
  }
}

export async function testEnvironmentVariables() {
  console.log('🔄 Testing environment variables...')
  
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'TRELLO_API_KEY',
    'TRELLO_TOKEN'
  ]
  
  const missing: string[] = []
  const present: string[] = []
  
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      present.push(varName)
    } else {
      missing.push(varName)
    }
  })
  
  if (missing.length > 0) {
    console.error('❌ Missing environment variables:', missing)
    return { success: false, missing, present }
  }
  
  console.log('✅ All environment variables present')
  return { success: true, present }
}

export async function runAllTests() {
  console.log('🚀 Running all integration tests...\n')
  
  const envTest = await testEnvironmentVariables()
  const dbTest = await testDatabaseConnection()
  const mcpTest = await testMCPServer()
  
  console.log('\n📊 Test Results:')
  console.log('Environment Variables:', envTest.success ? '✅ PASS' : '❌ FAIL')
  console.log('Database Connection:', dbTest.success ? '✅ PASS' : '❌ FAIL')
  console.log('MCP Server:', mcpTest.success ? '✅ PASS' : '❌ FAIL')
  
  const allPassed = envTest.success && dbTest.success && mcpTest.success
  
  if (allPassed) {
    console.log('\n🎉 All tests passed! Backend integration is ready.')
  } else {
    console.log('\n⚠️ Some tests failed. Please check the configuration.')
  }
  
  return {
    success: allPassed,
    results: {
      environment: envTest,
      database: dbTest,
      mcp: mcpTest
    }
  }
}