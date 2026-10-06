/*
  # Saved drills linked to goals

  1. New Tables
    - `saved_drills` — a user's bookmark of one `playbook_drills` row.
    - `goal_drills`  — links a saved drill to a goal. A goal has many drills,
                       a drill can serve many goals.

  2. Why a user-owned table beside the read-only playbook tables
    - The playbook tables are written only by the sync script (service role)
      and stay the vault's mirror. A bookmark is the user's, not the note's,
      so it lives in its own table with `user_id` and owner-only RLS, like
      `vault_tips` and `goals`.

  3. The text copy
    - A save holds a copy of the drill's text (`title` … `source_title`) plus
      a foreign key to the live drill. A re-sync that drops a row DELETES the
      drill, so `drill_id` goes null; the copy keeps the card readable and
      its jump working (`playbook_id` + the time range). Written once at save
      time, never refreshed.

  4. Rules
    - One save per drill per user: unique (user_id, drill_id). Nulls do not
      collide, so orphaned saves coexist.
    - `category` is free text filed by the user. Null means uncategorised.
      Never an empty string — the app normalises before writing.
    - `note` is reserved and unused in v1.
    - Deleting a goal or a save removes its links (cascade). Re-syncing a
      playbook changes neither table. `goals` is not altered.

  Re-runnable: every statement is IF NOT EXISTS / DROP-then-CREATE.
*/

-- ─── Tables ───────────────────────────────────────────────────────────────

create table if not exists saved_drills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  drill_id uuid references playbook_drills(id) on delete set null,
  playbook_id uuid references playbooks(id) on delete set null,
  category text,
  title text not null,
  venue text,
  scenario text,
  cue text,
  success_signal text,
  source_start_seconds int,
  source_end_seconds int,
  source_title text,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, drill_id)
);

create table if not exists goal_drills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  goal_id uuid not null references goals(id) on delete cascade,
  saved_drill_id uuid not null references saved_drills(id) on delete cascade,
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (goal_id, saved_drill_id)
);

create index if not exists idx_saved_drills_user on saved_drills (user_id);
create index if not exists idx_goal_drills_goal on goal_drills (goal_id);

-- ─── RLS — owner only ─────────────────────────────────────────────────────

alter table saved_drills enable row level security;
alter table goal_drills enable row level security;

-- Dropped first so the whole migration stays re-runnable.
drop policy if exists "read own saved drills"   on saved_drills;
drop policy if exists "insert own saved drills" on saved_drills;
drop policy if exists "update own saved drills" on saved_drills;
drop policy if exists "delete own saved drills" on saved_drills;

create policy "read own saved drills"   on saved_drills for select to authenticated using (auth.uid() = user_id);
create policy "insert own saved drills" on saved_drills for insert to authenticated with check (auth.uid() = user_id);
create policy "update own saved drills" on saved_drills for update to authenticated using (auth.uid() = user_id);
create policy "delete own saved drills" on saved_drills for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "read own goal drills"   on goal_drills;
drop policy if exists "insert own goal drills" on goal_drills;
drop policy if exists "update own goal drills" on goal_drills;
drop policy if exists "delete own goal drills" on goal_drills;

create policy "read own goal drills"   on goal_drills for select to authenticated using (auth.uid() = user_id);
create policy "insert own goal drills" on goal_drills for insert to authenticated with check (auth.uid() = user_id);
create policy "update own goal drills" on goal_drills for update to authenticated using (auth.uid() = user_id);
create policy "delete own goal drills" on goal_drills for delete to authenticated using (auth.uid() = user_id);
