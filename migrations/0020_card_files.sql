-- Files attached to a card. Uploading the same file name again makes a new version.
create table if not exists app_card_files (
  id text primary key,
  card_id text not null,
  board_id text not null,
  file_id text not null,
  name text not null,
  version int not null,
  mime text not null,
  size_bytes int not null,
  uploaded_by text not null,
  created_at timestamptz not null default now()
);
create index if not exists app_card_files_card_idx on app_card_files (card_id, name, version desc);
create index if not exists app_card_files_file_idx on app_card_files (file_id);
