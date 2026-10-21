-- "Level 2 admin": can manage ordinary users and see everything, but cannot touch system admins or create admins.
alter table login_users add column if not exists is_admin2 boolean not null default false;
