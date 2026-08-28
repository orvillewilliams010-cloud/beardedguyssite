/**
 * Auth Helpers
 * Wraps Supabase Auth methods and handles redirects & fallback authentication.
 */

import { supabase, isSupabaseConfigured } from './supabase-client.js';

/**
 * Sign in with email and password.
 * @param {string} email
 * @param {string} password
 * @returns {{ data: object|null, error: object|null }}
 */
export async function loginWithEmail(email, password) {
  if (!isSupabaseConfigured() || !supabase) {
    // Demo Mode fallback authentication for instant testing if Supabase is not connected yet
    if (email && password && password.length >= 6) {
      const mockSession = {
        user: { email, id: 'demo-owner-id', user_metadata: { name: 'Barbershop Owner' } },
        access_token: 'demo-token-123',
        is_demo: true
      };
      localStorage.setItem('bearded_demo_session', JSON.stringify(mockSession));
      return { data: { session: mockSession, user: mockSession.user }, error: null };
    }
    return { data: null, error: { message: 'Please enter a valid email and password (min 6 characters).' } };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  } catch (err) {
    return { data: null, error: { message: err.message || 'Authentication failed.' } };
  }
}

/**
 * Sign out the current user and redirect to login.
 */
export async function logout() {
  localStorage.removeItem('bearded_demo_session');
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Sign out notice:', e);
    }
  }
  window.location.href = './login.html';
}

/**
 * Get the current active session.
 * @returns {Promise<Session|null>}
 */
export async function getSession() {
  if (!isSupabaseConfigured() || !supabase) {
    const demo = localStorage.getItem('bearded_demo_session');
    if (demo) {
      try {
        return JSON.parse(demo);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      // Check if fallback session exists
      const demo = localStorage.getItem('bearded_demo_session');
      return demo ? JSON.parse(demo) : null;
    }
    return session;
  } catch (err) {
    return null;
  }
}

/**
 * Auth guard — call this at the top of protected pages.
 * Redirects to login if no session is found.
 */
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.href = './login.html';
    return null;
  }
  return session;
}
