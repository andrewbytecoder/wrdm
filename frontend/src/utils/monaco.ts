import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import { BrowserOpenURL } from 'wailsjs/runtime/runtime.js'

export const setupMonaco = (): void => {
  ;(window as unknown as { MonacoEnvironment: { getWorker: (_moduleId: string, label: string) => Worker } }).MonacoEnvironment = {
    getWorker: (_, label) => {
      switch (label) {
        case 'json':
          return new jsonWorker()
        case 'css':
        case 'scss':
        case 'less':
          return new cssWorker()
        case 'html':
          return new htmlWorker()
        default:
          return new editorWorker()
      }
    },
  } as never

  monaco.editor.defineTheme('rdm-light', {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editorLineNumber.foreground': '#BABBBD',
      'editorLineNumber.activeForeground': '#777D83',
    },
  })

  monaco.editor.defineTheme('rdm-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {},
  })

  monaco.editor.registerLinkOpener({
    open(resource) {
      BrowserOpenURL(resource.toString())
      return true
    },
  })
}
