# GPX Map App (Next.js + Tailwind + Supabase)

Quick start:
1. Create Supabase project, create `gpx-bucket` in Storage and run SQL schema to create `tracks` table (see SQL below).
2. Create a GitHub repo, push this project.
3. On Vercel, import repo and set env vars:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy.

### SQL (create tracks table)
```sql
create extension if not exists pgcrypto;
create table public.tracks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  description text,
  gpx_path text not null,
  uploaded_at timestamptz default now(),
  activity_date date,
  distance_meters numeric,
  duration_seconds integer,
  avg_speed_m_s numeric,
  raw_json jsonb
);
```

### Backup
- Use GitHub Actions to run `pg_dump` and `supabase storage download` on a schedule and store artifacts.

### Notes
- This starter uses public bucket URLs for simplicity. For privacy, switch to signed URLs and set RLS policies.