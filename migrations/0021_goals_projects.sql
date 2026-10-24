-- Goals (objectives with key results linked to cards) and projects (a group of boards with a status colour).
create table if not exists app_objectives (
  id text primary key,
  title text not null,
  owner_username text not null,
  period text not null default '',
  krs jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index if not exists app_objectives_owner_idx on app_objectives (owner_username);

create table if not exists app_projects (
  id text primary key,
  name text not null,
  description text not null default '',
  board_ids jsonb not null default '[]',
  created_by text not null,
  created_at timestamptz not null default now()
);
