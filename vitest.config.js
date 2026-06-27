import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    reporters: ['verbose', 'html'],
    outputFile: {
      html: './html-report/index.html',
    },
  },
});
