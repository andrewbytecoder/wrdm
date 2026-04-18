import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Icons from 'unplugin-icons/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

const rootPath = fileURLToPath(new URL('.', import.meta.url))
const wailsGeneratedRuntime = join(rootPath, 'wailsjs', 'runtime', 'runtime.js')
const wailsAlias = existsSync(wailsGeneratedRuntime) ? join(rootPath, 'wailsjs') : join(rootPath, 'wailsjs-shim')

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      imports: [
        {
          'naive-ui': ['useDialog', 'useMessage', 'useNotification', 'useLoadingBar'],
        },
      ],
    }),
    Components({
      resolvers: [NaiveUiResolver()],
    }),
    Icons(),
  ],
  resolve: {
    alias: {
      '@': rootPath + '/src',
      stores: rootPath + '/src/stores',
      wailsjs: wailsAlias,
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      } as Record<string, string>,
    },
  },
})
