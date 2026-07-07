/**
 * supabase.js
 * Cliente Supabase singleton para uso server-side nas rotas Next.js.
 * Usa a Service Role Key para ter acesso total (equivalente ao Firebase Admin SDK).
 */

import { createClient } from '@supabase/supabase-js';

let _client = null;

export function getSupabase() {
  if (_client) return _client;

  const url  = process.env.SUPABASE_URL;
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não configuradas.');
  }

  _client = createClient(url, key, {
    auth: { persistSession: false },
  });

  return _client;
}
