---
name: focused-git-commits
description: Create safe, focused git commits with narrow staging, dirty-worktree hygiene, local commit-rule compliance, and Conventional Commit naming.
---

# Focused Git Commits

Create only the commit the user requested.

Protect unrelated work.
Never stage or commit files outside the requested scope.

---

## Core Rules

### Commit permission

- Commit only when explicitly requested.
- Completing implementation is not permission to commit.
- Interpret "commit this part" narrowly.

---

### Read local conventions first

Before staging or committing:

- read `docs/agent/workflows/git-commits.md`
- follow its commit naming and scope rules

---

### Inspect worktree

Always inspect:

```
git status --short
git diff --stat
```

Identify:

- requested changes
- unrelated modifications
- generated/temp/debug files
- separable concerns

Do not include unrelated work.

---

### Stage narrowly

Prefer explicit staging:

```
git add path/to/file
```

Avoid:

```
git add .
git add -A
```

unless the user explicitly wants everything committed and the worktree has been
reviewed.

Use partial staging if necessary.

---

### Audit staged changes

Before commit:

```
git diff --cached --stat
git diff --cached --check
git status --short
```

Confirm:

- staged scope is correct
- no unrelated files are included
- no whitespace/check errors remain

---

## Commit Message

Follow repository conventions first.

If no local convention exists, use Conventional Commit format:

```
type: summary
type(scope): summary
```

Prefer concise, action-oriented summaries.

---

## Philosophy

The goal is not merely to create commits.

The goal is to preserve repository integrity and avoid accidental inclusion of
unrelated work.

After committing, report the commit hash, commit message, and any remaining
modified or untracked files.
