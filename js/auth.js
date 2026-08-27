/**
 * Auth Helpers
 * Wraps Supabase Auth methods and handles redirects.
 */

import { supabase } from './supabase-client.js';

/**
 * Sign in with email and password.
 * @param {string} email
 * @param {string} password
 * @returns {{ data: object|null, error: object|null }}
 */
export async function loginWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

/**
 * Sign out the current user and redirect to login.
 */
export async function logout() {
  await supabase.auth.signOut();
  window.location.href = '/login.html';
}

/**
 * Get the current active session.
 * @returns {Promise<Session|null>}
 */
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Auth guard — call this at the top of protected pages.
 * Redirects to login if no session is found.
 */
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.href = '/login.html';
  }
  return session;
}
