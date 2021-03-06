/**
 * zimArchiveLoader.js: Functions to search and read ZIM archives.
 *
 * Copyright 2015 Mossroy and contributors
 * Copyright 2017-2018 David Brown <david_a_brown@mac.com>
 *
 * SAFE Wiki is a fork of the Kiwix JS project.
 * Kiwix JS is available here: <https://github.com/kiwix/kiwix-js>
 * All changes can be viewed here: <https://github.com/DaBrown95/safe-wiki>
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

import zimArchive from './zimArchive'
import jQuery from 'jquery'

/**
 * Create a ZIMArchive from DeviceStorage location
 * @param {DeviceStorage} storage
 * @param {String} path
 * @param {callbackZIMArchive} callback
 * @returns {ZIMArchive}
 */
function loadArchiveFromDeviceStorage (storage, path, callback) {
  return new zimArchive.ZIMArchive(storage, path, callback, false)
}

/**
 * Create a ZIMArchive from Files
 * @param {Array.<File>} files
 * @param {callbackZIMArchive} callback
 * @returns {ZIMArchive}
 */
function loadArchiveFromFiles (files, callback) {
  if (files.length >= 1) {
    return new zimArchive.ZIMArchive(files, null, callback, false)
  }
}

/**
 * Create a ZIMArchive from the SAFE Network
 * @param zimFolderName the un-hashed name of the target 'zim folder' MD
 * @param fileName the name of the zim file the user wants to access
 * @param callback
 * @returns {ZIMArchive}
 */
function loadArchiveFromSafeNetwork (zimFolderName, fileName, callback) {
  return new zimArchive.ZIMArchive(zimFolderName, fileName, callback, true)
}

/**
 * @callback callbackPathList
 * @param {Array.<String>} directoryList List of directories
 */

/**
 *  Scans the DeviceStorage for archives
 *
 * @param {Array.<DeviceStorage>} storages List of DeviceStorage instances
 * @param {callbackPathList} callbackFunction Function to call with the list of directories where archives are found
 */
function scanForArchives (storages, callbackFunction) {
  var directories = []
  var promises = jQuery.map(storages, function (storage) {
    return storage.scanForArchives()
      .then(function (dirs) {
        jQuery.merge(directories, dirs)
        return true
      })
  })
  jQuery.when.apply(null, promises).then(function () {
    callbackFunction(directories)
  }, function (error) {
    alert('Error scanning your SD card : ' + error
      + '. If you\'re using the Firefox OS Simulator, please put the archives in '
      + 'a \'fake-sdcard\' directory inside your Firefox profile '
      + '(ex : ~/.mozilla/firefox/xxxx.default/extensions/fxos_2_x_simulator@mozilla.org/'
      + 'profile/fake-sdcard/wikipedia_en_ray_charles_2015-06.zim)')
    callbackFunction(null)
  })
}

/**
 * Functions and classes exposed by this module
 */
export default {
  loadArchiveFromDeviceStorage: loadArchiveFromDeviceStorage,
  loadArchiveFromFiles: loadArchiveFromFiles,
  loadArchiveFromSafeNetwork: loadArchiveFromSafeNetwork,
  scanForArchives: scanForArchives
}
