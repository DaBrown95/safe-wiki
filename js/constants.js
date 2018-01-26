/**
 * constants.js : Contains useful constants that are used throughout the application
 *
 * Copyright 2017 David Brown <david_a_brown@mac.com>
 *
 * This file is part of SAFE Wiki
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

import electron from 'electron'
import pkg from '../package.json'

const app = (process.type === 'renderer') ? electron.remote.app : electron.app
const isDevMode = process.execPath.match(/[\\/]electron/)

const CONSTANTS = {
  ENV: {
    DEV: 'development',
    TEST: 'test',
    PROD: 'production'
  },
  APP_INFO: {
    info: {
      id: pkg.identifier,
      scope: null,
      name: pkg.productName,
      vendor: pkg.vendor,
      customExecPath: [isDevMode ? `${process.execPath} ${app.getAppPath()}` : app.getPath('exe')]
    },
    opt: {
      own_container: false
    },
    permissions: {
      _public: [
        'Read',
        'Insert',
        'Update',
        'Delete'
      ],
      _publicNames: [
        'Read',
        'Insert',
        'Update',
        'Delete'
      ]
    }
  },
  APP_ERR_CODE: {
    INVALID_PUBLIC_NAME: -10001,
    INVALID_AUTH_RESP: -10002,
    INVALID_SHARED_MD_RESP: -10003,
    APP_NOT_INITIALISED: -10004,
    INVALID_SERVICE_PATH: -10005,
    INVALID_SERVICE_META: -10006,
    INVALID_SERVICE_NAME: -10007,
    ENTRY_VALUE_NOT_EMPTY: -10008
  },
  FILE_OPEN_MODE: {
    OPEN_MODE_READ: 4
  },
  ACCESS_CONTAINERS: {
    PUBLIC: '_public',
    PUBLIC_NAMES: '_publicNames'
  },
  TYPE_TAG: {
    ZIM_FOLDER: 20010115,
    DNS: 15001,
    WWW: 15002
  },
  ERROR_CODE: {
    ENCODE_DECODE_ERROR: -1,
    SYMMETRIC_DECIPHER_FAILURE: -3,
    ACCESS_DENIED: -100,
    DATA_EXISTS: -104,
    NO_SUCH_ENTRY: -106,
    ENTRY_EXISTS: -107,
    TOO_MANY_ENTRIES: -108,
    NO_SUCH_KEY: -109,
    LOW_BALANCE: -113,
    INVALID_SIGN_KEY_HANDLE: -1011,
    EMPTY_DIR: -1029
  },
  UPLOAD_CHUNK_SIZE: 1000000,
}

// OSX: Add bundle for electron in dev mode
if (isDevMode && process.platform === 'darwin') {
  CONSTANTS.APP_INFO.info.bundle = 'com.github.electron'
}

export default CONSTANTS
