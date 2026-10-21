-- Public API tokens (only a hash is stored) and outgoing webhooks.
create table if not exists app_api_tokens (
  id text primary key,
  name text not null,
  token_hash text not null unique,
  prefix text not null,
  scope text not null check (scope in ('read', 'write')),
  created_by text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked boolean not null default false
);

create table if not exists app_webhooks (
  id text primary key,
  url text not null,
  secret text not null,
  events jsonb not null default '["*"]',
  enabled boolean not null default true,
  created_by text not null,
  created_at timestamptz not null default now(),
  last_status text,
  last_at timestamptz
);
