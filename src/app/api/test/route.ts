import { NextResponse } from 'next/server'
import { runAllTests } from '@/lib/test-connection'

export async function GET() {
  try {
    const results = await runAllTests()
    
    return NextResponse.json(results, {
      status: results.success ? 200 : 500
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}