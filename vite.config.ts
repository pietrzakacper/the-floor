import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages project URL: https://<user>.github.io/the-floor/
const repoBase = '/the-floor/'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? repoBase : '/',
}))
