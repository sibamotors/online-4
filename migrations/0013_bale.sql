-- Bale messenger link (out-of-app notifications) and reminder de-duplication.
alter table login_users add column if not exists bale_chat_id text;
alter table login_users add column if not exists bale_notify boolean not null default true;
alter table login_users add column if not exists bale_link_code text;
alter table login_users add column if not exists bale_link_expires timestamptz;
create unique index if not exists login_users_bale_chat_idx on login_users (bale_chat_id) where bale_chat_id is not null;
create unique index if not exists login_users_bale_code_idx on login_users (bale_link_code) where bale_link_code is not null;

-- one row per reminder that was already sent, so nobody gets the same reminder twice
create table if not exists app_reminder_log (
  card_id text not null,
  username text not null,
  kind text not null,
  due_date text not null,
  sent_at timestamptz not null default now(),
  primary key (card_id, username, kind, due_date)
);
