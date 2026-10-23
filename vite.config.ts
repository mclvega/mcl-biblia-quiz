/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { offline } from './offline/vite-offline';
import { version } from './package.json';

export default defineConfig({
  plugins: [offline('mcl-biblia-quiz')],
  define: { __VERSION__: JSON.stringify(version) },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
