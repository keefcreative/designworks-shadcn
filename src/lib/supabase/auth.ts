// Authentication service (converted from auth-mcp.js)
import { supabase } from './client'
import { logActivity } from './db'

export interface SignUpData {
  email: string
  password: string
  full_name: string
  client_id?: string
}

export interface SignInData {
  email: string
  password: string
}

/**
 * Sign up a new user
 */
export async function signUp(userData: SignUpData) {
  try {
    console.log('🔄 Registering new user...')

    const { email, password, full_name, client_id } = userData

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: full_name,
          client_id: client_id
        }
      }
    })

    if (authError) {
      throw new Error(`Registration failed: ${authError.message}`)
    }

    // Update user record with client association
    if (authData.user && client_id) {
      const { error: updateError } = await supabase
        .from('users')
        .update({ client_id: client_id })
        .eq('id', authData.user.id)

      if (updateError) {
        console.error('❌ Failed to associate user with client:', updateError)
      }
    }

    console.log('✅ User registered successfully')

    return {
      success: true,
      user: authData.user,
      session: authData.session,
      message: 'Registration successful! Please check your email to verify your account.'
    }

  } catch (error) {
    console.error('❌ Sign up error:', error)
    throw error
  }
}

/**
 * Sign in an existing user
 */
export async function signIn(credentials: SignInData) {
  try {
    console.log('🔄 Signing in user...')

    const { email, password } = credentials

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      throw new Error(`Login failed: ${error.message}`)
    }

    // Update last login timestamp
    if (data.user) {
      await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', data.user.id)

      // Log the login activity
      const { data: userData } = await supabase
        .from('users')
        .select('client_id')
        .eq('id', data.user.id)
        .single()

      if (userData?.client_id) {
        await logActivity('user', data.user.id, 'login', {
          email: data.user.email,
          login_method: 'email_password'
        })
      }
    }

    console.log('✅ User signed in successfully')

    return {
      success: true,
      user: data.user,
      session: data.session,
      message: 'Login successful!'
    }

  } catch (error) {
    console.error('❌ Sign in error:', error)
    throw error
  }
}

/**
 * Sign in with OAuth provider
 */
export async function signInWithOAuth(provider: string, options: any = {}) {
  try {
    console.log(`🔄 Signing in with ${provider}...`)

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider as any,
      options: {
        redirectTo: options.redirectTo || `${window.location.origin}/auth/callback`,
        ...options
      }
    })

    if (error) {
      throw new Error(`OAuth login failed: ${error.message}`)
    }

    console.log(`✅ OAuth login initiated for ${provider}`)

    return {
      success: true,
      data,
      message: `Redirecting to ${provider} for authentication...`
    }

  } catch (error) {
    console.error('❌ OAuth sign in error:', error)
    throw error
  }
}

/**
 * Sign out the current user
 */
export async function signOut() {
  try {
    console.log('🔄 Signing out user...')

    // Get current user before signing out for logging
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { data: userData } = await supabase
        .from('users')
        .select('client_id')
        .eq('id', user.id)
        .single()

      if (userData?.client_id) {
        await logActivity('user', user.id, 'logout', {
          email: user.email
        })
      }
    }

    const { error } = await supabase.auth.signOut()

    if (error) {
      throw new Error(`Logout failed: ${error.message}`)
    }

    console.log('✅ User signed out successfully')

    return {
      success: true,
      message: 'Logged out successfully!'
    }

  } catch (error) {
    console.error('❌ Sign out error:', error)
    throw error
  }
}

/**
 * Reset user password
 */
export async function resetPassword(email: string) {
  try {
    console.log('🔄 Sending password reset email...')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    })

    if (error) {
      throw new Error(`Password reset failed: ${error.message}`)
    }

    console.log('✅ Password reset email sent')

    return {
      success: true,
      message: 'Password reset email sent! Please check your inbox.'
    }

  } catch (error) {
    console.error('❌ Reset password error:', error)
    throw error
  }
}

/**
 * Update user password
 */
export async function updatePassword(newPassword: string) {
  try {
    console.log('🔄 Updating user password...')

    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      throw new Error(`Password update failed: ${error.message}`)
    }

    // Log the password change
    if (data.user) {
      const { data: userData } = await supabase
        .from('users')
        .select('client_id')
        .eq('id', data.user.id)
        .single()

      if (userData?.client_id) {
        await logActivity('user', data.user.id, 'password_changed', {
          email: data.user.email
        })
      }
    }

    console.log('✅ Password updated successfully')

    return {
      success: true,
      user: data.user,
      message: 'Password updated successfully!'
    }

  } catch (error) {
    console.error('❌ Update password error:', error)
    throw error
  }
}

/**
 * Get current authenticated user with client info
 */
export async function getCurrentUser() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { user: null, client: null }
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        *,
        client:clients(*)
      `)
      .eq('id', user.id)
      .single()

    if (userError) {
      console.error('❌ Failed to get user data:', userError)
      return { user: user, client: null }
    }

    return {
      user: userData,
      client: userData.client,
      auth_user: user
    }

  } catch (error) {
    console.error('❌ Get current user error:', error)
    return { user: null, client: null }
  }
}

/**
 * Update user profile
 */
export async function updateProfile(profileData: any) {
  try {
    console.log('🔄 Updating user profile...')

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Update auth metadata if needed
    const authUpdates: any = {}
    if (profileData.full_name) {
      authUpdates.data = { full_name: profileData.full_name }
    }

    if (Object.keys(authUpdates).length > 0) {
      const { error: authError } = await supabase.auth.updateUser(authUpdates)
      if (authError) {
        throw new Error(`Failed to update auth profile: ${authError.message}`)
      }
    }

    // Update user table
    const { data, error } = await supabase
      .from('users')
      .update({
        full_name: profileData.full_name,
        avatar_url: profileData.avatar_url
      })
      .eq('id', user.id)
      .select(`
        *,
        client:clients(*)
      `)
      .single()

    if (error) {
      throw new Error(`Failed to update profile: ${error.message}`)
    }

    // Log the profile update
    if (data.client_id) {
      await logActivity('user', user.id, 'profile_updated', {
        updated_fields: Object.keys(profileData)
      })
    }

    console.log('✅ Profile updated successfully')

    return {
      success: true,
      user: data,
      message: 'Profile updated successfully!'
    }

  } catch (error) {
    console.error('❌ Update profile error:', error)
    throw error
  }
}

/**
 * Check if user has permission for an action
 */
export async function hasPermission(permission: string, user: any = null): Promise<boolean> {
  try {
    if (!user) {
      const currentUser = await getCurrentUser()
      user = currentUser.user
    }

    if (!user) {
      return false
    }

    // Platform admins have all permissions
    if (user.role === 'platform_admin') {
      return true
    }

    // Check role-based permissions
    const rolePermissions: Record<string, string[]> = {
      owner: ['*'], // All permissions
      admin: [
        'manage_users',
        'manage_requests',
        'view_analytics',
        'manage_settings'
      ],
      member: [
        'create_requests',
        'view_own_requests',
        'update_own_profile'
      ]
    }

    const userPermissions = rolePermissions[user.role] || []
    
    // Check if user has wildcard permission or specific permission
    return userPermissions.includes('*') || 
           userPermissions.includes(permission) ||
           (user.permissions && user.permissions.includes(permission))

  } catch (error) {
    console.error('❌ Permission check error:', error)
    return false
  }
}

export const auth = {
  signUp,
  signIn,
  signInWithOAuth,
  signOut,
  resetPassword,
  updatePassword,
  getCurrentUser,
  updateProfile,
  hasPermission
}