alter table public.projects add column user_id uuid references neon_auth."user"(id) on delete cascade;

create index idx_projects_user_id on public.projects(user_id);

update public.projects set user_id = 'f169a646-798a-439e-86a8-14af8a953f3d' where id in (32,52);