-- Request forms: other people fill in a form and a card is created on a board.
create table if not exists app_request_forms (
  id text primary key,
  title text not null,
  description text not null default '',
  board_id text not null,
  list_id text not null,
  fields jsonb not null default '[]',
  default_priority text not null default 'med',
  assignee_person_ids jsonb not null default '[]',
  enabled boolean not null default true,
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists app_request_submissions (
  id text primary key,
  form_id text not null,
  form_title text not null,
  submitted_by text not null,
  board_id text not null,
  card_id text not null,
  created_at timestamptz not null default now()
);
create index if not exists app_request_sub_user_idx on app_request_submissions (submitted_by, created_at desc);

-- Time tracking: who worked how long on which card.
create table if not exists app_time_entries (
  id text primary key,
  username text not null,
  card_id text not null,
  board_id text not null,
  card_title text not null,
  work_date text not null,
  minutes int not null check (minutes > 0 and minutes <= 1440),
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists app_time_user_date_idx on app_time_entries (username, work_date);
create index if not exists app_time_card_idx on app_time_entries (card_id);
