/** Stub when `wails generate` output is absent (e.g. CI). Replaced locally by real Wails bindings. */

export async function BrowserOpenURL() {}

export async function ClipboardGetText() {
  return ''
}

export async function Environment() {
  return { buildType: 'dev', platform: 'windows' }
}

export function EventsEmit() {}

export function EventsOff() {}

export function EventsOn() {}

export function Quit() {}

export async function WindowIsFullscreen() {
  return false
}

export async function WindowIsMaximised() {
  return false
}

export function WindowMinimise() {}

export function WindowSetDarkTheme() {}

export function WindowSetLightTheme() {}

export function WindowToggleMaximise() {}
