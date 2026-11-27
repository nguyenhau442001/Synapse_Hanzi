// Build config for the Preact "islands" that run inside the live index.html.
//
// The bundle is written to assets/js/preact/ (git-ignored) and built on deploy by
// .github/workflows/deploy.yml, which injects VITE_FIREBASE_API_KEY from repository secrets.
// Each island renders the same markup and CSS classes as the legacy code it replaces.
//
//   npm run build:islands     # rebuild after editing src/islands/**
//
// Two entries: `islands` (boot.js → stable islands.js, loaded with ?v=) only imports `app`
// (main.jsx → chunks/app-[hash].js). Lazy chunks then share the app through that hashed URL and
// never import the ?v=-stamped islands.js, which the browser would evaluate as a second app instance.
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';

const STABLE_ENTRY = 'islands';

export default defineConfig({
  plugins: [tailwindcss(), preact()],
  publicDir: false,
  // Relative base: preload helpers resolve chunk URLs from the importing module, not the site root.
  base: './',
  build: {
    outDir: 'assets/js/preact',
    emptyOutDir: true,
    copyPublicDir: false,
    minify: true,
    target: 'es2020',
    rolldownOptions: {
      input: {
        [STABLE_ENTRY]: 'src/islands/boot.js',
        app: 'src/islands/main.jsx',
      },
      output: {
        format: 'es',
        entryFileNames: (chunk) => (chunk.name === STABLE_ENTRY ? 'islands.js' : 'chunks/[name]-[hash].js'),
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'hanzi-mind.[ext]',
        minify: true
      }
    }
  }
});
