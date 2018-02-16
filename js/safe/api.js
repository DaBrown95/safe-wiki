/**
 * api.js
 *
 * Copyright 2017 Maidsafe
 * Copyright 2017-2018 David Brown <david_a_brown@mac.com>
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

import Network from './network'
import Uploader from './uploader'
import makeError from './error'
import CONSTANTS from '../constants'

const _publicNames = Symbol('publicNames')
const _uploader = Symbol('uploader')
const _downloader = Symbol('downloader')

class SafeApi extends Network {
  constructor () {
    super()
    this[_publicNames] = []
    this[_uploader] = null
    this[_downloader] = null
  }

  /**
   * Check application has access to containers requested.
   */
  canAccessContainers () {
    return new Promise(async (resolve, reject) => {
      if (!this.app) {
        return Promise.reject(makeError(CONSTANTS.APP_ERR_CODE.APP_NOT_INITIALISED,
          'Application not initialised'))
      }
      try {
        await this.app.auth.refreshContainersPermissions()
        console.log('Refreshed containers...')
        const accessContainers = Object.keys(CONSTANTS.ACCESS_CONTAINERS)
        console.log(accessContainers)
        await Promise.all(accessContainers.map(cont =>
          this.app.auth.canAccessContainer(CONSTANTS.ACCESS_CONTAINERS[cont])))
        resolve(true)
      } catch (err) {
        reject(err)
      }
    })
  }

  /**
   * Used to check if the user already has a zim folder.
   * @returns {Promise<any>}
   */
  hasZimFolder () {
    return new Promise(async (resolve, reject) => {
      if (!this.app) {
        return reject(makeError(CONSTANTS.APP_ERR_CODE.APP_NOT_INITIALISED,
          'Application not initialised'))
      }
      try {
        const publicContainer = await this.getPublicContainer()
        await publicContainer.get('zim')
        resolve(true)
      } catch (err) {
        resolve(false)
      }
    })
  }

  /**
   * Reads the selected bytes from the specified file.
   *
   * @param zimFolder the MD that contains the zim file
   * @param filename the name of the file within the users 'zim folder'
   * @param begin start position
   * @param size end position
   * @returns {Promise<any>}
   */
  readZim (zimFolder, filename, begin, size) {
    return new Promise(async (resolve, reject) => {
      try {
        const nfs = zimFolder.emulateAs('NFS')
        let file = await nfs.fetch(filename)
        file = await nfs.open(file, CONSTANTS.FILE_OPEN_MODE.OPEN_MODE_READ)
        let data = await file.read(begin, size)
        file.close()
        resolve(data)
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Used to retrieve the size of the specified zim file.
   *
   * @param zimFolder the MD that contains the zim file
   * @param filename the nfs name of the file
   * @returns {Promise<any>}
   */
  getFileSize (zimFolder, filename) {
    return new Promise(async (resolve, reject) => {
      try {
        const nfs = zimFolder.emulateAs('NFS')
        let file = await nfs.fetch(filename)
        let fileSize = await file.size()
        console.log('File size: ' + fileSize)
        resolve(fileSize)
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Creates a folder inside the users public container. This folder has the key 'zim' and its value is that
   * of a public MD that will be used with NFS emulation to contain zim files. The name of this MD is used to allow
   * another user to access the ZIM files.
   *
   * @param zimFolderName the publicly known 'name' of this colleciton of zim files.
   * @param description a description that can be presented to the user or for other purposes.
   * @returns {Promise<any>}
   */
  createZimFolder (zimFolderName, description) {
    return new Promise(async (resolve, reject) => {
      try {
        const hashedName = await this.sha3Hash(zimFolderName)
        const zimFolder = await this.app.mutableData.newPublic(hashedName, CONSTANTS.TYPE_TAG.ZIM_FOLDER)
        await zimFolder.quickSetup({}, zimFolderName, description)
        const zimFolderInfo = await zimFolder.getNameAndTag()
        const publicContainer = await this.getPublicContainer()
        await this._insertToMData(publicContainer, 'zim', zimFolderInfo.name)
        resolve(zimFolderInfo.name)
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Upload a zim file.
   * @param {string} localPath to the zim file on the local machine
   * @param {string} fileName human readable name of the file
   */
  fileUpload (localPath, fileName) {
    console.log('Local path:' + localPath + ' File name: ' + fileName)
    this[_uploader] = new Uploader(this, localPath, fileName)
    this[_uploader].upload()
  }

  /**
   * Deletes the target zim file from the users 'zim folder'.
   *
   * @param fileName the name of the zim file
   * @returns {Promise<any>}
   */
  deleteZimFile (fileName) {
    return new Promise(async (resolve, reject) => {
      try {
        const publicContainer = await this.getPublicContainer()
        const zimFolderName = await this.getMDataValueForKey(publicContainer, 'zim')
        const zimFolder = await this.getZimFolderMD(zimFolderName)
        await this._removeFromMData(zimFolder, fileName)
        resolve(true)
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Get _public container mutable data
   */
  getPublicContainer () {
    if (!this.app) {
      return Promise.reject(new Error('Application is not connected.'))
    }
    return this.app.auth.getContainer(CONSTANTS.ACCESS_CONTAINERS.PUBLIC)
  }

  getMDataValueForKey (md, key) {
    return new Promise(async (resolve, reject) => {
      try {
        const encKey = await md.encryptKey(key)
        const value = await md.get(encKey)
        const result = await md.decrypt(value.buf)
        resolve(result)
      } catch (err) {
        reject(err)
      }
    })
  }

  getZimFolderMD (xorName) {
    return this.app.mutableData.newPublic(xorName, CONSTANTS.TYPE_TAG.ZIM_FOLDER)
  }

  sha3Hash (name) {
    return this.app.crypto.sha3Hash(name)
  }

  _checkMDAccessible (md) {
    return new Promise(async (resolve, reject) => {
      try {
        const perm = await md.getPermissions()
        const signKey = await this.app.crypto.getAppPubSignKey()
        const result = await perm.getPermissionSet(signKey)
        resolve(result)
      } catch (err) {
        reject(err)
      }
    })
  }

  _updateMDataKey (md, key, value, ifEmpty) {
    return new Promise(async (resolve, reject) => {
      try {
        const entries = await md.getEntries()
        const val = await entries.get(key)
        if (ifEmpty && val.buf.length !== 0) {
          return reject(makeError(CONSTANTS.APP_ERR_CODE.ENTRY_VALUE_NOT_EMPTY, 'Entry value is not empty'))
        }
        const mut = await entries.mutate()
        await mut.update(key, value, val.version + 1)
        await md.applyEntriesMutation(mut)
        resolve(true)
      } catch (err) {
        reject(err)
      }
    })
  }

  _removeFromMData (md, key) {
    return new Promise(async (resolve, reject) => {
      try {
        const entries = await md.getEntries()
        const value = await entries.get(key)
        const mut = await entries.mutate()
        await mut.remove(key, value.version + 1)
        await md.applyEntriesMutation(mut)
        resolve(true)
      } catch (err) {
        reject(err)
      }
    })
  }

  _insertToMData (md, key, val, toEncrypt) {
    let keyToInsert = key
    let valToInsert = val

    return new Promise(async (resolve, reject) => {
      try {
        const entries = await md.getEntries()
        const mut = await entries.mutate()
        if (toEncrypt) {
          keyToInsert = await md.encryptKey(key)
          valToInsert = await md.encryptValue(val)
        }
        await mut.insert(keyToInsert, valToInsert)
        await md.applyEntriesMutation(mut)
        resolve(true)
      } catch (err) {
        reject(err)
      }
    })
  }
}

const safeApi = new SafeApi()
export default safeApi
