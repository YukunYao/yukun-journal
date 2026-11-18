-- Apply in Supabase SQL editor after creating the project. Never expose service_role to browsers.
create table if not exists public.journal_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 1 check (revision > 0),
  body jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.journal_snapshots enable row level security;
revoke all on public.journal_snapshots from anon;
grant select on public.journal_snapshots to authenticated;
create policy "read own journal" on public.journal_snapshots for select to authenticated using (auth.uid() = user_id);
-- Direct inserts and updates are blocked. Clients must use the atomic compare-and-swap RPC below.

create or replace function public.save_journal_snapshot(expected_revision bigint, next_body jsonb)
returns bigint language plpgsql security definer set search_path = public as $$
declare new_revision bigint;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(next_body) <> 'object'
     or jsonb_typeof(next_body->'entries') <> 'array'
     or jsonb_typeof(next_body->'weights') <> 'array'
     or jsonb_typeof(next_body->'seedLedger') <> 'array'
     or jsonb_typeof(next_body->'spiritName') <> 'string' then
    raise exception 'Invalid journal format';
  end if;
  if octet_length(next_body::text) > 1048576 then raise exception 'Journal snapshot exceeds 1 MB'; end if;
  if expected_revision = 0 then
    insert into public.journal_snapshots(user_id, body) values (auth.uid(), next_body)
    on conflict do nothing returning revision into new_revision;
  else
    update public.journal_snapshots set body = next_body, revision = revision + 1, updated_at = now()
    where user_id = auth.uid() and revision = expected_revision returning revision into new_revision;
  end if;
  if new_revision is null then raise exception 'Journal changed on another device. Reload before saving.'; end if;
  return new_revision;
end; $$;
revoke all on function public.save_journal_snapshot(bigint, jsonb) from public, anon;
grant execute on function public.save_journal_snapshot(bigint, jsonb) to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('journal-photos', 'journal-photos', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy "read own journal photos" on storage.objects for select to authenticated
using (bucket_id = 'journal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "upload own journal photos" on storage.objects for insert to authenticated
with check (bucket_id = 'journal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "replace own journal photos" on storage.objects for update to authenticated
using (bucket_id = 'journal-photos' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'journal-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create table if not exists public.ai_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.ai_plans enable row level security;
revoke all on public.ai_plans from anon;
grant select on public.ai_plans to authenticated;
create policy "read own AI plan" on public.ai_plans for select to authenticated using (auth.uid() = user_id);
-- Only the reviewed server route writes generated plans.
