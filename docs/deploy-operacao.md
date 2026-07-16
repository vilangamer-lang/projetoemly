# Deploy e operação

## vercel.json, campo a campo

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": null,
  "installCommand": "",
  "buildCommand": "echo 'Static site - no build step'",
  "outputDirectory": "public",
  "cleanUrls": true,
  "trailingSlash": false,
  "rewrites": [ ... ]
}
```

| Campo | Valor | Por quê |
| --- | --- | --- |
| `framework` | `null` | Desativa a autodetecção de framework — o site é estático puro. |
| `installCommand` | `""` | Não há dependências npm para instalar. |
| `buildCommand` | `echo ...` | Não há etapa de build; o `echo` apenas deixa isso explícito no log. |
| `outputDirectory` | `"public"` | Somente `public/` vira site estático. `api/` e `middleware.js` são detectados na raiz pela Vercel, independentemente deste campo; `lib/`, `docs/`, `supabase/` etc. ficam fora do site. |
| `cleanUrls` | `true` | Serve `assinatura.html` como `/assinatura`, `guia.html` como `/guia` etc. (URLs sem `.html`). |
| `trailingSlash` | `false` | `/assinatura/` redireciona para `/assinatura`, evitando rota duplicada. |
| `rewrites` | 8 regras | `/admin` → `/`; `/p`, `/paciente`, `/pacientes` → `/assinatura`; `/p/:slug`, `/paciente/:slug`, `/pacientes/:slug`, `/assinatura/:slug` → `/assinatura?slug=:slug`. É um dos 5 pontos de sincronização de rotas (ver `docs/arquitetura.md`). |

Além dos rewrites, `middleware.js` (na raiz) intercepta as mesmas rotas e responde redirect 307 — redundância intencional (ver `docs/decisoes.md`).

## Variáveis de ambiente obrigatórias

Cadastrar no dashboard da Vercel (Settings → Environment Variables), para Production e Preview:

| Variável | Descrição |
| --- | --- |
| `SUPABASE_URL` | URL do projeto Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` ou `SUPABASE_SECRET_KEY` | Chave secreta server-side (basta uma). |
| `SUPABASE_TABLE` | Opcional; padrão `patient_portal`. |
| `ADMIN_PASSWORD` | Senha do painel admin. |
| `ADMIN_SESSION_SECRET` | Segredo do HMAC do cookie de sessão. |

Sem as duas primeiras, `/api/patient` e as ações de dados do `/api/admin` respondem 503; sem as duas últimas, o login responde 503 (`admin_auth_not_configured`).

## O que o .vercelignore exclui e por quê

| Entrada | Motivo |
| --- | --- |
| `*.pdf` | Brandbook e outros PDFs pesados não pertencem ao deploy. |
| `design/` | Material de marca, protótipos e referências — uso interno. |
| `docs/` | Documentação do repositório; não é conteúdo do site. |
| `arquivo/` | Área de arquivos descartáveis/locais. |
| `supabase/` | SQL de schema; aplicado manualmente no Supabase, nunca servido. |
| `scripts/` | Servidor de desenvolvimento local; irrelevante em produção. |
| `__pycache__/`, `*.pyc` | Artefatos de Python de scripts locais antigos. |
| `README.md`, `CLAUDE.md` | Documentação da raiz; não é conteúdo do site. |

Como `outputDirectory` já é `public/`, nada disso seria servido de qualquer forma; o `.vercelignore` evita até o upload desses arquivos para o build, deixando o deploy menor e sem cópia de material interno.

## Checklist de publicação (antes de commit/push)

1. `git diff --check` — sem conflitos nem whitespace errors.
2. `node --check <arquivo>` em cada `.js` alterado (`api/`, `lib/`, `public/js/`, `scripts/`, `middleware.js`) — garante sintaxe válida, já que não há build para acusar erro.
3. Subir o dev server (`npm run dev`) e validar as rotas principais em `http://localhost:4173`:
   - `/` abre o painel (tela de login);
   - `/p/demo` abre a página da paciente demo;
   - `/api/patient?slug=demo` responde JSON (200 com env configurado; 503 sem);
   - `/rota-inexistente` cai no 404 custom.
4. Se alguma rota de paciente mudou: conferir os **5 pontos de sincronização** (`docs/arquitetura.md`).
5. Commit e push na branch de trabalho.
6. Acompanhar o deploy na Vercel até ficar verde (sem erro de build/função).

## Checklist pós-deploy (produção)

1. `/` — painel carrega e o login funciona.
2. `/p/demo` — responde **redirect 307** para `/assinatura?slug=demo` (efeito do middleware) e a página da demo renderiza com agenda e raspadinha.
3. `/api/patient?slug=demo` — retorna `200` com `"found": true` (confirma env vars e Supabase).
4. Rota inexistente (ex.: `/xyz`) — mostra o 404 custom com a marca, não o 404 padrão da Vercel.
5. Assets — logo e imagens carregam (ex.: `/assets/brandbook/emlyn-logo-lockup.png`), e `/css/styles.css` e `/js/shared.js` respondem 200.
