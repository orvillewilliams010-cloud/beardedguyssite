/**
 * Supabase Client Initializer
 * Imports the Supabase JS v2 SDK via ESM CDN.
 * config.js must be loaded before this script.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// SUPABASE_URL, SUPABASE_ANON_KEY, and STORAGE_BUCKET are defined in js/config.js
// which is loaded via a plain <script> tag before this module.
export const supabase = createClient(
  window.__SUPABASE_URL__ || SUPABASE_URL,
  window.__SUPABASE_ANON_KEY__ || SUPABASE_ANON_KEY
);

export const BUCKET = window.__STORAGE_BUCKET__ || STORAGE_BUCKET || 'gallery';
