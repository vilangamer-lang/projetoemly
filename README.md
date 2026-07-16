# Portal E-Club — Enfª Emlyn Dangui

Portal web da clínica de estética da Enfª Emlyn Dangui (Itajaí - SC). Cada paciente recebe um QR Code que abre uma página pública individual com agenda de consultas, histórico de visitas, procedimentos, observações e um bônus de R$ 200 revelado por uma raspadinha interativa (canvas, com estado persistido em `localStorage`).

A raiz do site (`/`) é o painel administrativo da clínica, protegido por senha com sessão em cookie HMAC de 12 horas. Nele a equipe cadastra, edita, arquiva, duplica e exclui as páginas de pacientes, além de copiar o link público de cada uma.

Os dados vivem no Supabase (tabela `patient_portal`), acessados exclusivamente pelo backend por meio da service role key — o navegador nunca fala com o Supabase diretamente.

## Stack

- **Frontend**: HTML + CSS + JavaScript vanilla, sem framework e sem etapa de build.
- **Backend**: funções serverless Node.js na Vercel (`api/`), com lógica compartilhada em `lib/`.
- **Roteamento**: `vercel.json` (rewrites + `cleanUrls`) e `middleware.js` (Edge Middleware).
- **Banco**: Supabase (PostgreSQL) via REST (`/rest/v1`), com RLS restrito ao `service_role`.
- **Dev local**: servidor Node próprio (`scripts/dev-server.js`), sem dependências npm.

## Estrutura do repositório

```
.
├── api/                  # Funções serverless da Vercel
│   ├── patient.js        # GET /api/patient — dados públicos da página do paciente
│   └── admin.js          # /api/admin?action=... — login e CRUD do painel
├── lib/                  # Código de backend compartilhado (não servido publicamente)
│   ├── supabase.js       # Cliente REST do Supabase, normalização de perfis, slugs
│   └── admin-session.js  # Cookie de sessão HMAC do admin
├── middleware.js         # Edge Middleware — redireciona rotas de paciente (307)
├── public/               # Diretório servido pela Vercel (outputDirectory)
│   ├── index.html        # Painel admin (rota /)
│   ├── assinatura.html   # Página pública do paciente
│   ├── guia.html         # Redireciona /guia para /
│   ├── 404.html          # 404 custom com auto-correção de rotas de paciente
│   ├── css/styles.css    # Folha de estilos única do projeto
│   ├── js/
│   │   ├── shared.js     # window.EClub: render de perfil, raspadinha, helpers
│   │   ├── app.js        # Lógica da página pública do paciente
│   │   └── admin.js      # Lógica do painel admin
│   └── assets/brandbook/ # Imagens de marca usadas pelas páginas
├── scripts/
│   └── dev-server.js     # Servidor local (porta 4173) que emula os rewrites
├── supabase/
│   ├── schema.sql        # Schema da tabela patient_portal + trigger + RLS + seeds
│   └── project_memory.sql# Tabela auxiliar de memória de sessões de IA (fora do portal)
├── design/               # Material de marca, protótipos e referências (não deployado)
├── docs/                 # Documentação do projeto
├── vercel.json           # Configuração de deploy e rewrites
├── .vercelignore         # Arquivos excluídos do deploy
└── .env.example          # Modelo das variáveis de ambiente
```

## Rodando localmente

1. Copie o modelo de variáveis de ambiente e preencha os valores:

   ```bash
   cp .env.example .env
   ```

2. Exporte as variáveis no shell antes de subir o servidor (o dev server não lê o `.env` automaticamente):

   ```bash
   export $(grep -v '^#' .env | xargs)
   ```

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `SUPABASE_URL` | Sim | URL do projeto Supabase (ex.: `https://xxxx.supabase.co`). |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim* | Service role key (JWT legado) do Supabase. |
| `SUPABASE_SECRET_KEY` | Sim* | Alternativa: secret key no formato novo. Basta uma das duas. |
| `SUPABASE_TABLE` | Não | Nome da tabela (padrão: `patient_portal`). |
| `ADMIN_PASSWORD` | Sim | Senha de login do painel admin. |
| `ADMIN_SESSION_SECRET` | Sim | Segredo usado para assinar o cookie de sessão (HMAC-SHA256). |

3. Suba o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

   O servidor escuta em `http://localhost:4173`, serve os estáticos de `public/` e roteia `/api/*` para os handlers de `api/` — sem `SUPABASE_URL` configurada, a API responde 503.

4. URLs de teste:

   - `http://localhost:4173/` — painel admin
   - `http://localhost:4173/p/demo` — página do paciente demo
   - `http://localhost:4173/assinatura?slug=demo` — mesma página via query string
   - `http://localhost:4173/api/patient?slug=demo` — resposta JSON da API
   - `http://localhost:4173/rota-inexistente` — 404 custom

## Rotas públicas

| Rota | O que serve |
| --- | --- |
| `/` | Painel admin (`public/index.html`), com tela de login. |
| `/admin` | Redireciona para `/`. |
| `/assinatura?slug=<slug>` | Página pública do paciente (`public/assinatura.html`). |
| `/p/<slug>` | Rota curta do QR Code — redireciona/reescreve para `/assinatura?slug=<slug>`. |
| `/paciente/<slug>` | Mesmo destino de `/p/<slug>` (formato usado em `buildPublicLink`). |
| `/pacientes/<slug>` | Mesmo destino de `/p/<slug>`. |
| `/assinatura/<slug>` | Mesmo destino de `/p/<slug>`. |
| `/guia` | Redireciona para `/` (`public/guia.html`). |
| `/api/patient?slug=<slug>` | JSON público com o perfil do paciente. |
| `/api/admin?action=<action>` | API do painel (a maioria das ações exige sessão). |

Atenção: as rotas de paciente estão espelhadas em 5 pontos do código que precisam ficar sincronizados. Veja [docs/arquitetura.md](docs/arquitetura.md).

## Deploy

O deploy é feito na Vercel a partir do repositório Git:

- `vercel.json` define `outputDirectory: "public"` — só o conteúdo de `public/` vira site estático; `api/` vira funções serverless e `middleware.js` vira Edge Middleware automaticamente.
- Não há etapa de build (`buildCommand` é um `echo`).
- As variáveis de ambiente da tabela acima devem ser cadastradas no dashboard da Vercel (Settings → Environment Variables) para Production e Preview.
- `.vercelignore` exclui do deploy documentação, design, SQL e scripts locais.

Checklists de publicação e validação pós-deploy: [docs/deploy-operacao.md](docs/deploy-operacao.md).

## Documentação

- [docs/arquitetura.md](docs/arquitetura.md) — componentes, fluxos e os 5 pontos de sincronização de rotas.
- [docs/api.md](docs/api.md) — contrato dos endpoints `/api/patient` e `/api/admin`.
- [docs/banco-de-dados.md](docs/banco-de-dados.md) — schema do Supabase, trigger, RLS e seeds.
- [docs/deploy-operacao.md](docs/deploy-operacao.md) — configuração da Vercel e checklists de operação.
- [docs/decisoes.md](docs/decisoes.md) — registro de decisões de arquitetura (ADR-lite).
- [docs/briefing-original.md](docs/briefing-original.md) — briefing histórico do projeto.
