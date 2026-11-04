-- Run this in Supabase Dashboard > SQL Editor.
-- Each authenticated user can access only their own notes.

create table if not exists public.private_notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body text not null check (char_length(body) <= 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.private_notes enable row level security;

drop policy if exists "Users can read their own notes" on public.private_notes;
create policy "Users can read their own notes"
on public.private_notes for select to authenticated
using (auth.uid() = owner_id);

drop policy if exists "Users can add their own notes" on public.private_notes;
create policy "Users can add their own notes"
on public.private_notes for insert to authenticated
with check (auth.uid() = owner_id);

drop policy if exists "Users can update their own notes" on public.private_notes;
create policy "Users can update their own notes"
on public.private_notes for update to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Users can delete their own notes" on public.private_notes;
create policy "Users can delete their own notes"
on public.private_notes for delete to authenticated
using (auth.uid() = owner_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists private_notes_updated_at on public.private_notes;
create trigger private_notes_updated_at
before update on public.private_notes
for each row execute function public.set_updated_at();
