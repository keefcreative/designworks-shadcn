// Authentication MCP Service
// Handles user authentication, registration, and session management
// Integrates with Supabase Auth and multi-client system

import { supabase } from './supabaseClient.js';
import { logActivity } from './supabase-mcp.js';

/**
 * Sign up a new user
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} Registration result
 */
export async function signUp(userData) {
  try {
    console.log('🔄 Registering new user...');

    const { email, password, full_name, client_id } = userData;

    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: full_name,
          client_id: client_id
        }
      }
    });

    if (authError) {
      throw new Error(`Registration failed: ${authError.message}`);
    }

    // Update user record with client association
    if (authData.user && client_id) {
      const { error: updateError } = await supabase
        .from('users')
        .update({ client_id: client_id })
        .eq('id', authData.user.id);

      if (updateError) {
        console.error('❌ Failed to associate user with client:', updateError);
      }
    }

    console.log('✅ User registered successfully');

    return {
      success: true,
      user: authData.user,
      session: authData.session,
      message: 'Registration successful! Please check your email to verify your account.'
    };

  } catch (error) {
    console.error('❌ Sign up error:', error);
    throw error;
  }
}

/**
 * Sign in an existing user
 * @param {Object} credentials - Login credentials
 * @returns {Promise<Object>} Login result
 */
export async function signIn(credentials) {
  try {
    console.log('🔄 Signing in user...');

    const { email, password } = credentials;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw new Error(`Login failed: ${error.message}`);
    }

    // Update last login timestamp
    if (data.user) {
      await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', data.user.id);

      // Log the login activity
      const { data: userData } = await supabase
        .from('users')
        .select('client_id')
        .eq('id', data.user.id)
        .single();

      if (userData?.client_id) {
        await logActivity('user', data.user.id, 'login', {
          email: data.user.email,
          login_method: 'email_password'
        });
      }
    }

    console.log('✅ User signed in successfully');

    return {
      success: true,
      user: data.user,
      session: data.session,
      message: 'Login successful!'
    };

  } catch (error) {
    console.error('❌ Sign in error:', error);
    throw error;
  }
}

/**
 * Sign in with OAuth provider (Google, GitHub, etc.)
 * @param {string} provider - OAuth provider name
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} OAuth login result
 */
export async function signInWithOAuth(provider, options = {}) {
  try {
    console.log(`🔄 Signing in with ${provider}...`);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: options.redirectTo || `${window.location.origin}/auth/callback`,
        ...options
      }
    });

    if (error) {
      throw new Error(`OAuth login failed: ${error.message}`);
    }

    console.log(`✅ OAuth login initiated for ${provider}`);

    return {
      success: true,
      data,
      message: `Redirecting to ${provider} for authentication...`
    };

  } catch (error) {
    console.error('❌ OAuth sign in error:', error);
    throw error;
  }
}

/**
 * Sign out the current user
 * @returns {Promise<Object>} Logout result
 */
export async function signOut() {
  try {
    console.log('🔄 Signing out user...');

    // Get current user before signing out for logging
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: userData } = await supabase
        .from('users')
        .select('client_id')
        .eq('id', user.id)
        .single();

      if (userData?.client_id) {
        await logActivity('user', user.id, 'logout', {
          email: user.email
        });
      }
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error(`Logout failed: ${error.message}`);
    }

    console.log('✅ User signed out successfully');

    return {
      success: true,
      message: 'Logged out successfully!'
    };

  } catch (error) {
    console.error('❌ Sign out error:', error);
    throw error;
  }
}

/**
 * Reset user password
 * @param {string} email - User email
 * @returns {Promise<Object>} Reset result
 */
export async function resetPassword(email) {
  try {
    console.log('🔄 Sending password reset email...');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    });

    if (error) {
      throw new Error(`Password reset failed: ${error.message}`);
    }

    console.log('✅ Password reset email sent');

    return {
      success: true,
      message: 'Password reset email sent! Please check your inbox.'
    };

  } catch (error) {
    console.error('❌ Reset password error:', error);
    throw error;
  }
}

/**
 * Update user password
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} Update result
 */
export async function updatePassword(newPassword) {
  try {
    console.log('🔄 Updating user password...');

    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      throw new Error(`Password update failed: ${error.message}`);
    }

    // Log the password change
    if (data.user) {
      const { data: userData } = await supabase
        .from('users')
        .select('client_id')
        .eq('id', data.user.id)
        .single();

      if (userData?.client_id) {
        await logActivity('user', data.user.id, 'password_changed', {
          email: data.user.email
        });
      }
    }

    console.log('✅ Password updated successfully');

    return {
      success: true,
      user: data.user,
      message: 'Password updated successfully!'
    };

  } catch (error) {
    console.error('❌ Update password error:', error);
    throw error;
  }
}

/**
 * Get current authenticated user with client info
 * @returns {Promise<Object>} Current user data
 */
export async function getCurrentUser() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { user: null, client: null };
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        *,
        client:clients(*)
      `)
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('❌ Failed to get user data:', userError);
      return { user: user, client: null };
    }

    return {
      user: userData,
      client: userData.client,
      auth_user: user
    };

  } catch (error) {
    console.error('❌ Get current user error:', error);
    return { user: null, client: null };
  }
}

/**
 * Update user profile
 * @param {Object} profileData - Profile update data
 * @returns {Promise<Object>} Update result
 */
export async function updateProfile(profileData) {
  try {
    console.log('🔄 Updating user profile...');

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Update auth metadata if needed
    const authUpdates = {};
    if (profileData.full_name) {
      authUpdates.data = { full_name: profileData.full_name };
    }

    if (Object.keys(authUpdates).length > 0) {
      const { error: authError } = await supabase.auth.updateUser(authUpdates);
      if (authError) {
        throw new Error(`Failed to update auth profile: ${authError.message}`);
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
      .single();

    if (error) {
      throw new Error(`Failed to update profile: ${error.message}`);
    }

    // Log the profile update
    if (data.client_id) {
      await logActivity('user', user.id, 'profile_updated', {
        updated_fields: Object.keys(profileData)
      });
    }

    console.log('✅ Profile updated successfully');

    return {
      success: true,
      user: data,
      message: 'Profile updated successfully!'
    };

  } catch (error) {
    console.error('❌ Update profile error:', error);
    throw error;
  }
}

/**
 * Check if user has permission for an action
 * @param {string} permission - Permission to check
 * @param {Object} user - User object (optional, will get current user if not provided)
 * @returns {Promise<boolean>} Whether user has permission
 */
export async function hasPermission(permission, user = null) {
  try {
    if (!user) {
      const currentUser = await getCurrentUser();
      user = currentUser.user;
    }

    if (!user) {
      return false;
    }

    // Platform admins have all permissions
    if (user.role === 'platform_admin') {
      return true;
    }

    // Check role-based permissions
    const rolePermissions = {
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
    };

    const userPermissions = rolePermissions[user.role] || [];
    
    // Check if user has wildcard permission or specific permission
    return userPermissions.includes('*') || 
           userPermissions.includes(permission) ||
           (user.permissions && user.permissions.includes(permission));

  } catch (error) {
    console.error('❌ Permission check error:', error);
    return false;
  }
}