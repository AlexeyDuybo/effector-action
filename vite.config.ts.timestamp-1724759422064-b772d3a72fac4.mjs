// vite.config.ts
import { defineConfig } from 'file:///Users/a.dyubo/projects/effector-action/node_modules/vite/dist/node/index.js';
import dts from 'file:///Users/a.dyubo/projects/effector-action/node_modules/vite-plugin-dts/dist/index.mjs';
var vite_config_default = defineConfig({
  build: {
    lib: {
      entry: './src/index.ts',
      name: 'effector-action',
      fileName: (format, entry) => 'xd' + String(Math.random()),
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['effector', 'patronum/spread'],
    },
  },
  plugins: [dts({ rollupTypes: true })],
});
export { vite_config_default as default };
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvYS5keXViby9wcm9qZWN0cy9lZmZlY3Rvci1hY3Rpb25cIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9hLmR5dWJvL3Byb2plY3RzL2VmZmVjdG9yLWFjdGlvbi92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvYS5keXViby9wcm9qZWN0cy9lZmZlY3Rvci1hY3Rpb24vdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCBkdHMgZnJvbSAndml0ZS1wbHVnaW4tZHRzJztcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgYnVpbGQ6IHtcbiAgICBsaWI6IHtcbiAgICAgIGVudHJ5OiAnLi9zcmMvaW5kZXgudHMnLFxuICAgICAgbmFtZTogJ2VmZmVjdG9yLWFjdGlvbicsXG4gICAgICBmaWxlTmFtZTogKGZvcm1hdCwgZW50cnkpID0+ICd4ZCcgKyBTdHJpbmcoTWF0aC5yYW5kb20oKSksXG4gICAgICBmb3JtYXRzOiBbJ2VzJywgJ2NqcyddLFxuICAgIH0sXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgZXh0ZXJuYWw6IFsnZWZmZWN0b3InLCAncGF0cm9udW0vc3ByZWFkJ10sXG4gICAgfSxcbiAgfSxcbiAgcGx1Z2luczogW2R0cyh7IHJvbGx1cFR5cGVzOiB0cnVlIH0pXSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF1UyxTQUFTLG9CQUFvQjtBQUNwVSxPQUFPLFNBQVM7QUFFaEIsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsT0FBTztBQUFBLElBQ0wsS0FBSztBQUFBLE1BQ0gsT0FBTztBQUFBLE1BQ1AsTUFBTTtBQUFBLE1BQ04sVUFBVSxDQUFDLFFBQVEsVUFBVSxPQUFPLE9BQU8sS0FBSyxPQUFPLENBQUM7QUFBQSxNQUN4RCxTQUFTLENBQUMsTUFBTSxLQUFLO0FBQUEsSUFDdkI7QUFBQSxJQUNBLGVBQWU7QUFBQSxNQUNiLFVBQVUsQ0FBQyxZQUFZLGlCQUFpQjtBQUFBLElBQzFDO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUyxDQUFDLElBQUksRUFBRSxhQUFhLEtBQUssQ0FBQyxDQUFDO0FBQ3RDLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
