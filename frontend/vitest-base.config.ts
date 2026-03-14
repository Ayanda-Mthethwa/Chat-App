import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    pool: 'vmThreads',
    poolOptions: {
      vmThreads: {
        useAtomics: true,
      },
    },
  },
});
