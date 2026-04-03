# Agent Workflow Rules

## Git Identity (Mandatory)
- Use GitHub identity `hanafifirman11` when committing/pushing.
- Set repo-local git config to:
  - `user.name = hanafifirman11`
  - `user.email = 22556455+hanafifirman11@users.noreply.github.com`
- Do not use another identity unless explicitly requested by the user in the current task.

## Git Flow (Mandatory)
- Do not push directly to `main`.
- Always create a working branch per task/issue.
- Open a Pull Request for every change and merge via PR.
- Direct push to `main` is allowed only if explicitly requested by the user in the current task.

## Recommended Branch Naming
- `feature/issue-<number>-<short-desc>`
- `fix/issue-<number>-<short-desc>`
- `chore/<short-desc>`

## Minimum PR Checklist
- Relevant tests/build checks pass locally (or clearly explain blockers).
- Scope matches the issue/request.
- No unrelated file changes.
