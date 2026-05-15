# Ordering Platform Web

React/Vite frontend for the ordering platform.

## Scripts

Run from the repository root:

```bash
pnpm --filter web run dev
pnpm --filter web run lint
pnpm --filter web run build
```

`pnpm --filter web run build` builds `@repo/shared` first so shared API
contracts are available at runtime.
