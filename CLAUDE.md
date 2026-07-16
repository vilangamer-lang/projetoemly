# CLAUDE.md

Portal E-Club da Enfª Emlyn Dangui (clínica de estética, Itajaí - SC): página pública individual por paciente acessada via QR Code, com bônus em raspadinha, e painel admin protegido por senha na raiz. Dados no Supabase, servido na Vercel.

## Comandos

- `npm run dev` — dev server local em `http://localhost:4173` (serve `public/`, roteia `/api/*`, emula os rewrites). Exporte as variáveis do `.env` antes.
- `node --check <arquivo.js>` — único gate de sintaxe; rode em todo `.js` alterado.
- Não há testes, lint nem build. Validação é manual no navegador.

## Mapa de pastas

- `public/` — tudo que é servido (HTML na raiz dela, `css/`, `js/`, `assets/`); `outputDirectory` da Vercel.
- `api/` — funções serverless (`patient.js`, `admin.js`).
- `lib/` — backend compartilhado (`supabase.js`, `admin-session.js`); nunca servido.
- `middleware.js` — Edge Middleware; redirect 307 das rotas de paciente.
- `scripts/` — `dev-server.js` (porta 4173).
- `supabase/` — `schema.sql` (aplicar no SQL editor) e `project_memory.sql` (auxiliar, fora do portal).
- `design/` — brandbook, protótipos e referências; não deployado.
- `docs/` — documentação (arquitetura, api, banco, deploy, decisões).

## Convenções

- JavaScript vanilla, sem dependências npm, sem framework e sem build.
- Toda UI e texto voltado ao usuário em português brasileiro.
- DOM manipulado via atributos `data-*` (ex.: `data-profile-name`); qualquer valor interpolado em HTML passa por `escapeHtml` (`window.EClub` em `public/js/shared.js`).
- Referências em HTML sempre absolutas: `/css/...`, `/js/...`, `/assets/...`.
- CSS único do site em `public/css/styles.css` (o `404.html` tem estilo inline próprio de propósito).
- Helpers duplicados entre `lib/supabase.js` (backend) e `public/js/shared.js` (frontend) devem ser mantidos compatíveis.

## Regras invioláveis

- NÃO mover nem renomear `api/`, `middleware.js` e `public/404.html` — a Vercel depende desses caminhos.
- Mudança em rota de paciente exige sincronizar os 5 pontos:
  1. `vercel.json` (rewrites)
  2. `middleware.js`
  3. `public/404.html` (script inline)
  4. `scripts/dev-server.js` (`rewritePath`)
  5. `public/js/shared.js` (`buildPublicLink`) + `public/js/app.js` (`readLookupKey`)
- Nunca commitar `.env` nem qualquer segredo hardcoded (senhas, chaves do Supabase); segredos vivem só em env vars.

## Gate de publicação

Antes de commit/push, siga o checklist de `docs/deploy-operacao.md`: `git diff --check`, `node --check` nos `.js` alterados, subir o dev server e validar `/`, `/p/demo`, `/api/patient?slug=demo` e o 404. Após deploy, conferir as rotas em produção (checklist pós-deploy no mesmo arquivo).
