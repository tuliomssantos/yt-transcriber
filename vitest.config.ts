import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths'; // only if using aliases

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    pool: 'forks', // avoids weird worker errors in server context :contentReference[oaicite:4]{index=4}
  },
  plugins: [tsconfigPaths()],
});
