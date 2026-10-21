-- Daily / weekly summary in Bale, chosen by each user.
alter table login_users add column if not exists bale_digest text not null default 'off';
alter table login_users drop constraint if exists login_users_bale_digest_check;
alter table login_users add constraint login_users_bale_digest_check check (bale_digest in ('off', 'daily', 'weekly'));
