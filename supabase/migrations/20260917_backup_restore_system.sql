-- ============================================================
-- STH Gadgets — Advanced Backup & Restore System Schema Migration
-- Run this entire script in Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================

-- 1. Create backups table
create table if not exists public.backups (
  id uuid primary key default uuid_generate_v4(),
  backup_name text not null,
  backup_type text not null default 'manual' check (backup_type in ('manual', 'safety_prerestore', 'automated')),
  file_path text not null,
  file_size bigint not null default 0,
  backup_version text not null default '1.0',
  schema_version text not null default '2026.09',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  status text not null default 'success' check (status in ('success', 'failed', 'in_progress')),
  record_counts jsonb not null default '{}'::jsonb,
  checksum text
);

create index if not exists idx_backups_created_at on public.backups(created_at desc);
create index if not exists idx_backups_status on public.backups(status);
create index if not exists idx_backups_type on public.backups(backup_type);

-- 2. Create restore_history table
create table if not exists public.restore_history (
  id uuid primary key default uuid_generate_v4(),
  restore_number text unique, -- Formatted like RST-000001
  backup_id uuid references public.backups(id) on delete set null,
  restore_type text not null check (restore_type in ('full', 'selective')),
  selected_modules jsonb not null default '[]'::jsonb,
  safety_backup_id uuid references public.backups(id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'in_progress' check (status in ('in_progress', 'success', 'failed', 'rolled_back')),
  records_restored jsonb not null default '{}'::jsonb,
  records_failed jsonb not null default '{}'::jsonb,
  error_message text,
  rollback_status text default 'none' check (rollback_status in ('none', 'pending', 'success', 'failed')),
  restored_by uuid references auth.users(id) on delete set null
);

create index if not exists idx_restore_history_started_at on public.restore_history(started_at desc);
create index if not exists idx_restore_history_status on public.restore_history(status);

-- 3. Sequence for Restore Numbering (RST-000001, RST-000002)
create sequence if not exists public.sth_restore_number_seq start with 1 increment by 1;

create or replace function public.set_restore_number()
returns trigger as $$
declare
  v_seq bigint;
begin
  if new.restore_number is null or new.restore_number = '' then
    v_seq := nextval('public.sth_restore_number_seq');
    new.restore_number := 'RST-' || lpad(v_seq::text, 6, '0');
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_restore_history_number on public.restore_history;
create trigger trg_restore_history_number
before insert on public.restore_history
for each row execute function public.set_restore_number();

-- 4. Row Level Security policies (strictly Admin Only)
alter table public.backups enable row level security;
alter table public.restore_history enable row level security;

drop policy if exists "backups_admin_all" on public.backups;
create policy "backups_admin_all" on public.backups
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "restore_history_admin_all" on public.restore_history;
create policy "restore_history_admin_all" on public.restore_history
  for all using (public.is_admin()) with check (public.is_admin());

-- 5. Create storage bucket for backups
insert into storage.buckets (id, name, public)
values ('backups', 'backups', false)
on conflict (id) do nothing;

drop policy if exists "admin_manage_backups_storage" on storage.objects;
create policy "admin_manage_backups_storage" on storage.objects
  for all using (bucket_id = 'backups' and public.is_admin());
