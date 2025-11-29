import { defineStore } from 'pinia'
import { lang } from '../langs'
import { camelCase, isObject, map, set, snakeCase, split } from 'lodash'
import { GetPreferences, RestorePreferences, SetPreferences } from '../../wailsjs/go/services/preferencesService'

// 定义状态类型
interface GeneralPreferences {
    language: string
    font: string
    fontSize: number
    useSysProxy: boolean
    useSysProxyHttp: boolean
    checkUpdate: boolean
}

interface EditorPreferences {
    font: string
    fontSize: number
}

interface PreferencesState {
    general: GeneralPreferences
    editor: EditorPreferences
}

// 定义语言选项类型
interface LanguageOption {
    label: string
    value: string
}

// 定义GetPreferences返回的数据类型
interface PreferencesResponse {
    success: boolean
    data?: Record<string, any>
    msg?: string
}

// 定义RestoreDefault返回的数据类型
interface RestoreResponse {
    success: boolean
    data?: {
        pref: Record<string, any>
    }
    msg?: string
}

const usePreferencesStore = defineStore('preferences', {
    state: (): PreferencesState => ({
        general: {
            language: 'en',
            font: '',
            fontSize: 14,
            useSysProxy: false,
            useSysProxyHttp: false,
            checkUpdate: false,
        },
        editor: {
            font: '',
            fontSize: 14,
        },
    }),
    getters: {
        getSeparator(): string {
            return ':'
        },

        /**
         * all available language
         * @returns {{label: string, value: string}[]}
         */
        langOption(): LanguageOption[] {
            return Object.entries(lang).map(([key, value]) => ({
                value: key,
                label: `${value['lang_name']}`,
            }))
        },
    },
    actions: {
        _applyPreferences(data: Record<string, any>): void {
            for (const key in data) {
                const keys = map(split(key, '.'), camelCase)
                set(this, keys, data[key])
            }
        },

        /**
         * load preferences from local
         * @returns {Promise<void>}
         */
        async loadPreferences(): Promise<void> {
            const resp: PreferencesResponse = await GetPreferences()
            if (resp.success && resp.data) {
                this._applyPreferences(resp.data)
            }
        },

        /**
         * save preferences to local
         * @returns {Promise<boolean>}
         */
        async savePreferences(): Promise<boolean> {
            const obj2Map = (prefix: string, obj: Record<string, any>): Record<string, any> => {
                const result: Record<string, any> = {}
                for (const key in obj) {
                    if (isObject(obj[key])) {
                        // TODO: perform sub object
                    } else {
                        result[`${prefix}.${snakeCase(key)}`] = obj[key]
                    }
                }
                return result
            }

            const pf = Object.assign(
                {},
                obj2Map('general', this.general),
                obj2Map('editor', this.editor)
            )

            await SetPreferences(pf)
            return true
        },

        /**
         * restore preferences to default
         * @returns {Promise<boolean>}
         */
        async restorePreferences(): Promise<boolean> {
            const resp: RestoreResponse = await RestorePreferences()
            if (resp.success && resp.data) {
                const { pref } = resp.data
                this._applyPreferences(pref)
                return true
            }
            return false
        },
    },
})

export default usePreferencesStore