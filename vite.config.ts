import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base './' : chemins relatifs, pour que l'appli marche aussi bien en local qu'à l'adresse
// GitHub Pages (…github.io/SAVAA/). Les routes passent par le # (HashRouter), le document reste à la racine.
export default defineConfig({
  base: './',
  plugins: [react()],
})
