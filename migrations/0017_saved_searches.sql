-- Personal saved searches ("views").
create table if not exists app_saved_searches (
  id text primary key,
  username text not null,
  name text not null,
  query text not null,
  filters jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists app_saved_searches_user_idx on app_saved_searches (username, created_at);
