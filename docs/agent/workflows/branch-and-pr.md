# Branch and Pull Request

Taking a piece of work from nothing to `main`.

This guide covers the branch, the pull request, and the merge. For what goes
inside a commit, see:

```txt
docs/agent/workflows/git-commits.md
```

## The Unit of Work

One change, one branch, one pull request.

An OpenSpec change under `openspec/changes/` is already that unit: it has a
scope, a `tasks.md` that says when it is done, and a validator. Use it as the
pull request boundary.

A pull request is the right size when reverting it would not also revert a
decision you want to keep. Line count is not the measure. A thousand lines
adding one field across `shared`, `api`, and `web` is one decision. Three
hundred lines mixing a refactor into a behavior change is two, and neither can
be dropped without the other.

## Starting

Always branch from `main`, never from another feature branch. Branching from
unmerged work drags its commits into this pull request's diff, where nobody can
tell the two changes apart.

```bash
git checkout main
git pull
git checkout -b <type>/<short-description>
```

Branch prefixes match commit types: `feat/`, `fix/`, `chore/`, `docs/`,
`refactor/`.

A dirty worktree blocks the switch when a modified file differs between the two
branches. Commit it or `git stash` it first, and `git stash pop` after.

## Open the Pull Request on the First Commit

Push and open it as a draft as soon as there is one commit, not when the work
is finished:

```bash
git push -u origin <branch>
```

A draft notifies nobody and cannot be merged by accident. What it buys is CI on
every push from the first day, and work that exists somewhere other than one
laptop. `.github/workflows/ci.yml` runs on `pull_request`, and reads the
workflow from the branch under review, so CI runs even for a workflow change
that has not reached `main`.

Take the draft label off when `tasks.md` is complete and `openspec validate`
passes.

## Writing the Description

Point at the specification, not at the diff. For an OpenSpec change that is
`openspec/changes/<name>/proposal.md`; for shipped behavior it is the spec under
`openspec/specs/`. A reader three months later opens those, not 45,000 lines of
diff.

State plainly what is NOT in the change. A proposal document that lands without
its implementation must say so, or readers assume the behavior exists.

## Choosing the Merge Method

| | Use when | Why |
|---|---|---|
| **Rebase and merge** | Small, short-lived branches | Linear history. Good for `git log` and `git bisect`. |
| **Create a merge commit** | Long-lived branches, many commits | Conflicts resolve once, against the final state. |

Rebase replays each commit onto `main` one at a time. That means conflicts are
resolved per commit rather than once, every SHA is rewritten, and — the part
that is easy to miss — **the green CI run does not carry over**. The checks
passed on the commit as it was; after a rebase every commit is a new tree that
has never been built in that combination. Intermediate commits of a long branch
were written assuming their parents and often do not build alone.

Merging prefers the small branch for a reason: on a small branch rebase is
cheap, and the history stays readable. If rebase is painful, the branch is too
big, and that is the same reason its diff is hard to review.

Both methods must be enabled in the repository: **Settings → General → Pull
Requests**. A repository with only one enabled leaves no way out when that one
fails.

## After the Merge

```bash
git checkout main
git pull
```

The branch is finished. Do not push to it again; start the next change from the
refreshed `main`.

Keep the remote branch until its local work is fully committed, then delete it
from the pull request page.

## Traps

**Never `git add .` or `git add -A`.** Stage explicit paths. Agent worktrees
under `.claude/worktrees/` reach hundreds of megabytes, and anything pushed
there can only be removed by rewriting history. See the
`focused-git-commits` skill for the staging and audit routine.

**`git add` takes a snapshot, not a flag.** Editing a file after staging it
leaves the later edit out of the commit. Audit with `git status --short` before
committing: the left column is staged, the right column is not.

**A push that hangs with no output is usually a dropped connection,** not slow
work. Under WSL2 the NAT can discard an idle SSH flow silently; both ends keep
the socket open and neither reports an error. Confirm it by sampling
`/proc/<ssh-pid>/io` — unchanged `rchar`/`wchar` over several seconds means
nothing is moving. The server may already have succeeded, so check the branch on
GitHub before re-pushing.

Prevent it in `~/.ssh/config`:

```txt
Host github.com
  Hostname ssh.github.com
  Port 443
  ServerAliveInterval 20
  ServerAliveCountMax 6
```

Port 443 avoids a blocked or mangled port 22. `ServerAliveCountMax` is what
turns a dead connection into an error instead of an indefinite hang.
