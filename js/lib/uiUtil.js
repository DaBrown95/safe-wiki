/**
 * uiUtil.js : Utility functions for the User Interface
 *
 * Copyright 2013-2014 Mossroy and contributors
 * Copyright 2017 David Brown <david_a_brown@mac.com>
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

/**
 * Creates a Blob from the given content, then a URL from this Blob
 * And put this URL in the attribute of the DOM node
 *
 * This is useful to inject images (and other dependencies) inside an article
 *
 * @param {Object} jQueryNode
 * @param {String} nodeAttribute
 * @param {Uint8Array} content
 * @param {String} mimeType
 */
function feedNodeWithBlob (jQueryNode, nodeAttribute, content, mimeType) {
  var blob = new Blob([content], {type: mimeType})
  var url = URL.createObjectURL(blob)
  jQueryNode.on('load', function () {
    URL.revokeObjectURL(url)
  })
  jQueryNode.attr(nodeAttribute, url)
}

var regexpRemoveUrlParameters = new RegExp(/([^\?]+)\?.*$/)

function removeUrlParameters (url) {
  if (regexpRemoveUrlParameters.test(url)) {
    return regexpRemoveUrlParameters.exec(url)[1]
  } else {
    return url
  }
}

/**
 * Functions and classes exposed by this module
 */
export default {
  feedNodeWithBlob: feedNodeWithBlob,
  removeUrlParameters: removeUrlParameters
}
