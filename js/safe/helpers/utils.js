/**
 * utils.js : Small snippets of useful code
 *
 * Copyright 2017 Maidsafe
 * Copyright 2017 David Brown <david_a_brown@mac.com>
 *
 * This file was originally part of the 'Web Hosting Manager' sample app.
 * https://github.com/maidsafe/safe_examples/tree/880a367bb6bdc0a61e33d0909e2089000148d0bd
 *
 * License GPL v3:
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import path from 'path'
import { shell } from 'electron'

import CONSTANTS from '../../constants'

const parseUrl = url => (
  (url.indexOf('safe-auth://') === -1) ? url.replace('safe-auth:', 'safe-auth://') : url
)

export const openExternal = url => (
  shell.openExternal(parseUrl(url))
)

export const nodeEnv = process.env.NODE_ENV || CONSTANTS.ENV.DEV

export const parseNetworkPath = (nwPath) => {
  const result = {
    dir: undefined,
    file: undefined
  }
  if (nwPath) {
    const sep = '/'
    if (path.sep === '\\') {
      const regx = new RegExp(/\\/, 'g')
      nwPath = nwPath.replace(regx, sep)
    }
    const splitPath = nwPath.split(sep)
    result.dir = splitPath.slice(0, 3).join(sep)
    result.file = splitPath.slice(3).join(sep) || path.basename(nwPath)
  }
  return result
}
