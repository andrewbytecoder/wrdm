import { ConnectionType } from "./connection_type";
import { useI18n } from 'vue-i18n'

const i18n = useI18n()
export const contextMenuKey: Record<ConnectionType.Server, { key: string; label: string }> = {
    [ConnectionType.Server]: {
        key: '',
        label: '',
    },
};

//
// export const contextMenuKey: { [ConnectionType.Server]: { key: string; label: string } } = {
//     [ConnectionType.Server]: {
//         key: '',
//         label: '',
//     },
// }