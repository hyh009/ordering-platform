# Git Commits

Use this guide only when the user directly asks you to create a git commit.

Do not create a commit just because code changes are complete. Wait until the
user explicitly asks for a commit.

Also follow the safe staging and audit workflow in:

```txt
docs/agent/skills/focused-git-commits/SKILL.md
```

## Commit Message Style

This repository uses Conventional Commit style.

Default format:

```txt
type: summary
```

Use a scope only when it identifies a broad workspace area:

```txt
type(scope): summary
```

Common scopes:

- `api`
- `web`
- `shared`
- `workspace`

Common types:

- `feat` for new behavior or capabilities
- `fix` for bug fixes
- `refactor` for behavior-preserving code changes
- `docs` for documentation-only changes
- `test` for tests
- `chore` for tooling, dependency, or maintenance changes

Do not use a scope that repeats the type:

- use `docs: ...` for repository-wide or cross-app documentation
- do not use `docs(docs): ...`
- use `docs(api): ...`, `docs(web): ...`, or similar only when the
  documentation is specifically about that area

Keep the summary:

- lowercase after the type or scope
- imperative or action-oriented
- concise
- specific enough to identify the change

Examples:

```txt
docs: update project README
docs: document full-stack workspace setup
docs(web): document page commands architecture
feat(api): add structured logging and env validation
refactor(api): improve health service testability
fix(api): fix health route path nesting
```
