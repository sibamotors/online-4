-- Rule-based automation per board: "when <trigger> then <actions>".
create table if not exists app_automation_rules (
  id text primary key,
  board_id text not null,
  name text not null,
  enabled boolean not null default true,
  trigger jsonb not null,
  actions jsonb not null,
  created_by text not null,
  created_at timestamptz not null default now(),
  run_count int not null default 0,
  last_run_at timestamptz
);
create index if not exists app_automation_board_idx on app_automation_rules (board_id);
