import { defineStore } from 'pinia'
import { lang } from '../langs'
import { camelCase, clone, find, isEmpty, isObject, map, set, snakeCase, split } from 'lodash'
import {
    GetFontList,
    GetPreferences,
    RestorePreferences,
    SetPreferences,
} from '../../wailsjs/go/services/preferencesService'
import { useI18n } from 'vue-i18n'


// 定义状态类型
interface GeneralPreferences {
    theme: string
    language: string
    font: string
    fontSize: number
    useSysProxy: boolean
    useSysProxyHttp: boolean
    checkUpdate: boolean
    asideWidth: number
}

interface EditorPreferences {
    font: string
    fontSize: number
}

interface FontItem {
    name: string
    path: string
}

interface FontOptions {
    value: string
    label: string
    path: string
}

interface PreferencesState {
    general: GeneralPreferences
    editor: EditorPreferences
    lastPref: Record<string, any>,
    fontList: FontItem[],
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
            theme: 'light',
            language: 'en',
            font: '',
            fontSize: 14,
            useSysProxy: false,
            useSysProxyHttp: false,
            checkUpdate: false,
            asideWidth: 300,
        },
        editor: {
            font: '',
            fontSize: 14,
        },
        lastPref: {},
        fontList: [],
    }),
    getters: {
        getSeparator(): string {
            return ':'
        },

        themeOption() {
            const i18n = useI18n()
            return [
                {
                    value: 'light',
                    label: i18n.t('theme_light'),
                },
                {
                    value: 'dark',
                    label: i18n.t('theme_dark'),
                },
                {
                    value: 'auto',
                    label: i18n.t('theme_auto'),
                },
            ]
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

        /**
         * all system font list
         * @returns {{path: string, label: string, value: string}[]}
         */
        fontOption(): FontOptions[] {
            const i18n = useI18n()
            const option = map(this.fontList, (font: FontItem):FontOptions => ({
                value: font.name,
                label: font.name,
                path: font.path,
            }))
            option.splice(0, 0, {
                value: '',
                label: i18n.t('none'),
                path: '',
            })
            return option
        },

        /**
         * current font selection
         * @returns {{fontSize: string}}
         */
        generalFont(): Record<string, string> {
            const fontStyle: Record<string, string> = {
                fontSize: this.general.fontSize + 'px',
            }
            if (!isEmpty(this.general.font) && this.general.font !== 'none') {
                const font = find(this.fontList, { name: this.general.font })
                if (font != null) {
                    fontStyle['fontFamily'] = `${font.name}`
                }
            }
            return fontStyle
        }

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
                this.lastPref = clone(resp.data)
                this._applyPreferences(resp.data)
            }
        },

        /**
         * load system font list
         * @returns {Promise<string[]>}
         */
        async loadFontList(): Promise<FontItem[]> {
            const { success, data } = await GetFontList()
            if (success) {
                const { fonts = [] } = data
                this.fontList = fonts
            } else {
                this.fontList = []
            }
            return this.fontList
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
                        const subResult = obj2Map(`${prefix}.${snakeCase(key)}`, obj[key])
                        Object.assign(result, subResult)
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
         * reset to last loaded preferences
         * @returns {Promise<void>}
         */
        async resetToLastPreferences(): Promise<void> {
            if (!isEmpty(this.lastPref)) {
                this._applyPreferences(this.lastPref)
            }
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

        setAsideWidth(width: number): void {
            this.general.asideWidth = width
        },
    },
})

export default usePreferencesStore