import { createClient } from '@supabase/supabase-js';

const rawUrl = (
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.VITE_PUBLIC_SUPABASE_URL ||
  'http://127.0.0.1:54321'
)
  .trim()
  .replace(/^["']|["']$/g, '')
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/+$/, '');

const rawKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON ||
  import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
)
  .trim()
  .replace(/^["']|["']$/g, '');

const isDemoKey = rawKey.includes('supabase-demo');

if (typeof window !== 'undefined') {
  console.log('[Supabase Init]', {
    url: rawUrl,
    keyLength: rawKey.length,
    keyPrefix: rawKey.substring(0, 15) + '...',
    isUsingDemoFallback: isDemoKey
  });

  if (rawUrl.includes('supabase.co') && isDemoKey) {
    console.error(
      '[Supabase Error] Detected remote Supabase URL with local demo key! Make sure VITE_SUPABASE_ANON_KEY is configured in Vercel.'
    );
  }
}

export const supabase = createClient(rawUrl, rawKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});
