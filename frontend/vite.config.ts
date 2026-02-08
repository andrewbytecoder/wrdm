import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Icons from 'unplugin-icons/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'


const rootPath = new URL('.', import.meta.url).pathname

// https://vitejs.dev/config/
export default defineConfig({
    define: {
        __VUE_OPTIONS_API__: true,
        __VUE_PROD_DEVTOOLS__: false,
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
    },
    plugins: [
        vue(),
        // 全局引入
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
        //   图标 添加图标
        Icons(),
    ],
    //  添加路径别名，添加之后 在 import 中就可以使用别名了
    resolve: {
        alias: {
            '@': rootPath + 'src',
            stores: rootPath + 'src/stores',
            wailsjs: rootPath + 'wailsjs',
        },
    },
})
