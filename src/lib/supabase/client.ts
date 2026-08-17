import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pkhplaojzmjwlbrposhv.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBraHBsYW9qem1qd2xicnBvc2h2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4NjQ4NjMsImV4cCI6MjEwMjQ0MDg2M30.eLILgNznk3UXWI-KgbLAxubgrr6ck6Uwwf7jk4zRCdM';

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
