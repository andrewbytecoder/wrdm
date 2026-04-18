import { Environment } from 'wailsjs/runtime/runtime.js'

let os = ''

export async function loadEnvironment(): Promise<void> {
  const env = await Environment()
  os = env.platform
}

export function isMacOS(): boolean {
  return os === 'darwin'
}

export function isWindows(): boolean {
  return os === 'windows'
}
