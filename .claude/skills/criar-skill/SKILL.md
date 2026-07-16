---
name: criar-skill
description: Template and quality checklist for authoring new Claude Code skills (.claude/skills/<name>/SKILL.md). Use when creating, refining, or reviewing a skill for this project - typically invoked by the arquiteto-de-agentes agent before writing any skill file.
---

# Como criar uma skill de qualidade

Uma skill é conhecimento procedural carregado sob demanda: checklists, comandos exatos, templates. Se o conteúdo é necessário em TODA execução de um agente, ele pertence ao prompt do agente, não a uma skill.

## 1. Decidir se é mesmo uma skill

- **É skill**: procedimento repetível (deploy, triage, checklist de revisão), referência volumosa (tabelas, templates), workflow com comandos exatos.
- **Não é skill**: identidade/escopo de um agente (vai no agente), fato pontual do projeto (vai no CLAUDE.md ou memória), coisa usada uma única vez.

Verifique com Glob (`.claude/skills/*/SKILL.md` e `.agents/skills/*/`) se já existe skill cobrindo o tema — atualize a existente em vez de duplicar.

## 2. Anatomia do arquivo

Local: `.claude/skills/<nome-kebab>/SKILL.md`

```markdown
---
name: <nome-kebab, igual ao nome da pasta>
description: <O QUE ela ensina + QUANDO carregar. Liste gatilhos concretos:
  "Use when the user asks to deploy, publish, or push to production...">
---

# <Título imperativo: "Como fazer X">

<1 parágrafo: o que este procedimento cobre e o resultado esperado.>

## Passos
1. <passo com comando exato ou arquivo exato>
2. ...

## Critério de pronto
- [ ] <condição verificável>
```

A `description` é o único texto que o modelo vê antes de decidir carregar a skill — ela decide tudo. Escreva-a em inglês, com verbos de gatilho ("Use when...") e termos que apareceriam no pedido do usuário (inclua os termos em português se o gatilho for um pedido em português, ex.: "publicar", "raspadinha").

## 3. Quando dividir em arquivos auxiliares

- SKILL.md ideal: ≤ ~100 linhas. Acima disso, mova conteúdo de referência para `references/*.md` na mesma pasta e cite: "consulte `references/tabela-x.md` para a lista completa".
- Scripts utilitários vão em `scripts/` dentro da pasta da skill, com uma linha no SKILL.md dizendo quando executá-los.
- O SKILL.md mantém apenas: quando usar, passos, critério de pronto, ponteiros.

## 4. Checklist de qualidade

- [ ] `description` responde "quando carregar?" com gatilhos concretos, não só "o que é".
- [ ] Nome da pasta = `name` do frontmatter, em kebab-case.
- [ ] Corpo é procedural: passos numerados, comandos/caminhos exatos deste projeto (ex.: `npm run dev`, `scripts/dev-server.js`, porta 4173) — zero teoria.
- [ ] Tem "Critério de pronto" verificável.
- [ ] ≤ ~100 linhas ou devidamente dividida em `references/`.
- [ ] Não duplica skill existente em `.claude/skills/` nem `.agents/skills/`.
- [ ] YAML válido (sem tabs; strings com `:` entre aspas).

## Exemplo de boa description

```
description: Checklist to publish E-Club changes safely. Use when the user asks
  to commit, push, deploy, publish ("publicar", "subir para produção") or when a
  Vercel deploy needs verification. Covers git diff --check, node --check on
  changed .js files, and confirming the Vercel deploy is green.
```
