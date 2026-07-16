# API

O backend expõe dois endpoints serverless. Ambos respondem sempre `Content-Type: application/json; charset=utf-8` e `Cache-Control: no-store`.

## GET /api/patient

Endpoint público de leitura da página do paciente. Fonte: `api/patient.js` + `lib/supabase.js`.

### Método e CORS

- `GET` — único método de dados aceito; qualquer outro retorna `405 { "error": "method_not_allowed" }`.
- `OPTIONS` (preflight) — retorna `204` com `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: GET, OPTIONS` e `Access-Control-Allow-Headers: Content-Type, Authorization`. As respostas de `GET` em si não incluem header `Access-Control-Allow-Origin` (o consumo esperado é same-origin).

### Parâmetros

A chave de busca é lida do primeiro parâmetro de query não vazio, nesta ordem de prioridade:

`slug`, `key`, `name`, `code`, `id`, `paciente`, `pacientes`

O valor é normalizado no servidor (minúsculas, sem acentos, sem pontuação) e comparado com as colunas `slug`, `access_code` e `full_name_search` (a primeira linha que casar vence). Ou seja, funcionam tanto `?slug=maria-silva` quanto `?name=Maria Silva` ou `?code=MAR-011`.

### Respostas

**200 — encontrado**

```json
{
  "found": true,
  "source": "supabase",
  "patient": {
    "id": "uuid",
    "slug": "maria-silva",
    "access_code": "mar-011",
    "full_name": "Maria Silva",
    "is_archived": false,
    "created_at": "2026-01-10T12:00:00Z",
    "updated_at": "2026-01-12T12:00:00Z"
  },
  "profile": { "name": "...", "greeting": "...", "status": "...", "appointments": [], "visits": [], "procedures": [], "notes": [], "contact": [], "links": [] }
}
```

O `profile` sempre volta normalizado (`normalizeProfile`): campos ausentes ganham padrões e as listas viram arrays.

**200 — perfil arquivado**

Mesmo formato, com `patient.is_archived: true` e o `profile` substituído por `createArchivedProfile`: `status` vira `"Página arquivada"` e `focus` explica que o acesso foi arquivado pela clínica. O frontend usa `is_archived` para exibir o banner de aviso.

**404 — não encontrado**

- Sem chave na query: `{ "found": false, "error": "missing_key" }`
- Chave sem correspondência: `{ "found": false, "key": "<valor buscado>" }`

**503 — sem configuração**

Se `SUPABASE_URL` e/ou a chave secreta não estiverem configuradas: `{ "found": false, "error": "SUPABASE_URL is not configured" }` (a mensagem lista as variáveis faltantes).

**Outros erros**

Falhas na chamada ao Supabase propagam o status (5xx do Supabase vira `502`); qualquer outro erro vira `500 { "found": false, "error": "Unable to load patient data" }`.

## /api/admin?action=...

Endpoint do painel administrativo. Fonte: `api/admin.js` + `lib/admin-session.js` + `lib/supabase.js`. A ação vem sempre no parâmetro de query `action`. `OPTIONS` retorna `204` com os mesmos headers CORS do endpoint de paciente (métodos `GET, POST, PATCH, DELETE, OPTIONS`).

### Sessão

- Cookie: `eclub_admin_session`, formato `<payload>.<assinatura>`.
- Payload: JSON `{ "role": "dra-emlyn", "exp": <timestamp ms> }` em base64url.
- Assinatura: HMAC-SHA256 do payload com `ADMIN_SESSION_SECRET`, em base64url, verificada com `crypto.timingSafeEqual` (comparação em tempo constante).
- Validade: 12 horas (`Max-Age=43200`). Atributos: `HttpOnly; Path=/; SameSite=Lax`, mais `Secure` quando `NODE_ENV=production`.
- A senha do login também é comparada com `ADMIN_PASSWORD` via `timingSafeEqual`.
- Toda ação abaixo de `logout` exige sessão válida; sem ela a resposta é `401 { "authenticated": false, "error": "not_authenticated" }`.

### Ações públicas

| Ação | Método | Payload | Resposta | Erros |
| --- | --- | --- | --- | --- |
| `session` | GET | — | `200 { "authenticated": true\|false, "expiresAt": <ms>\|null }` | — |
| `login` | POST | `{ "password": "..." }` | `200 { "authenticated": true }` + `Set-Cookie` | `401 invalid_password`; `405` se não for POST; `503 admin_auth_not_configured` se faltar `ADMIN_PASSWORD`/`ADMIN_SESSION_SECRET` |
| `logout` | qualquer | — | `200 { "authenticated": false }` + cookie expirado (`Max-Age=0`) | — |

### Ações autenticadas

| Ação | Método | Payload | Resposta | Erros |
| --- | --- | --- | --- | --- |
| `list` | GET | — | `200 { "patients": [ ... ] }` ordenado por `updated_at` desc | `401` |
| `detail` | GET | query `id` **ou** `key` (slug/código/nome) | `200 { "found": true, "patient": { ... } }` | `401`; `404 { "found": false }` |
| `save` | POST ou PATCH | `{ "patient": { ... } }` ou o objeto direto no body. Com `id` atualiza; sem `id` cria. O servidor normaliza slug, `access_code` e o `profile` inteiro | `200 { "patient": { ... } }` | `401`; `400 missing_full_name` se faltar `full_name` e `profile.name`; `405`; `409` do Supabase em slug/código duplicado |
| `archive` | POST ou PATCH | `{ "id": "...", "is_archived": true\|false }` (aceita `archived`; omitido, arquiva). `id` também pode vir na query | `200 { "patient": { ... } }` | `401`; `400 missing_id`; `404`; `405` |
| `duplicate` | POST | `{ "id": "..." }` (ou `?id=`). Cria cópia com sufixo `-copia-NNNN` no slug e "cópia NNNN" no nome | `200 { "patient": { ... } }` | `401`; `400 missing_id`; `404`; `405` |
| `delete` | DELETE ou POST | `id` na query (`?id=`) ou, via POST, no body `{ "id": "..." }` | `200 { "deleted": true }` | `401`; `400 missing_id`; `405` |

### Erros gerais

- Ação desconhecida (ou ausente): `400 { "error": "unknown_action" }`.
- Supabase não configurado: `503` com a mensagem das variáveis faltantes.
- Erro inesperado: `500 { "error": "unable_to_process_request", "detail": "<mensagem>" }`. Erros HTTP do Supabase preservam o status (5xx do Supabase vira `502`).
