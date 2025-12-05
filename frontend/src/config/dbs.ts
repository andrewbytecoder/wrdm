


// 定义类型 type.Connection 更新这里也需要进行更新
export interface ConnectionItem   {
    name: string;
    group: string;
    addr?: string;
    port?: number;
    username?: string;
    password?: string;
    defaultFilter?: string;
    keySeparator?: string;
    connTimeout?: number;
    execTimeout?: number;
    markColor?: string;
    type?: number;
    // -- from Connection
    key: string
    label: string
    db?: number
    keys?: number
    connected?: boolean
    opened?: boolean
    expanded?: boolean
    isLeaf?: boolean
    redisKey?: string
    connections?: ConnectionItem[]
}



export class ConnParam implements ConnectionItem {
    name: string;
    group: string;
    addr?: string;
    port?: number;
    username?: string;
    password?: string;
    defaultFilter?: string;
    keySeparator?: string;
    connTimeout?: number;
    execTimeout?: number;
    markColor?: string;
    type?: number;
    // -- from Connection
    key: string
    label: string
    db?: number
    keys?: number
    connected?: boolean
    opened?: boolean
    expanded?: boolean
    isLeaf?: boolean
    redisKey?: string
    connections?: ConnectionItem[]

    constructor(name: string, group: string, key:string,label:string, addr?: string, port?: number,
                username?: string, password?: string, defaultFilter?: string, keySeparator?: string,
                connTimeout?: number, execTimeout?: number, markColor?: string, type?: number) {
        this.name = name
        this.group = group
        this.key = key
        this.label = label
        this.addr = addr
        this.port = port
        this.username = username
        this.password = password
        this.defaultFilter = defaultFilter
        this.keySeparator = keySeparator
        this.connTimeout = connTimeout
    }
}