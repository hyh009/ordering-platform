# TypeScript, ESLint, and Prettier

Use this guide when changing TypeScript, ESLint, Prettier, or package-level tooling.

## Ownership

- Root `package.json` owns shared tool versions for TypeScript, ESLint, Prettier, and shared ESLint packages.
- Root `pnpm.overrides` pins shared tool versions when needed.
- App-specific ESLint behavior stays in the app config:
  - `apps/api/eslint.config.mjs`
  - `apps/web/eslint.config.js`
- Root `.prettierrc` is the shared Prettier config.

## ESLint Config

- Keep app-specific rules close to the app that needs them.
- If `parserOptions.project` is set, also set `parserOptions.tsconfigRootDir`.
- Prefer `import.meta.dirname` for app ESLint configs so TSConfig paths resolve from the config file directory.

Example:

```js
parserOptions: {
  project: './tsconfig.eslint.json',
  tsconfigRootDir: import.meta.dirname,
}
```

This avoids typescript-eslint guessing between multiple workspace TSConfig roots.

## Verification

For tooling changes, run the narrowest useful checks first:

```bash
pnpm exec prettier --check <changed-files>
pnpm lint
```

If package versions, TypeScript config, or build behavior changed, also run:

```bash
pnpm build
```
