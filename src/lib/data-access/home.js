import { supabase } from '../supabaseClient'
import localData from '../../data/home.json'

export async function getHomeData() {
  try {
    const { data, error } = await supabase
      .from('home')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (error) throw error
    
    // Transform Supabase data to match expected structure
    return {
      hero: data.hero,
      services: data.services,
      about: data.about,
      testimonials: data.testimonials,
      teams: data.teams
    }
  } catch (error) {
    console.warn('Supabase fetch failed, using local data:', error.message)
    return localData
  }
}