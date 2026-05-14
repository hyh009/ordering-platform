import { execFile } from 'node:child_process';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const cjsOutDir = path.join(packageRoot, `.dist-cjs-${process.pid}`);
const distDir = path.join(packageRoot, 'dist');
const legacyCjsOutDir = path.join(packageRoot, '.dist-cjs');

async function copyAsCjs(sourceDir, targetDir) {
  const entries = await readdir(sourceDir, { withFileTypes: true });

  await mkdir(targetDir, { recursive: true });

  await Promise.all(
    entries.map(async (entry) => {
      const sourcePath = path.join(sourceDir, entry.name);
      const targetPath = path.join(targetDir, entry.name);

      if (entry.isDirectory()) {
        await copyAsCjs(sourcePath, targetPath);
        return;
      }

      if (!entry.isFile() || !entry.name.endsWith('.js')) {
        return;
      }

      const cjsPath = targetPath.replace(/\.js$/, '.cjs');
      const source = await readFile(sourcePath, 'utf8');
      const cjsSource = source.replace(
        /require\((['"])(\.[^'"]*?)\.js\1\)/g,
        'require($1$2.cjs$1)',
      );

      await writeFile(cjsPath, cjsSource);
    }),
  );
}

await rm(legacyCjsOutDir, { recursive: true, force: true });
await rm(cjsOutDir, { recursive: true, force: true });
await execFileAsync('tsc', ['-p', 'tsconfig.cjs.json', '--outDir', cjsOutDir], {
  cwd: packageRoot,
});
await copyAsCjs(cjsOutDir, distDir);
await rm(cjsOutDir, { recursive: true, force: true });
