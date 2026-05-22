import { connectMongo } from '@src/config/db';
import {
  initSuperAdminWithInput,
  parseInitSuperAdminInput,
} from '@src/scripts/initSuperAdmin';
import mongoose from 'mongoose';

async function main() {
  const input = parseInitSuperAdminInput(process.env);

  await connectMongo();

  try {
    const result = await initSuperAdminWithInput(input);

    process.stdout.write(`${result.message}\n`);
    process.exitCode = result.code;
  } finally {
    await mongoose.connection.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
