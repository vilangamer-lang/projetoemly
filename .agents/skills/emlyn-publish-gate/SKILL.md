---
name: emlyn-publish-gate
description: "Use before committing or pushing Project Emlyn changes to verify scope, syntax, and GitHub/Vercel publish readiness."
---

# Publish Gate

Use this skill before any `git commit` or `git push` in Project Emlyn.

## Workflow

1. Inspect `git status -sb` and keep the write set small.
2. Run `git diff --check`.
3. Run fast syntax checks on changed JS/JSON files.
4. Confirm there is a real GitHub auth path before push.
5. Push only after the branch and remote are confirmed.
6. Treat the task as incomplete until `origin/main` is updated and the Vercel check is green.

## Do Not

- Stage unrelated files.
- Assume a local commit is enough.
- Declare success before the remote branch and deployment are confirmed.

