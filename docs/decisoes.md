# Decisões de arquitetura (ADR-lite)

Registro das decisões estruturais do projeto, no formato Decisão / Contexto / Consequências. Novas decisões relevantes devem ser adicionadas ao final.

## 1. JavaScript vanilla, sem framework e sem build

**Decisão**: todo o frontend é HTML + CSS + JS puro. Não há framework (React, Vue etc.), bundler, transpiler, npm dependencies nem etapa de build.

**Contexto**: o portal tem duas páginas funcionais (painel e página do paciente) mantidas por sessões curtas de trabalho, muitas vezes assistidas por IA. Uma toolchain adicionaria custo de instalação, build e atualização sem ganho proporcional.

**Consequências**:
- Deploy trivial (`buildCommand` é um `echo`) e dev server sem `node_modules`.
- O código compartilhado do frontend vive em `public/js/shared.js` exposto como `window.EClub`; não há imports/modules no browser.
- Sem type-checking nem lint automatizados: `node --check` é o único gate de sintaxe, e a validação é manual no navegador.
- Duplicação consciente de helpers entre `lib/supabase.js` (backend) e `public/js/shared.js` (frontend) — ex.: `slugify`, `normalizeProfile` —, que precisam ser mantidos compatíveis à mão.

## 2. Migração para `public/` como `outputDirectory`

**Decisão**: mover todos os arquivos servidos (HTML, CSS, JS de frontend, assets) para `public/` e apontar `outputDirectory: "public"` no `vercel.json`, mantendo na raiz apenas o que a Vercel exige lá (`api/`, `middleware.js`) e o material interno (`lib/`, `docs/`, `design/`, `supabase/`, `scripts/`).

**Contexto**: antes da reestruturação, o site era servido da raiz do repositório. Além da desorganização (HTML, SQL, PDFs e scripts misturados), isso publicava arquivos internos: `lib/` e os `.sql` de `supabase/` eram acessíveis publicamente no deploy.

**Consequências**:
- A superfície pública fica explícita: só o que está em `public/` é servido.
- Referências no HTML passaram a ser absolutas (`/css/...`, `/js/...`, `/assets/...`).
- O dev server e o `.vercelignore` foram ajustados para o novo layout; qualquer arquivo novo do site deve nascer em `public/`.

## 3. Rotas de paciente espelhadas em 5 pontos

**Decisão**: manter os prefixos de rota de paciente (`/p`, `/paciente`, `/pacientes`, `/assinatura`) duplicados em cinco lugares: rewrites do `vercel.json`, `middleware.js`, script inline do `public/404.html`, `rewritePath` em `scripts/dev-server.js` e o par `buildPublicLink` (`public/js/shared.js`) + `readLookupKey` (`public/js/app.js`).

**Contexto**: cada camada tem um papel que as outras não cobrem — rewrite server-side, redirect na edge, rede de segurança no 404, emulação local e geração/leitura de links no client. Sem uma etapa de build, não há como gerar essas listas a partir de uma fonte única sem introduzir toolchain (contra a decisão 1).

**Consequências**:
- Trade-off aceito: robustez em produção (link de QR Code impresso nunca pode quebrar) em troca de sincronização manual.
- Qualquer mudança de rota exige editar os 5 pontos na mesma alteração; a lista completa está em `docs/arquitetura.md` e no `CLAUDE.md`.

## 4. Raspadinha integrada em `shared.js`, protótipo preservado

**Decisão**: a raspadinha do bônus de R$ 200 (canvas + estado por paciente em `localStorage`) vive integrada em `public/js/shared.js` (funções `setupBonusPopups`/`setupBonusForPatient`), e o protótipo standalone original foi preservado em `design/prototipos/raspadinha_bonus_emlyn_dangui_compacta_200_logo_animada.html`.

**Contexto**: a raspadinha nasceu como um HTML independente. Para funcionar dentro da página do paciente ela precisou ser acoplada ao ciclo de render (chave de storage por paciente, popup automático com atraso, cartão persistente do cupom), o que fazia mais sentido no módulo compartilhado do que em um arquivo isolado.

**Consequências**:
- O estado do bônus segue o paciente (`eclub:bonus:v1:<cupom>:<pessoa>`), sobrevive a recargas e controla auto-abertura, revelação e validade do cupom (60 dias por padrão).
- O protótipo em `design/` serve como referência visual/histórica e não é deployado (fora de `public/` e dentro de pasta ignorada); melhorias devem ser feitas no `shared.js`, não no protótipo.

## 5. `middleware.js` + rewrites coexistem como redundância intencional

**Decisão**: manter simultaneamente o Edge Middleware (redirect 307 de `/p/<slug>` e afins para `/assinatura?slug=...`) e os rewrites equivalentes no `vercel.json`.

**Contexto**: os links de paciente são impressos em QR Codes físicos — um 404 nessas rotas é o pior cenário do produto. Em deploys anteriores houve situações em que uma das camadas não cobria a rota; a combinação garante que, se o middleware não executar, o rewrite resolve (e vice-versa), com o `404.html` como terceira rede de segurança no client.

**Consequências**:
- Comportamento observável: quando o middleware atua, o navegador recebe 307 e a URL muda para `/assinatura?slug=...`; quando só o rewrite atua, a URL amigável permanece na barra. Ambos entregam a mesma página.
- Mais dois dos 5 pontos de sincronização da decisão 3 — é redundância deliberada, não código morto: nenhuma das camadas deve ser removida sem revisão explícita dessa decisão.
