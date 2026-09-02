import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  base: '/OpenSCUBA/',
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'assets',
          dest: ''
        }
      ]
    }),
    viteStaticCopy({
      targets: [
        {
          src: 'sounds',
          dest: ''
        }
      ]
    }),
    viteStaticCopy({
      targets: [
        {
          src: 'textures',
          dest: ''
        }
      ]
    })
  ]
})