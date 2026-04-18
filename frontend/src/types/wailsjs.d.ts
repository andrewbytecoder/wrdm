/** Wails generated JS lives in `frontend/wailsjs` (gitignored). Declarations match import paths ending in `.js`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WailsFn = (...args: unknown[]) => any

declare module 'wailsjs/runtime/runtime.js' {
  export const BrowserOpenURL: WailsFn
  export const ClipboardGetText: WailsFn
  export const Environment: () => Promise<{ buildType: string; platform: string }>
  export const EventsEmit: WailsFn
  export const EventsOff: WailsFn
  export const EventsOn: WailsFn
  export const Quit: WailsFn
  export const WindowIsFullscreen: WailsFn
  export const WindowIsMaximised: WailsFn
  export const WindowMinimise: WailsFn
  export const WindowSetDarkTheme: WailsFn
  export const WindowSetLightTheme: WailsFn
  export const WindowToggleMaximise: WailsFn
}

declare module 'wailsjs/go/services/browserService.js' {
  export const AddHashField: WailsFn
  export const AddListItem: WailsFn
  export const AddStreamValue: WailsFn
  export const AddZSetValue: WailsFn
  export const BatchSetTTL: WailsFn
  export const BrowseRemoveKeys: WailsFn
  export const BrowseSetKeyFilter: WailsFn
  export const CleanCmdHistory: WailsFn
  export const CloseConnection: WailsFn
  export const ConvertValue: WailsFn
  export const DeleteKey: WailsFn
  export const DeleteKeys: WailsFn
  export const DeleteKeysByPattern: WailsFn
  export const ExportKey: WailsFn
  export const FlushDB: WailsFn
  export const GetBrowserSnapshot: WailsFn
  export const GetClientList: WailsFn
  export const GetCmdHistory: WailsFn
  export const GetHashValue: WailsFn
  export const GetKeyDetail: WailsFn
  export const GetKeySummary: WailsFn
  export const GetKeyType: WailsFn
  export const GetSlowLogs: WailsFn
  export const ImportCSV: WailsFn
  export const LoadAllKeys: WailsFn
  export const LoadNextAllKeys: WailsFn
  export const LoadNextKeys: WailsFn
  export const OpenConnection: WailsFn
  export const OpenDatabase: WailsFn
  export const ReloadKeyLayer: WailsFn
  export const RemoveStreamValues: WailsFn
  export const RenameKey: WailsFn
  export const ServerInfo: WailsFn
  export const SetHashValue: WailsFn
  export const SetKeyTTL: WailsFn
  export const SetKeyValue: WailsFn
  export const SetListItem: WailsFn
  export const SetSetItem: WailsFn
  export const UpdateSetItem: WailsFn
  export const UpdateZSetValue: WailsFn
}

declare module 'wailsjs/go/services/connectionService.js' {
  export const CreateGroup: WailsFn
  export const DeleteConnection: WailsFn
  export const DeleteGroup: WailsFn
  export const ExportConnections: WailsFn
  export const GetConnection: WailsFn
  export const ImportConnections: WailsFn
  export const ListConnection: WailsFn
  export const ListSentinelMasters: WailsFn
  export const ParseConnectURL: WailsFn
  export const RenameGroup: WailsFn
  export const SaveConnection: WailsFn
  export const SaveLastDB: WailsFn
  export const SaveRefreshInterval: WailsFn
  export const SaveSortedConnection: WailsFn
  export const TestConnection: WailsFn
}

declare module 'wailsjs/go/services/preferencesService.js' {
  export const CheckForUpdate: WailsFn
  export const GetAppVersion: WailsFn
  export const GetBuildInDecoder: WailsFn
  export const GetFontList: WailsFn
  export const GetPreferences: WailsFn
  export const RestorePreferences: WailsFn
  export const SetPreferences: WailsFn
}

declare module 'wailsjs/go/services/systemService.js' {
  export const Info: WailsFn
  export const SaveFile: WailsFn
  export const SelectFile: WailsFn
}

declare module 'wailsjs/go/services/pubsubService.js' {
  export const Publish: WailsFn
  export const StartSubscribe: WailsFn
  export const StopSubscribe: WailsFn
}

declare module 'wailsjs/go/services/monitorService.js' {
  export const ExportLog: WailsFn
  export const StartMonitor: WailsFn
  export const StopMonitor: WailsFn
}

declare module 'wailsjs/go/services/cliService.js' {
  export const CloseCli: WailsFn
  export const StartCli: WailsFn
}
