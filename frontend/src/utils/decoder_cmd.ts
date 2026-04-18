import { includes, isEmpty, toUpper, trim } from 'lodash'

/**
 * join execute path and arguments into a command string
 */
export const joinCommand = (path: string, args: string[] = [], emptyContent = '-'): string => {
  let cmd = ''
  let p = trim(path)
  if (!isEmpty(p)) {
    let containValuePlaceholder = false
    cmd = includes(p, ' ') ? `"${p}"` : p
    for (let part of args || []) {
      part = trim(part)
      if (isEmpty(part)) {
        continue
      }
      if (includes(part, ' ')) {
        cmd += ' "' + part + '"'
      } else {
        let seg = part
        if (toUpper(seg) === '{VALUE}') {
          seg = '{VALUE}'
          containValuePlaceholder = true
        }
        cmd += ' ' + seg
      }
    }
    if (!containValuePlaceholder) {
      cmd += ' {VALUE}'
    }
  }
  return cmd || emptyContent
}
