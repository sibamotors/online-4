-- Web Push: one row per browser/phone that allowed notifications.
create table if not exists app_push_subscriptions (
  id text primary key,
  username text not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists app_push_user_idx on app_push_subscriptions (username);
