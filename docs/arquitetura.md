# Arquitetura

## Visão de componentes

```
Navegador
│
├── public/index.html ──────► public/js/admin.js ─┐
│   (painel admin, rota /)                        │
│                                                 ├──► public/js/shared.js (window.EClub)
├── public/assinatura.html ─► public/js/app.js ──┘        · renderPatientProfile (data-attributes + escapeHtml)
│   (página do paciente)                                   · raspadinha do bônus (canvas + localStorage)
│                                                          · buildPublicLink, slugify, helpers
│           │ fetch JSON
│           ▼
├── /api/patient  (api/patient.js)  ── GET público, leitura da página do paciente
├── /api/admin    (api/admin.js)    ── login + CRUD, protegido por sessão
│           │
│           ▼
│   lib/supabase.js ────────► Supabase REST (/rest/v1/patient_portal)
│   lib/admin-session.js ───► cookie HMAC eclub_admin_session
│
└── Roteamento de URLs amigáveis
    ├── middleware.js (Edge) ── redirect 307 para /assinatura?slug=...
    └── vercel.json rewrites ── reescrita server-side das mesmas rotas
```

O frontend nunca acessa o Supabase diretamente: toda leitura e escrita passa pelas funções em `api/`, que usam `lib/supabase.js` com a service role key.

## Ciclo de vida de uma visita de paciente

1. A paciente escaneia o QR Code e abre uma URL amigável, por exemplo `/p/maria-silva` (também aceitas: `/paciente/<slug>`, `/pacientes/<slug>`, `/assinatura/<slug>`).
2. `middleware.js` intercepta a rota (matcher `/p/:path*`, `/paciente/:path*`, `/pacientes/:path*`, `/assinatura/:path*`, `/admin`) e responde com **redirect 307** para `/assinatura?slug=maria-silva`. Se o middleware não atuar, os **rewrites** do `vercel.json` reescrevem para o mesmo destino sem mudar a URL.
3. A Vercel serve `public/assinatura.html` (graças a `cleanUrls`, `/assinatura` resolve para `assinatura.html`).
4. `public/js/app.js` roda no carregamento: `readLookupKey()` extrai a chave da query string (`slug`, `key`, `name`, `code`, `id`, `paciente`, `pacientes`) ou do path, e faz `GET /api/patient?slug=<chave>` com timeout de 10 s.
5. `api/patient.js` chama `getPatientByKey` (`lib/supabase.js`), que normaliza a chave (minúsculas, sem acentos) e busca por `slug`, `access_code` ou `full_name_search`.
6. Com a resposta, `app.js` chama `window.EClub.renderPatientProfile` (`shared.js`), que preenche os elementos `data-profile-*` com `escapeHtml`, e `setupBonusForPatient`, que hidrata a raspadinha do bônus com o estado do `localStorage` daquela paciente.
7. Casos especiais tratados em `app.js`: chave ausente ou não encontrada renderiza um perfil "Registro não encontrado"; o slug `demo` tem fallback local mesmo com API fora do ar; paciente arquivada exibe banner de aviso.

## Ciclo do admin

1. Acesso a `/` carrega `public/index.html` + `public/js/admin.js`.
2. `admin.js` verifica a sessão com `GET /api/admin?action=session`; sem sessão, exibe a tela de login.
3. Login: `POST /api/admin?action=login` com `{ "password": "..." }`. O servidor compara com `ADMIN_PASSWORD` via `timingSafeEqual` e devolve `Set-Cookie: eclub_admin_session=<payload>.<assinatura>` — payload base64url `{ role: "dra-emlyn", exp }` assinado com HMAC-SHA256 (`ADMIN_SESSION_SECRET`), `HttpOnly`, `SameSite=Lax`, validade de 12 horas, `Secure` em produção.
4. Toda ação de dados (`list`, `detail`, `save`, `archive`, `duplicate`, `delete`) passa por `verifySession`, que valida assinatura, role e expiração do cookie; falha retorna 401.
5. As ações chamam `lib/supabase.js`, que monta as requisições REST ao Supabase e normaliza os perfis (slug, código de acesso, listas do JSONB) antes de gravar e ao devolver.
6. `logout` responde com um cookie de `Max-Age=0`.

## Rotas de paciente: 5 pontos de sincronização

**Restrição crítica.** As rotas amigáveis de paciente (`/p`, `/paciente`, `/pacientes`, `/assinatura`) estão espelhadas em cinco lugares. Qualquer mudança de rota (novo prefixo, renomear `assinatura`, etc.) exige atualizar TODOS eles, sob pena de 404 ou links quebrados em parte dos fluxos:

1. **`vercel.json` → `rewrites`** — reescrita server-side na Vercel de `/p/:slug`, `/paciente/:slug`, `/pacientes/:slug` e `/assinatura/:slug` para `/assinatura?slug=:slug` (e `/admin` → `/`).
2. **`middleware.js`** — Edge Middleware com `matcher` das mesmas rotas; responde redirect 307 para `/assinatura?slug=...` antes mesmo do rewrite.
3. **`public/404.html` (script inline)** — rede de segurança: se uma rota de paciente cair no 404, o JavaScript da página detecta os prefixos `p`, `paciente`, `pacientes` e `assinatura/<slug>` e faz `location.replace` para o destino correto.
4. **`scripts/dev-server.js` → `rewritePath()`** — emula os rewrites da Vercel no ambiente local (listas `patientLandingRoutes` e `patientPrefixes`).
5. **`public/js/shared.js` → `buildPublicLink()`** (gera os links públicos no formato `/paciente/<slug>`, usado pelo painel) **+ `public/js/app.js` → `readLookupKey()`** (interpreta os prefixos `p`, `paciente`, `pacientes`, `assinatura` no client para extrair o slug).

## cleanUrls e o layout do repositório

- **`cleanUrls: true`** (`vercel.json`) faz a Vercel servir `assinatura.html` como `/assinatura`, `guia.html` como `/guia` etc., sem extensão. O dev server reproduz isso tentando `<pathname>.html` quando o caminho não tem extensão.
- **`public/` é o `outputDirectory`**: apenas o que está ali vira arquivo público no deploy. Isso protege o restante do repositório — antes da reestruturação, `lib/` e os `.sql` de `supabase/` eram servidos publicamente junto com o site.
- **`api/`, `lib/` e `middleware.js` ficam na raiz por convenção da Vercel**: a plataforma detecta `api/` na raiz do projeto para criar as funções serverless e `middleware.js` na raiz para o Edge Middleware — dentro de `public/` eles seriam tratados como estáticos (ou ignorados). `lib/` fica na raiz para ser importável pelas funções via `require("../lib/...")` sem ser publicado.
- `design/`, `docs/`, `supabase/` e `scripts/` são material de trabalho: além de fora de `public/`, também estão listados no `.vercelignore` e nem sequer são enviados para o build.
