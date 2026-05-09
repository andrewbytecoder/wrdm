import { createPinia } from 'pinia'
import { createApp, nextTick} from 'vue'
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

//  使用示例：dayjs('2024-01-01').fromNow() 返回 "2个月前" 添加人性化示例
dayjs.extend(duration)  // 启用时间段(Duration)功能
dayjs.extend(relativeTime) // 启用相对时间(Relative Time)功能

/**
 * 异步初始化并启动 Vue 应用
 * 
 * 该函数按顺序执行以下初始化步骤：
 * 1. 创建 Vue 应用实例
 * 2. 注册国际化插件和状态管理插件
 * 3. 加载环境变量和平台信息
 * 4. 初始化代码编辑器和图表库
 * 5. 加载用户偏好设置
 * 6. 设置离散 API（主题适配）
 * 7. 配置全局错误处理器
 * 8. 挂载应用到 DOM
 */
async function setupApp() {
  // 创建 Vue 应用实例，传入根组件 App
  const app = createApp(App)
  
  // 注册国际化插件（i18n），支持多语言切换
  app.use(i18n)
  
  // 注册 Pinia 状态管理插件，用于全局状态管理
  app.use(createPinia())

  // 异步加载环境信息和平台特性（如操作系统、Wails 运行时等）
  await loadEnvironment()
  
  // 初始化 Monaco Editor 配置（代码编辑器，用于 Redis 值编辑）
  setupMonaco()
  
  // 初始化 ECharts 配置（图表库，用于监控数据可视化）
  setupChart()
  
  // 获取偏好设置 store 实例
  const prefStore = usePreferencesStore()
  // 异步加载用户的偏好设置（主题、语言、连接配置等）
  await prefStore.loadPreferences()
  
  // 异步设置离散 API，用于主题颜色适配和 UI 组件集成
  await setupDiscreteApi()
  
  // 配置 Vue 全局错误处理器，捕获应用中未处理的错误
  app.config.errorHandler = (err, _instance, _info) => {
    // 使用 nextTick 确保在下一个 DOM 更新周期处理错误
    nextTick().then(() => {
      try {
        // 将错误对象转换为字符串
        const content = String(err)
        // 显示桌面通知，提示用户发生错误
        window.$notification.error(content, {
          title: i18n.global.t('common.error'), // 从国际化配置获取"错误"标题
          meta: 'Please see console output for more detail', // 提示查看控制台获取详细信息
        })
        // 同时在控制台输出完整错误信息，便于调试
        console.error(err)
      } catch {
        // 如果错误通知本身失败，则静默忽略，避免无限循环
        /* ignore */
      }
    })
  }
  
  // 将 Vue 应用挂载到 HTML 中 id="app" 的 DOM 元素上
  app.mount('#app')
}

// 使用 void调用避免 ts的 lint调用报错
void setupApp()
