import vue from '@vitejs/plugin-vue'

export default {
  plugins: [vue()],
  base: '/',
  server: {
    port: 3000
  }
}