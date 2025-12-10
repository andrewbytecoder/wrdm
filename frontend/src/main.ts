import { createPinia } from 'pinia'
import {createApp} from 'vue'
import { createI18n } from 'vue-i18n'
import App from './App.vue'
import { lang } from './langs'
import './style.scss';
import {setupNaive} from "./config/naives";

const app = createApp(App)

// 注册常用 naive 组件
setupNaive(app)

app.use(
    createI18n({
        legacy: false,
        locale: 'en',
        fallbackLocale: 'en',
        globalInjection: true,
        messages: {
            ...lang,
        },
    })
)

app.use(createPinia())

app.mount('#app')
