---
name: criar-agente
description: Template and quality checklist for authoring new Claude Code subagent definitions (.claude/agents/*.md). Use when creating, refining, or reviewing a subagent for this project - typically invoked by the arquiteto-de-agentes agent before writing any agent file.
---

# Como criar um subagente de qualidade

Siga este procedimento na ordem. Não escreva o arquivo antes de completar os passos 1–3.

## 1. Definir o escopo em uma frase

Complete: "Este agente existe para ____ e entrega ____." Se precisar de "e" ligando duas responsabilidades diferentes, são dois agentes. Verifique com Glob (`.claude/agents/*.md`) se já existe agente cobrindo o escopo — refine o existente em vez de duplicar.

## 2. Escolher as ferramentas (menor privilégio)

| Perfil do agente | Ferramentas |
|---|---|
| Revisão, auditoria, análise, exploração | `Read, Glob, Grep` |
| Escreve/edita código ou documentos | `Read, Glob, Grep, Write, Edit` |
| Precisa rodar testes, dev server, git | acrescente `Bash` |
| Precisa consultar docs externas | acrescente `WebFetch` (raro; justifique) |

Nunca conceda: `Agent` (subagente não delega), `Write` a revisores, `Bash` a quem não executa nada.

## 3. Ler o código que o agente vai tocar

Abra os arquivos-chave do domínio (ver contexto do E-Club no prompt do arquiteto). Extraia: nomes reais de funções, convenções (data-attributes, `escapeHtml`), comandos reais (`npm run dev`). O prompt deve citar esses nomes — agente genérico é agente ruim.

## 4. Escrever o arquivo com este template

```markdown
---
name: <kebab-case, verbo-ou-papel curto>
description: Use this agent when <situação>. Trigger examples - "<pedido típico 1>", "<pedido típico 2>". <Uma frase sobre o que ele entrega.>
tools: <lista do passo 2>
---

Você é <identidade em uma frase>. Seu único produto é <entregável concreto>.

# Escopo
- Faz: <lista curta>
- Não faz: <o que fica fora — explícito>

# Processo
1. <passo verificável>
2. <passo verificável>
3. ...

# Convenções do projeto que você deve respeitar
<subconjunto relevante: data-attributes + escapeHtml, sem dependências novas,
UI em pt-BR, segredos só via env vars, publish-gate antes de commit>

# Formato de entrega
Sua mensagem final deve conter exatamente:
1. <item obrigatório, ex.: lista de arquivos alterados com caminho completo>
2. <item obrigatório, ex.: resultado de node --check / testes>
3. <resumo estruturado do que foi feito/encontrado>
Nunca termine com pergunta aberta; registre suposições e siga.
```

## 5. Checklist de qualidade (reprove o próprio arquivo se falhar em algum)

- [ ] `description` começa com "Use this agent when" e tem ≥2 exemplos de gatilho.
- [ ] Corpo ≤ ~150 linhas; conhecimento volumoso foi para uma skill referenciada.
- [ ] Toda instrução é verificável ("retorne X no formato Y"), nenhuma é vaga ("seja cuidadoso").
- [ ] Há seção "Formato de entrega" — o orquestrador só vê a mensagem final.
- [ ] Ferramentas = mínimo necessário.
- [ ] Cita arquivos/funções reais do projeto, não placeholders.
- [ ] YAML do frontmatter válido (sem tabs, strings com `:` entre aspas).

## Exemplos de boas descriptions

- `Use this agent when Vercel patient routes return 404 or redirect wrongly. Trigger examples - "o link /p/maria deu 404", "a rota /paciente não redireciona". Diagnoses vercel.json rewrites and middleware.js and returns a root-cause report.`
- `Use this agent when patient profile rendering needs changes in shared.js or assinatura.html. Trigger examples - "adicione um campo de alergias no perfil", "mude a ordem das seções da página da paciente".`
