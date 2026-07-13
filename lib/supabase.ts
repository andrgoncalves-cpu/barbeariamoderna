import { createClient } from '@supabase/supabase-js';

// Usado APENAS em código de servidor (API routes, Server Components).
// A service_role key tem acesso total e ignora RLS — nunca expor ao browser.
export function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Variáveis SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY em falta no ambiente.'
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
