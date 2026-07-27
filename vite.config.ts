import { defineConfig } from 'vite';
import { resolve } from 'path';
import os from 'os';

function getLanAddress(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const lanIp = getLanAddress();

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    host: true,
    port: 3000,
  },
  build: {
    outDir: 'dist',
  },
});

console.log(`\n  服务器启动:\n  - 本地:   http://localhost:3000\n  - 局域网: http://${lanIp}:3000\n`);
