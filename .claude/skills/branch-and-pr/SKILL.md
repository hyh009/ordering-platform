---
name: branch-and-pr
description: Take a piece of work from nothing to main - branching from main, opening the pull request early, choosing between rebase and a merge commit, and the traps that waste an afternoon. Use when starting a new change, when asked to push or open a pull request, or when a push or merge is not behaving.
---

# Branch and Pull Request

Read the workflow before acting:

```txt
docs/agent/workflows/branch-and-pr.md
```

It is the contract. This file only says when to open it.

## Use It When

- Starting a new change and there is no branch for it yet.
- The user asks to push, to open a pull request, or to merge one.
- A push hangs, a merge button is disabled, or a branch switch is refused.
- Work has accumulated on one branch for more than a few days.

## Rules That Must Not Be Guessed

- Branch from `main`, never from another unmerged branch.
- Do not push or open a pull request unless the user asks.
- Do not merge a pull request on the user's behalf.
- Never `git add .` or `git add -A`.

## Related

- `docs/agent/workflows/git-commits.md` for commit messages.
- The `focused-git-commits` skill for staging and audit.
- `docs/agent/workflows/verification.md` for what to run before finishing.
