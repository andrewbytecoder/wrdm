/**
 * all types of Browser sub tabs
 */
export const BrowserTabType = {
  Status: 'status',
  KeyDetail: 'key_detail',
  Cli: 'cli',
  SlowLog: 'slow_log',
  CmdMonitor: 'cmd_monitor',
  PubMessage: 'pub_message',
} as const

export type BrowserTabTypeValue = (typeof BrowserTabType)[keyof typeof BrowserTabType]
