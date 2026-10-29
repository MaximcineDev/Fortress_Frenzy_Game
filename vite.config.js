
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Fortress_Frenzy_Game/',
  server: {
    proxy: {
      '/socket.io': {
        target: 'http://127.0.0.1:3000',
        ws: true
      }
    }
  }
});
