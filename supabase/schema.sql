create extension if not exists pgcrypto;
create extension if not exists unaccent schema extensions;
alter extension unaccent set schema extensions;

create or replace function public.normalize_search_text(input text)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select trim(
    regexp_replace(
      regexp_replace(lower(extensions.unaccent(coalesce(input, ''))), '[^a-z0-9\s-]', '', 'g'),
      '\s+',
      ' ',
      'g'
    )
  );
$$;

create table if not exists public.patient_portal (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  access_code text not null unique,
  full_name text not null,
  full_name_search text not null,
  is_archived boolean not null default false,
  profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists patient_portal_slug_idx
  on public.patient_portal (slug);

create index if not exists patient_portal_full_name_search_idx
  on public.patient_portal (full_name_search);

create index if not exists patient_portal_access_code_idx
  on public.patient_portal (access_code);

grant usage on schema public to service_role;
grant usage on schema extensions to service_role;
grant select, insert, update, delete on table public.patient_portal to service_role;

create or replace function public.sync_patient_portal_search_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.slug := public.normalize_search_text(coalesce(new.slug, new.full_name));
  new.access_code := public.normalize_search_text(new.access_code);
  new.full_name_search := public.normalize_search_text(new.full_name);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists sync_patient_portal_search_columns on public.patient_portal;
create trigger sync_patient_portal_search_columns
before insert or update on public.patient_portal
for each row execute function public.sync_patient_portal_search_columns();

alter table public.patient_portal enable row level security;

drop policy if exists patient_portal_service_role_access on public.patient_portal;
create policy patient_portal_service_role_access
on public.patient_portal
for all
to service_role
using (true)
with check (true);

insert into public.patient_portal (slug, access_code, full_name, profile)
values (
  'demo',
  'demo',
  'Assinatura demo',
  $${
    "name": "Assinatura demo",
    "initials": "ED",
    "greeting": "Bem-vindo à E-Club, Assinatura demo",
    "status": "Página de demonstração",
    "code": "DEMO",
    "subtitle": "Página de demonstração",
    "access": "Nome completo ou QR",
    "nextSession": "seg., 12 mai · 14:30",
    "lastReview": "03 mai",
    "focus": "Role a tela para baixo para ver mais...",
    "appointments": [
      {
        "date": "12 mai",
        "time": "14:30",
        "title": "Retorno clínico",
        "detail": "Revisão da última evolução e alinhamento do próximo passo.",
        "status": "Confirmada"
      },
      {
        "date": "29 mai",
        "time": "10:00",
        "title": "Acompanhamento",
        "detail": "Leitura do ciclo atual e registro da resposta.",
        "status": "Programada"
      }
    ],
    "visits": [
      {
        "date": "03 mai",
        "title": "Última visita",
        "detail": "Consulta de retorno com leitura da evolução.",
        "status": "Registrada"
      },
      {
        "date": "11 abr",
        "title": "Visita anterior",
        "detail": "Avaliação inicial e alinhamento do plano.",
        "status": "Registrada"
      },
      {
        "date": "15 mar",
        "title": "Histórico",
        "detail": "Atendimento anterior anexado ao ciclo da paciente.",
        "status": "Arquivada"
      }
    ],
    "procedures": [
      {
        "date": "03 mai",
        "title": "Revisão facial",
        "detail": "Checagem do que mudou e do que deve ser mantido.",
        "status": "Concluído"
      },
      {
        "date": "11 abr",
        "title": "Planejamento",
        "detail": "Leitura facial, prioridades e sequência de cuidado.",
        "status": "Registrado"
      },
      {
        "date": "15 mar",
        "title": "Acompanhamento",
        "detail": "Registro do contato anterior e observações da equipe.",
        "status": "Arquivado"
      }
    ],
    "notes": [
      "Use o nome completo ou o código do QR para abrir a ficha.",
      "As visitas aparecem em ordem prática para leitura rápida no celular.",
      "Dados sensíveis devem continuar protegidos por autenticação no backend."
    ],
    "contact": [
      { "label": "Canal", "value": "WhatsApp oficial da clínica" },
      { "label": "Cidade", "value": "Itajaí - SC" },
      { "label": "Suporte", "value": "Equipe do Club do Botox" }
    ]
  }$$::jsonb
)
on conflict (slug) do update
set
  access_code = excluded.access_code,
  full_name = excluded.full_name,
  profile = excluded.profile,
  updated_at = now();

insert into public.patient_portal (slug, access_code, full_name, profile)
values (
  'paciente1',
  'pac001',
  'Paciente modelo',
  $${
    "name": "Paciente modelo",
    "initials": "PM",
    "greeting": "Bem-vindo à E-Club, Paciente modelo",
    "status": "Paciente modelo",
    "code": "PAC-001",
    "subtitle": "Exemplo de página pública",
    "access": "Link separado da paciente",
    "nextSession": "seg., 15 jul · 09:00",
    "lastReview": "01 jul",
    "focus": "Exemplo pronto para abrir em uma página separada.",
    "appointments": [
      {
        "date": "15 jul",
        "time": "09:00",
        "title": "Retorno clínico",
        "detail": "Revisão da evolução e definição do próximo passo.",
        "status": "Confirmada"
      },
      {
        "date": "29 jul",
        "time": "11:00",
        "title": "Acompanhamento",
        "detail": "Leitura da resposta e ajustes de rotina.",
        "status": "Programada"
      }
    ],
    "visits": [
      {
        "date": "01 jul",
        "title": "Última visita",
        "detail": "Consulta de retorno com registro da evolução.",
        "status": "Registrada"
      },
      {
        "date": "11 jun",
        "title": "Visita anterior",
        "detail": "Avaliação inicial e alinhamento do plano.",
        "status": "Registrada"
      }
    ],
    "procedures": [
      {
        "date": "01 jul",
        "title": "Revisão facial",
        "detail": "Checagem do que mudou e do que deve ser mantido.",
        "status": "Concluído"
      },
      {
        "date": "11 jun",
        "title": "Planejamento",
        "detail": "Leitura facial, prioridades e sequência de cuidado.",
        "status": "Registrado"
      }
    ],
    "notes": [
      "Exemplo de paciente modelo para validar a lista do painel.",
      "O link separado desta ficha é /paciente/paciente1.",
      "Depois é só editar os campos para um caso real."
    ],
    "contact": [
      { "label": "Canal", "value": "WhatsApp oficial da clínica" },
      { "label": "Cidade", "value": "Itajaí - SC" },
      { "label": "Suporte", "value": "Equipe do E-Club" }
    ],
    "links": [
      { "label": "Página separada", "url": "/paciente/paciente1" }
    ]
  }$$::jsonb
)
on conflict (slug) do update
set
  access_code = excluded.access_code,
  full_name = excluded.full_name,
  profile = excluded.profile,
  updated_at = now();
