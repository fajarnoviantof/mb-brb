import { createClient } from '@supabase/supabase-js';

// PENTING: file ini HANYA dipakai di server (pages/api/*), TIDAK PERNAH di-import
// dari komponen halaman/browser. Service role key ini bisa bypass semua proteksi,
// jadi harus tetap rahasia (jangan pakai prefix NEXT_PUBLIC_).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
