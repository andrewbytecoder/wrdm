import { createPinia } from 'pinia'
import {createApp} from 'vue'
// 全局注册组件
import {
    NForm,
    NFormItem,
    NInputNumber,
    NButton,
    NInput,
    NSelect,
    NRadio,
    NRadioGroup,
    NCheckbox,
    NRadioButton,
    NCheckboxGroup,
    NPopover,
    NDropdown,
    NMenu,
    NTooltip,
    NDivider,
    NTab,
    NTabs,
    NConfigProvider,
    NTabPane,
    NEmpty,
    NGradientText,
    NIcon
} from 'naive-ui'
import { createI18n } from 'vue-i18n'
import App from './App.vue'
import { lang } from './langs'
import './style.scss';

const app = createApp(App)

app.component('NForm', NForm)
app.component('NFormItem', NFormItem)
app.component('NInputNumber', NInputNumber)
app.component('NButton', NButton)
app.component('NInput', NInput)
app.component('NSelect', NSelect)
app.component('NRadio', NRadio)
app.component('NRadioGroup', NRadioGroup)
app.component('NCheckbox', NCheckbox)
app.component('NRadioButton', NRadioButton)
app.component('NCheckboxGroup', NCheckboxGroup)
app.component('NPopover', NPopover)
app.component('NDropdown', NDropdown)
app.component('NMenu', NMenu)
app.component('NTooltip', NTooltip)
app.component('NDivider', NDivider)
app.component('NTab', NTab)
app.component('NTabs', NTabs)
app.component('NTabPane', NTabPane)
app.component('NEmpty', NEmpty)
app.component('NGradientText', NGradientText)
app.component('NIcon', NIcon)

app.use(
    createI18n({
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
