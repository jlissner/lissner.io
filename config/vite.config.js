const { defineConfig } = require('vite')
const react = require('@vitejs/plugin-react')
const path = require('path')

// Get the project root directory (one level up from config)
const projectRoot = path.resolve(__dirname, '..')

module.exports = defineConfig({
  plugins: [react()],
  root: path.join(projectRoot, 'ui'),
  resolve: {
    alias: {
      '@': path.join(projectRoot, 'ui/src'),
      '@/ui': path.join(projectRoot, 'ui/src'),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: path.join(projectRoot, 'dist'),
    emptyOutDir: true,
  },
  optimizeDeps: {
    // Force Vite to pre-bundle these dependencies
    include: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
    // Ensure dependencies are resolved from project root
    force: true
  },
  // Tell Vite where to cache dependencies
  cacheDir: path.join(projectRoot, 'node_modules/.vite'),
  css: {
    postcss: path.join(__dirname, 'postcss.config.js'),
  },
})
