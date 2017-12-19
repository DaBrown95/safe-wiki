/**
 * network.js : Contains the core logic for connecting to the SAFE Network
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

import { fromAuthURI, initializeApp } from '@maidsafe/safe-node-app'

import makeError from './error'
import CONSTANTS from '../constants'
import helpers from './helpers'

const _app = Symbol('app')
const _appInfo = Symbol('appInfo')

export default class Network {
  constructor () {
    this[_app] = null
    this[_appInfo] = CONSTANTS.APP_INFO
  }

  get app () {
    return this[_app]
  }

  /**
   * Send Authorisation request to Authenticator.
   * - Initialise the application object
   * - Generate Auth request URI
   * - Send URI to Authenticator
   */
  async requestAuth () {
    console.log('Requesting auth')
    try {
      const app = await initializeApp(this[_appInfo].info)
      const resp = await app.auth.genAuthUri(this[_appInfo].permissions, this[_appInfo].opts)
      // commented out until system_uri open issue is solved for osx
      // await app.auth.openUri(resp.uri);
      helpers.openExternal(resp.uri)
    } catch (err) {
      throw err
    }
  }

  /**
   * Connect with SAFE network after receiving response from Authenticator.
   * This handles auth response, container response, revoked response and deny response.
   * @param {string} uri safe response URI
   // * @param {*} netStatusCallback callback function to handle network state change
   */
  async connect (uri) {
    console.log('Connecting...')
    if (!uri) {
      return Promise.reject(makeError(CONSTANTS.APP_ERR_CODE.INVALID_AUTH_RESP,
        'Invalid Auth response'))
    }

    try {
      this[_app] = await fromAuthURI(this[_appInfo].info, uri)
      await this.app.auth.refreshContainersPermissions()
      // netStatusCallback(CONSTANTS.NETWORK_STATE.CONNECTED);
    } catch (err) {
      throw err
    }
  }

  /**
   * Reconnect the application with SAFE Network when disconnected
   */
  reconnect () {
    if (!this.app) {
      return Promise.reject(makeError(CONSTANTS.APP_ERR_CODE.APP_NOT_INITIALISED,
        'Application not initialised'))
    }
    return this.app.reconnect()
  }
}
