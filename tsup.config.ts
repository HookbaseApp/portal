import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom'],
  injectStyle: false,
  esbuildOptions(options) {
    options.jsx = 'automatic';
  },
  onSuccess: async () => {
    // Copy CSS file to dist
    const fs = await import('fs');
    const path = await import('path');
    const src = path.join('src', 'styles', 'base.css');
    const dest = path.join('dist', 'styles.css');
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  },
});
