-- Per-board access: everybody is a normal member unless listed here as a read-only guest.
create table if not exists app_board_roles (
  board_id text not null,
  username text not null,
  role text not null check (role in ('viewer')),
  created_at timestamptz not null default now(),
  primary key (board_id, username)
);
create index if not exists app_board_roles_user_idx on app_board_roles (username);
