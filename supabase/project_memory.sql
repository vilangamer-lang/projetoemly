create table if not exists public.project_memory_logs (
  id bigint generated always as identity primary key,
  project_key text not null default 'projeto-emlyn',
  session_title text not null,
  occurred_at timestamptz not null default now(),
  conversation_started_at timestamptz,
  conversation_ended_at timestamptz,
  user_request text not null,
  summary text not null,
  actions_done jsonb not null default '[]'::jsonb,
  actions_not_done jsonb not null default '[]'::jsonb,
  worked jsonb not null default '[]'::jsonb,
  did_not_work jsonb not null default '[]'::jsonb,
  decisions jsonb not null default '[]'::jsonb,
  artifacts jsonb not null default '[]'::jsonb,
  todo_list jsonb not null default '[]'::jsonb,
  source_context jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector not null default ''::tsvector,
  constraint project_memory_logs_actions_done_array
    check (jsonb_typeof(actions_done) = 'array'),
  constraint project_memory_logs_actions_not_done_array
    check (jsonb_typeof(actions_not_done) = 'array'),
  constraint project_memory_logs_worked_array
    check (jsonb_typeof(worked) = 'array'),
  constraint project_memory_logs_did_not_work_array
    check (jsonb_typeof(did_not_work) = 'array'),
  constraint project_memory_logs_decisions_array
    check (jsonb_typeof(decisions) = 'array'),
  constraint project_memory_logs_artifacts_array
    check (jsonb_typeof(artifacts) = 'array'),
  constraint project_memory_logs_todo_list_array
    check (jsonb_typeof(todo_list) = 'array'),
  constraint project_memory_logs_source_context_object
    check (jsonb_typeof(source_context) = 'object')
);

create index if not exists project_memory_logs_project_time_idx
  on public.project_memory_logs (project_key, occurred_at desc);

create index if not exists project_memory_logs_search_idx
  on public.project_memory_logs using gin (search_vector);

create index if not exists project_memory_logs_tags_idx
  on public.project_memory_logs using gin (tags);

create index if not exists project_memory_logs_todo_list_idx
  on public.project_memory_logs using gin (todo_list jsonb_path_ops);

create or replace function public.sync_project_memory_logs_search_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  new.search_vector := to_tsvector(
    'portuguese',
    coalesce(new.project_key, '') || ' ' ||
    coalesce(new.session_title, '') || ' ' ||
    coalesce(new.user_request, '') || ' ' ||
    coalesce(new.summary, '') || ' ' ||
    coalesce(new.actions_done::text, '') || ' ' ||
    coalesce(new.actions_not_done::text, '') || ' ' ||
    coalesce(new.worked::text, '') || ' ' ||
    coalesce(new.did_not_work::text, '') || ' ' ||
    coalesce(new.decisions::text, '') || ' ' ||
    coalesce(new.artifacts::text, '') || ' ' ||
    coalesce(new.todo_list::text, '') || ' ' ||
    coalesce(array_to_string(new.tags, ' '), '')
  );
  return new;
end;
$$;

drop trigger if exists sync_project_memory_logs_search_columns on public.project_memory_logs;
create trigger sync_project_memory_logs_search_columns
before insert or update on public.project_memory_logs
for each row execute function public.sync_project_memory_logs_search_columns();

alter table public.project_memory_logs enable row level security;

revoke all on table public.project_memory_logs from anon;
revoke all on table public.project_memory_logs from authenticated;
grant usage on schema public to service_role;
grant select, insert, update, delete on table public.project_memory_logs to service_role;
grant usage, select on sequence public.project_memory_logs_id_seq to service_role;

drop policy if exists project_memory_logs_service_role_access on public.project_memory_logs;
create policy project_memory_logs_service_role_access
on public.project_memory_logs
for all
to service_role
using (true)
with check (true);
