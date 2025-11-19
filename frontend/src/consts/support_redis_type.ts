// 方法一：使用 TypeScript enum (推荐用于有限的、固定的集合)
export enum RedisDataTypeEnum {
    STRING = 'STRING',
    HASH = 'HASH',
    LIST = 'LIST',
    SET = 'SET',
    ZSET = 'ZSET',
}

// 如果使用 enum，types 对象可以简化或省略（直接用 enum）
// 如果仍想保留类似 JS 的对象结构：
export const types = {
    STRING: RedisDataTypeEnum.STRING,
    HASH: RedisDataTypeEnum.HASH,
    LIST: RedisDataTypeEnum.LIST,
    SET: RedisDataTypeEnum.SET,
    ZSET: RedisDataTypeEnum.ZSET,
} as const; // 'as const' 使对象及其属性变为 readonly 字面量类型

export const validType = (t: string): boolean => {
    return Object.prototype.hasOwnProperty.call(types, t)
}

//
// // 如果使用 enum
// export const validType = (t: string): t is RedisDataTypeEnum => {
//     // 注意：对于 enum，通常直接用 Object.values(Enum).includes(t) 更直接
//     return Object.values(RedisDataTypeEnum).includes(t as RedisDataTypeEnum);
//     // 或者如果保留了 types 对象: return Object.values(types).includes(t as RedisDataTypeEnum);
// }
//
// // 如果使用字面量类型联合
// export const validType = (t: string): t is RedisDataType => {
//     return Object.values(types).includes(t as RedisDataType); // types 的值就是 RedisDataType 的联合类型
//     // 或者更直接地检查 keys: return t in types;
// }
//
// // 或者如果不使用 Type Guards (类型守卫)，只是返回 boolean
// export const validType = (t: string): boolean => {
//     return t in types; // 'in' 操作符检查属性是否存在，适用于对象
//     // 或 return Object.hasOwn(types, t); // ES2022+ 更现代的方式替代 hasOwnProperty
// }
