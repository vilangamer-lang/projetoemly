# Banco de dados (Supabase)

O portal usa um projeto Supabase (PostgreSQL) com uma única tabela de aplicação, `patient_portal`. Todo o acesso é server-side: as funções em `api/` falam com o Supabase via REST (`/rest/v1`) usando a service role key — o navegador nunca acessa o banco diretamente.

## Como aplicar o schema

1. Abra o projeto no dashboard do Supabase.
2. Vá em **SQL Editor** e cole o conteúdo de `supabase/schema.sql`.
3. Execute. O script é idempotente (`create ... if not exists`, `create or replace`, `on conflict ... do update`) e pode ser reexecutado com segurança.

O script cria extensões (`pgcrypto`, `unaccent`), a função de normalização, a tabela, índices, trigger, RLS e dois registros de exemplo.

## Tabela `patient_portal`

| Coluna | Tipo | Restrições | Descrição |
| --- | --- | --- | --- |
| `id` | `uuid` | PK, default `gen_random_uuid()` | Identificador do registro; usado pelo painel nas ações de editar/arquivar/duplicar/excluir. |
| `slug` | `text` | `not null`, `unique` | Parte final do link público (`/p/<slug>`). Normalizado pelo trigger. |
| `access_code` | `text` | `not null`, `unique` | Código de acesso alternativo (impresso no QR). Também normalizado pelo trigger. |
| `full_name` | `text` | `not null` | Nome completo da paciente, como exibido. |
| `full_name_search` | `text` | `not null`, indexada | Versão normalizada do nome (minúsculas, sem acentos), gerada pelo trigger; permite buscar pela paciente digitando o nome. |
| `is_archived` | `boolean` | `not null`, default `false` | Página arquivada: continua acessível, mas com aviso e status "Página arquivada". |
| `profile` | `jsonb` | `not null`, default `{}` | Todo o conteúdo da página: `name`, `initials`, `greeting`, `status`, `code`, `subtitle`, `access`, `nextSession`, `lastReview`, `focus` e as listas `appointments`, `visits`, `procedures`, `notes`, `contact`, `links`. O backend normaliza esse objeto ao gravar e ao ler (`lib/supabase.js`). |
| `created_at` | `timestamptz` | `not null`, default `now()` | Data de criação. |
| `updated_at` | `timestamptz` | `not null`, default `now()` | Atualizada pelo trigger a cada gravação; usada na ordenação da lista do painel. |

Índices: único em `slug` (`patient_portal_slug_idx`) e simples em `full_name_search` e `access_code`, cobrindo as três formas de busca do endpoint `/api/patient` (`or=(slug.eq...,access_code.eq...,full_name_search.eq...)`).

## Trigger de normalização

A função `public.normalize_search_text(text)` reproduz no banco a mesma normalização feita em JavaScript: minúsculas, remoção de acentos (`unaccent`), remoção de caracteres fora de `[a-z0-9\s-]` e colapso de espaços.

O trigger `sync_patient_portal_search_columns` (BEFORE INSERT OR UPDATE) aplica essa função em cada gravação:

- `slug` ← normalizado (cai para `full_name` se vier vazio);
- `access_code` ← normalizado;
- `full_name_search` ← `full_name` normalizado;
- `updated_at` ← `now()`.

Isso garante que a busca case-insensitive e sem acentos funcione mesmo que algum registro seja inserido manualmente pelo SQL editor.

## RLS e permissões

- RLS está **habilitado** na tabela.
- A única policy (`patient_portal_service_role_access`) libera `select/insert/update/delete` apenas para a role `service_role` — a `anon key` não enxerga nada, então o banco não é legível pelo navegador.
- O script também faz `grant` de uso dos schemas `public` e `extensions` e das operações na tabela para `service_role`, requisito para a API server-side funcionar.

## Seeds de exemplo

O `schema.sql` insere (com upsert por `slug`) dois registros:

- **`demo`** (código `demo`, nome "Assinatura demo") — página de demonstração com agenda, visitas, procedimentos e notas preenchidas. O frontend (`public/js/app.js`) ainda tem um fallback local para o slug `demo` caso a API esteja indisponível.
- **`paciente1`** (código `pac001`, nome "Paciente modelo") — exemplo de ficha real para validar a lista do painel; acessível em `/paciente/paciente1`.

## Variáveis de ambiente

- `SUPABASE_URL` — URL do projeto.
- `SUPABASE_SERVICE_ROLE_KEY` **ou** `SUPABASE_SECRET_KEY` — chave secreta server-side. Se for o JWT legado (`eyJ...`), o backend a envia em `apikey` e `Authorization: Bearer`; se for a secret key opaca do formato novo, envia apenas em `apikey`, como o Supabase espera para esse tipo de chave (`lib/supabase.js`).
- `SUPABASE_TABLE` — opcional; muda o nome da tabela consultada (padrão `patient_portal`). Útil para apontar para uma tabela de teste sem alterar código — a tabela alternativa precisa ter o mesmo schema.

## `project_memory.sql`

O arquivo `supabase/project_memory.sql` cria a tabela auxiliar `project_memory_logs`, usada como memória de sessões de IA que trabalharam neste projeto (registro de pedidos, decisões e pendências por sessão). **Não faz parte do portal**: nenhum código em `api/`, `lib/` ou `public/` a consulta, e ela não precisa existir para o site funcionar.
