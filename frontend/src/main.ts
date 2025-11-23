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
    NIcon,
    NModal,
    NSpace,
    NMessageProvider,
    NLoadingBarProvider,
    NNotificationProvider,
    NScrollbar,
    NAlert,
    NText,
    NEllipsis,
    NInputGroup,
} from 'naive-ui'
import { createI18n } from 'vue-i18n'
import App from './App.vue'
import { lang } from './langs'
import './style.scss';

const app = createApp(App)

// 全局组件注册，注册之后所有组件都可以使用
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
app.component('NModal', NModal)
app.component('NSpace', NSpace)
app.component('NMessageProvider', NMessageProvider)
app.component('NLoadingBarProvider', NLoadingBarProvider)
app.component('NNotificationProvider', NNotificationProvider)
app.component('NConfigProvider', NConfigProvider)
app.component('NScrollbar', NScrollbar)
app.component('NAlert', NAlert)
app.component('NText', NText)
app.component('NEllipsis', NEllipsis)
app.component('NInputGroup', NInputGroup)


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
