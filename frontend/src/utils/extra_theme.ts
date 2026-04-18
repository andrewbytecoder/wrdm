export interface ExtraTheme {
  titleColor: string
  ribbonColor: string
  ribbonActiveColor: string
  sidebarColor: string
  splitColor: string
}

export const extraLightTheme: ExtraTheme = {
  titleColor: '#F2F2F2',
  ribbonColor: '#F9F9F9',
  ribbonActiveColor: '#E3E3E3',
  sidebarColor: '#F2F2F2',
  splitColor: '#DADADA',
}

export const extraDarkTheme: ExtraTheme = {
  titleColor: '#262626',
  ribbonColor: '#2C2C2C',
  ribbonActiveColor: '#363636',
  sidebarColor: '#262626',
  splitColor: '#474747',
}

export const extraTheme = (dark: boolean): ExtraTheme => {
  return dark ? extraDarkTheme : extraLightTheme
}
