import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  // Resolves the `src/*` (baseUrl) and `@recall/shared` imports from each
  // package's tsconfig so tests resolve modules the same way tsc and tsx do.
  plugins: [tsconfigPaths()],
});
