# Supabase Setup (quick)
1. Create a free Supabase project at https://app.supabase.com.
2. Go to Settings -> API and copy Project URL and anon public key.
3. Fill values into .env.local:
   NEXT_PUBLIC_SUPABASE_URL=your-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon
4. (Optional) Use Supabase SQL editor to run supabase/migrations/001_init.sql to create tables.
5. In the app, pages that use supabase will import lib/supabaseClient.ts.
