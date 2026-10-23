/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { offline } from './offline/vite-offline';

export default defineConfig({
  plugins: [offline('mcl-biblia-quiz')],
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
