import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  esbuild: {
    keepNames: true,
  },
  build: {
    lib: {
      entry: './src/index.ts',
      name: 'effector-action',
      fileName: 'index',
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['effector', 'patronum/spread'],
    },
  },
  plugins: [dts({ rollupTypes: true })],
});
