import { createPinia } from 'pinia'
import { createApp, nextTick } from 'vue'
import App from './App.vue'
import './styles/style.scss'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import { i18n } from '@/utils/i18n'
import { setupDiscreteApi } from '@/utils/discrete'
import usePreferencesStore from 'stores/preferences'
import { loadEnvironment } from '@/utils/platform'
import { setupMonaco } from '@/utils/monaco'
import { setupChart } from '@/utils/chart'

dayjs.extend(duration)
dayjs.extend(relativeTime)

async function setupApp() {
  const app = createApp(App)
  app.use(i18n)
  app.use(createPinia())

  await loadEnvironment()
  setupMonaco()
  setupChart()
  const prefStore = usePreferencesStore()
  await prefStore.loadPreferences()
  await setupDiscreteApi()
  app.config.errorHandler = (err, _instance, _info) => {
    nextTick().then(() => {
      try {
        const content = String(err)
        window.$notification.error(content, {
          title: i18n.global.t('common.error'),
          meta: 'Please see console output for more detail',
        })
        console.error(err)
      } catch {
        /* ignore */
      }
    })
  }
  app.mount('#app')
}

void setupApp()
