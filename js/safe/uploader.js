/**
 * uploader.js : Used for uploading a ZIM file to the SAFE Network.
 *
 * In reality, this is just a generic file uploader. Within this application though it will/show just be used to upload
 * ZIM files to the network.
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

import fs from 'fs'

import CONSTANTS from '../constants'

export default class Uploader {
  localPath
  fileName
  safeApi

  /**
   * Constructor for a file loader instance.
   * @param api the current safeAPI the app is using
   * @param localPath the path to the file on the local machine
   * @param fileName the name to be assigned to the file within the NFS
   */
  constructor (api, localPath, fileName) {
    this.safeApi = api
    this.localPath = localPath
    this.fileName = fileName
    console.log('New uploader...' + localPath + ' ' + fileName)
  }

  upload () {
    console.log('Starting upload...')
    const fileStats = fs.statSync(this.localPath.toString())
    let chunkSize = CONSTANTS.UPLOAD_CHUNK_SIZE
    const fd = fs.openSync(this.localPath, 'r')
    let offset = 0
    let buffer = null
    const {size} = fileStats
    const writeFile = (file, remainingBytes) => (
      new Promise(async (resolve, reject) => {
        try {
          if (remainingBytes < chunkSize) {
            chunkSize = remainingBytes
          }
          buffer = Buffer.alloc(chunkSize)
          fs.readSync(fd, buffer, 0, chunkSize, offset)
          await file.write(buffer)
          offset += chunkSize
          remainingBytes -= chunkSize

          console.log('Offset: ' + offset)
          console.log('Remaining bytes: ' + remainingBytes)

          if (offset === size) {
            await file.close()
            return resolve(file)
          }
          await writeFile(file, remainingBytes)
          resolve()
        } catch (error) {
          reject(error)
        }
      })
    )

    return new Promise(async (resolve, reject) => {
      try {
        console.log('Getting public container...')
        const publicContainer = await this.safeApi.getPublicContainer()
        console.log('Getting MD value for key \'zim\'...')
        const zimFolderName = await this.safeApi.getMDataValueForKey(publicContainer, 'zim')
        console.log('zimFolderName: ' + zimFolderName.toString())
        console.log('Getting zim MD...')
        const zimFolder = await this.safeApi.getZimFolderMD(zimFolderName)
        console.log('Emulating as NFS...')
        const nfs = zimFolder.emulateAs('NFS')
        const file = await nfs.open()
        await writeFile(file, size)
        try {
          await nfs.insert(this.fileName, file)
        } catch (error) {
          if (error.code !== CONSTANTS.ERROR_CODE.ENTRY_EXISTS) {
            return resolve()
          }
          const fileXorName = await zimFolder.get(this.fileName)
          if (fileXorName.buf.length !== 0) {
            return reject(error)
          }
          await nfs.update(this.fileName, file, fileXorName.version + 1)
        }
        resolve()
      } catch (error) {
        console.log('Something went wrong...')
        console.log(error)
        reject(error)
      }
    })
  }
}