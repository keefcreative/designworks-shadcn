import { supabase } from '../supabaseClient'
import localData from '../../data/home.json'

// Test function to simulate Supabase failure
export async function testFallbackMechanism() {
  try {
    // Simulate a network error by using an invalid table name
    const { data, error } = await supabase
      .from('nonexistent_table')
      .select('*')
      .limit(1)
      .single()
    
    if (error) throw error
    
    return {
      source: 'supabase',
      data: data
    }
  } catch (error) {
    console.warn('Supabase fetch failed (expected for test), using local data:', error.message)
    return {
      source: 'fallback',
      data: localData
    }
  }
}

// Test function to verify Supabase connection works
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('home')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (error) throw error
    
    return {
      source: 'supabase',
      data: {
        hero: data.hero,
        services: data.services,
        about: data.about,
        testimonials: data.testimonials,
        teams: data.teams
      }
    }
  } catch (error) {
    console.warn('Supabase connection test failed:', error.message)
    return {
      source: 'error',
      error: error.message
    }
  }
}