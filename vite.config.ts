/// <reference types="vitest" />

import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [Vue()],
  test: {
    globals: true,
    environment: 'jsdom'
  },
  server: {
    host: '0.0.0.0', // 允许局域网访问
    port: 5173 // 指定端口
  }
})
