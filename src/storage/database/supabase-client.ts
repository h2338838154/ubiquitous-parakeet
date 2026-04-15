import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pczkhicrnvhsfmenubmn.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjemtoaWNybnZoc2ZtZW51Ym1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MTAyOTAsImV4cCI6MjA5MTM4NjI5MH0.jh6OyWCSv-RneKqcBxzf8z5hYLQU5hRjHbB0KVEckXM';

export function getSupabaseClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey);
}
