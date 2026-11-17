import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '..', ''); // 저장소 루트의 .env에서 PORT만 읽는다 (프론트 번들에는 들어가지 않음)
  return {
    plugins: [react()],
    server: { proxy: { '/api': `http://localhost:${env.PORT || 3000}` } },
  };
});
