import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '..', ''); // 저장소 루트의 .env에서 PORT만 읽는다 (프론트 번들에는 들어가지 않음)
  return {
    plugins: [react()],
    // Host를 바꾸지 않는다: 카카오 로그인 Redirect URI가 등록한 주소(localhost:5173)와 같아야 해서
    server: { proxy: { '/api': { target: `http://localhost:${env.PORT || 3000}`, changeOrigin: false } } },
  };
});
