import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Load test environment variables before Vitest runs
const envTestPath = resolve(process.cwd(), '.env.test');
const envPath = resolve(process.cwd(), '.env');

if (existsSync(envTestPath)) {
  dotenv.config({ path: envTestPath });
} else if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/test/**/*.test.ts'],
    exclude: ['dist/**', 'node_modules/**'],
  },
});
