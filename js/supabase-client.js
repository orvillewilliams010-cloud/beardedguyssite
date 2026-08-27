/**
 * Supabase Client Initializer
 * Imports Supabase JS SDK via ESM CDN.
 * Safely handles unconfigured states with fallback support.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Retrieve credentials safely
function getCredentials() {
  const url = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url) 
    || window.__SUPABASE_URL__ 
    || localStorage.getItem('bearded_supabase_url')
    || (typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '')
    || '';
    
  const key = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.anonKey) 
    || window.__SUPABASE_ANON_KEY__ 
    || localStorage.getItem('bearded_supabase_key')
    || (typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '')
    || '';

  const bucket = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.bucket)
    || window.__STORAGE_BUCKET__
    || localStorage.getItem('bearded_supabase_bucket')
    || (typeof STORAGE_BUCKET !== 'undefined' ? STORAGE_BUCKET : 'gallery')
    || 'gallery';

  return { url: url.trim(), key: key.trim(), bucket: bucket.trim() };
}

const { url, key, bucket } = getCredentials();

export const BUCKET = bucket;

export const isSupabaseConfigured = () => {
  const creds = getCredentials();
  return Boolean(creds.url && creds.key && creds.url.startsWith('http') && !creds.url.includes('YOUR_PROJECT_REF'));
};

let clientInstance = null;

if (isSupabaseConfigured()) {
  try {
    clientInstance = createClient(url, key);
  } catch (err) {
    console.warn('[Supabase] Init error:', err);
  }
}

export const supabase = clientInstance;

/**
 * Save new credentials and reload
 */
export function saveCredentials(newUrl, newKey, newBucket = 'gallery') {
  localStorage.setItem('bearded_supabase_url', newUrl);
  localStorage.setItem('bearded_supabase_key', newKey);
  localStorage.setItem('bearded_supabase_bucket', newBucket);
  if (window.SUPABASE_CONFIG) {
    window.SUPABASE_CONFIG.url = newUrl;
    window.SUPABASE_CONFIG.anonKey = newKey;
    window.SUPABASE_CONFIG.bucket = newBucket;
  }
}
