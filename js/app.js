/**
 * app.js : User Interface implementation
 * This file handles the interaction between the application and the user
 *
 * Copyright 2013-2014 Mossroy and contributors
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

import $ from 'jquery'
import zimArchiveLoader from './lib/zimArchiveLoader'
import util from './lib/util'
import uiUtil from './lib/uiUtil'
import cookies from './lib/cookies'
import abstractFilesystemAccess from './lib/abstractFilesystemAccess'
import q from 'q'
import safeApi from './safe/api'
import { ipcRenderer as ipc } from 'electron'

/**
 * Maximum number of articles to display in a search
 * @type Integer
 */
var MAX_SEARCH_RESULT_SIZE = 50

/**
 * @type ZIMArchive
 */
var selectedArchive = null

/**
 * Resize the IFrame height, so that it fills the whole available height in the window
 */
function resizeIFrame () {
  var height = $(window).outerHeight()
    - $('#top').outerHeight(true)
    - $('#articleListWithHeader').outerHeight(true)
    // TODO : this 5 should be dynamically computed, and not hard-coded
    - 5
  $('.articleIFrame').css('height', height + 'px')
}

$(document).ready(resizeIFrame)
$(window).resize(resizeIFrame)

// Define behavior of HTML elements
$('#searchArticles').on('click', function (e) {
  pushBrowserHistoryState(null, $('#prefix').val())
  searchDirEntriesFromPrefix($('#prefix').val())
  $('#welcomeText').hide()
  $('#readingArticle').hide()
  $('#articleContent').hide()
  if ($('#navbarToggle').is(':visible') && $('#liHomeNav').is(':visible')) {
    $('#navbarToggle').click()
  }
})
$('#formArticleSearch').on('submit', function (e) {
  document.getElementById('searchArticles').click()
  return false
})
$('#prefix').on('keyup', function (e) {
  if (selectedArchive !== null && selectedArchive.isReady()) {
    onKeyUpPrefix(e)
  }
})
$('#btnRandomArticle').on('click', function (e) {
  $('#prefix').val('')
  goToRandomArticle()
  $('#welcomeText').hide()
  $('#articleList').hide()
  $('#articleListHeaderMessage').hide()
  $('#readingArticle').hide()
  $('#searchingForArticles').hide()
  if ($('#navbarToggle').is(':visible') && $('#liHomeNav').is(':visible')) {
    $('#navbarToggle').click()
  }
})

$('#btnRescanDeviceStorage').on('click', function (e) {
  searchForArchivesInStorage()
})
// Bottom bar :
$('#btnBack').on('click', function (e) {
  history.back()
  return false
})
$('#btnForward').on('click', function (e) {
  history.forward()
  return false
})
$('#btnHomeBottom').on('click', function (e) {
  $('#btnHome').click()
  return false
})
$('#btnTop').on('click', function (e) {
  $('#articleContent').contents().scrollTop(0)
  // We return true, so that the link to #top is still triggered (useful in the About section)
  return true
})
// Top menu :
$('#btnHome').on('click', function (e) {
  // Highlight the selected section in the navbar
  $('#liHomeNav').attr('class', 'active')
  $('#liConfigureNav').attr('class', '')
  $('#liAboutNav').attr('class', '')
  if ($('#navbarToggle').is(':visible') && $('#liHomeNav').is(':visible')) {
    $('#navbarToggle').click()
  }
  // Show the selected content in the page
  $('#about').hide()
  $('#configuration').hide()
  $('#formArticleSearch').show()
  $('#welcomeText').show()
  $('#articleList').show()
  $('#articleListHeaderMessage').show()
  $('#articleContent').show()
  // Give the focus to the search field, and clean up the page contents
  $('#prefix').val('')
  $('#prefix').focus()
  $('#articleList').empty()
  $('#articleListHeaderMessage').empty()
  $('#readingArticle').hide()
  $('#articleContent').hide()
  $('#articleContent').contents().empty()
  $('#searchingForArticles').hide()
  if (selectedArchive !== null && selectedArchive.isReady()) {
    $('#welcomeText').hide()
    goToMainArticle()
  }
  return false
})
$('#btnConfigure').on('click', function (e) {
  // Highlight the selected section in the navbar
  $('#liHomeNav').attr('class', '')
  $('#liConfigureNav').attr('class', 'active')
  $('#liAboutNav').attr('class', '')
  if ($('#navbarToggle').is(':visible') && $('#liHomeNav').is(':visible')) {
    $('#navbarToggle').click()
  }
  // Show the selected content in the page
  $('#about').hide()
  $('#configuration').show()
  $('#formArticleSearch').hide()
  $('#welcomeText').hide()
  $('#articleList').hide()
  $('#articleListHeaderMessage').hide()
  $('#readingArticle').hide()
  $('#articleContent').hide()
  $('#articleContent').hide()
  $('#searchingForArticles').hide()
  refreshAPIStatus()
  return false
})
$('#btnAbout').on('click', function (e) {
  // Highlight the selected section in the navbar
  $('#liHomeNav').attr('class', '')
  $('#liConfigureNav').attr('class', '')
  $('#liAboutNav').attr('class', 'active')
  if ($('#navbarToggle').is(':visible') && $('#liHomeNav').is(':visible')) {
    $('#navbarToggle').click()
  }
  // Show the selected content in the page
  $('#about').show()
  $('#configuration').hide()
  $('#formArticleSearch').hide()
  $('#welcomeText').hide()
  $('#articleList').hide()
  $('#articleListHeaderMessage').hide()
  $('#readingArticle').hide()
  $('#articleContent').hide()
  $('#articleContent').hide()
  $('#searchingForArticles').hide()
  return false
})
$('input:radio[name=contentInjectionMode]').on('change', function (e) {
  if (checkWarnServiceWorkerMode(this.value)) {
    // Do the necessary to enable or disable the Service Worker
    setContentInjectionMode(this.value)
  }
  else {
    setContentInjectionMode('jquery')
  }

})

/**
 * Displays of refreshes the API status shown to the user
 */
function refreshAPIStatus () {
  if (isMessageChannelAvailable()) {
    $('#messageChannelStatus').html('MessageChannel API available')
    $('#messageChannelStatus').removeClass('apiAvailable apiUnavailable')
      .addClass('apiAvailable')
  } else {
    $('#messageChannelStatus').html('MessageChannel API unavailable')
    $('#messageChannelStatus').removeClass('apiAvailable apiUnavailable')
      .addClass('apiUnavailable')
  }
  if (isServiceWorkerAvailable()) {
    if (isServiceWorkerReady()) {
      $('#serviceWorkerStatus').html('ServiceWorker API available, and registered')
      $('#serviceWorkerStatus').removeClass('apiAvailable apiUnavailable')
        .addClass('apiAvailable')
    } else {
      $('#serviceWorkerStatus').html('ServiceWorker API available, but not registered')
      $('#serviceWorkerStatus').removeClass('apiAvailable apiUnavailable')
        .addClass('apiUnavailable')
    }
  } else {
    $('#serviceWorkerStatus').html('ServiceWorker API unavailable')
    $('#serviceWorkerStatus').removeClass('apiAvailable apiUnavailable')
      .addClass('apiUnavailable')
  }
}

var contentInjectionMode

/**
 * Sets the given injection mode.
 * This involves registering (or re-enabling) the Service Worker if necessary
 * It also refreshes the API status for the user afterwards.
 *
 * @param {String} value The chosen content injection mode : 'jquery' or 'serviceworker'
 */
function setContentInjectionMode (value) {
  if (value === 'jquery') {
    if (isServiceWorkerReady()) {
      // We need to disable the ServiceWorker
      // Unregistering it does not seem to work as expected : the ServiceWorker
      // is indeed unregistered but still active...
      // So we have to disable it manually (even if it's still registered and active)
      navigator.serviceWorker.controller.postMessage({'action': 'disable'})
      messageChannel = null
    }
    refreshAPIStatus()
  } else if (value === 'serviceworker') {
    if (!isServiceWorkerAvailable()) {
      alert('The ServiceWorker API is not available on your device. Falling back to JQuery mode')
      setContentInjectionMode('jquery')
      return
    }
    if (!isMessageChannelAvailable()) {
      alert('The MessageChannel API is not available on your device. Falling back to JQuery mode')
      setContentInjectionMode('jquery')
      return
    }

    if (!messageChannel) {
      // Let's create the messageChannel for the 2-way communication
      // with the Service Worker
      messageChannel = new MessageChannel()
      messageChannel.port1.onmessage = handleMessageChannelMessage
    }

    if (!isServiceWorkerReady()) {
      $('#serviceWorkerStatus').html('ServiceWorker API available : trying to register it...')
      navigator.serviceWorker.register('../service-worker.js').then(function (reg) {
        console.log('serviceWorker registered', reg)
        serviceWorkerRegistration = reg
        refreshAPIStatus()

        // We need to wait for the ServiceWorker to be activated
        // before sending the first init message
        var serviceWorker = reg.installing || reg.waiting || reg.active
        serviceWorker.addEventListener('statechange', function (statechangeevent) {
          if (statechangeevent.target.state === 'activated') {
            console.log('try to post an init message to ServiceWorker')
            navigator.serviceWorker.controller.postMessage({'action': 'init'}, [messageChannel.port2])
            console.log('init message sent to ServiceWorker')
          }
        })
      }, function (err) {
        console.error('error while registering serviceWorker', err)
        refreshAPIStatus()
      })
    } else {
      console.log('try to re-post an init message to ServiceWorker, to re-enable it in case it was disabled')
      navigator.serviceWorker.controller.postMessage({'action': 'init'}, [messageChannel.port2])
      console.log('init message sent to ServiceWorker')
    }
  }
  $('input:radio[name=contentInjectionMode]').prop('checked', false)
  $('input:radio[name=contentInjectionMode]').filter('[value="' + value + '"]').prop('checked', true)
  contentInjectionMode = value
  // Save the value in a cookie, so that to be able to keep it after a reload/restart
  cookies.setItem('lastContentInjectionMode', value, Infinity)
}

/**
 * If the ServiceWorker mode is selected, warn the user before activating it
 * @param chosenContentInjectionMode The mode that the user has chosen
 */
function checkWarnServiceWorkerMode (chosenContentInjectionMode) {
  if (chosenContentInjectionMode === 'serviceworker' && !cookies.hasItem('warnedServiceWorkerMode')) {
    // The user selected the "serviceworker" mode, which is still unstable
    // So let's display a warning to the user

    // If the focus is on the search field, we have to move it,
    // else the keyboard hides the message
    if ($('#prefix').is(':focus')) {
      $('searchArticles').focus()
    }
    if (confirm('The \'Service Worker\' mode is still UNSTABLE for now.'
        + ' It happens that the application needs to be reinstalled (or the ServiceWorker manually removed).'
        + ' Please confirm with OK that you\'re ready to face this kind of bugs, or click Cancel to stay in \'jQuery\' mode.')) {
      // We will not display this warning again for one day
      cookies.setItem('warnedServiceWorkerMode', true, 86400)
      return true
    }
    else {
      return false
    }
  }
  return true
}

// At launch, we try to set the last content injection mode (stored in a cookie)
var lastContentInjectionMode = cookies.getItem('lastContentInjectionMode')
if (lastContentInjectionMode) {
  setContentInjectionMode(lastContentInjectionMode)
}
else {
  setContentInjectionMode('jquery')
}

var serviceWorkerRegistration = null

/**
 * Tells if the ServiceWorker API is available
 * https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorker
 * @returns {Boolean}
 */
function isServiceWorkerAvailable () {
  return ('serviceWorker' in navigator)
}

/**
 * Tells if the MessageChannel API is available
 * https://developer.mozilla.org/en-US/docs/Web/API/MessageChannel
 * @returns {Boolean}
 */
function isMessageChannelAvailable () {
  try {
    var dummyMessageChannel = new MessageChannel()
    if (dummyMessageChannel) return true
  }
  catch (e) {
    return false
  }
  return false
}

/**
 * Tells if the ServiceWorker is registered, and ready to capture HTTP requests
 * and inject content in articles.
 * @returns {Boolean}
 */
function isServiceWorkerReady () {
  // Return true if the serviceWorkerRegistration is not null and not undefined
  return (serviceWorkerRegistration)
}

/**
 *
 * @type Array.<StorageFirefoxOS>
 */
var storages = []

function searchForArchivesInPreferencesOrStorage () {
  // First see if the list of archives is stored in the cookie
  var listOfArchivesFromCookie = cookies.getItem('listOfArchives')
  if (listOfArchivesFromCookie !== null && listOfArchivesFromCookie !== undefined && listOfArchivesFromCookie !== '') {
    var directories = listOfArchivesFromCookie.split('|')
    populateDropDownListOfArchives(directories)
  }
  else {
    searchForArchivesInStorage()
  }
}

function searchForArchivesInStorage () {
  // If DeviceStorage is available, we look for archives in it
  $('#btnConfigure').click()
  $('#scanningForArchives').show()
  zimArchiveLoader.scanForArchives(storages, populateDropDownListOfArchives)
}

if ($.isFunction(navigator.getDeviceStorages)) {
  // The method getDeviceStorages is available (FxOS>=1.1)
  storages = $.map(navigator.getDeviceStorages('sdcard'), function (s) {
    return new abstractFilesystemAccess.StorageFirefoxOS(s)
  })
}

if (storages !== null && storages.length > 0) {
  // Make a fake first access to device storage, in order to ask the user for confirmation if necessary.
  // This way, it is only done once at this moment, instead of being done several times in callbacks
  // After that, we can start looking for archives
  storages[0].get('fake-file-to-read').then(searchForArchivesInPreferencesOrStorage,
    searchForArchivesInPreferencesOrStorage)
}
else {
  // If DeviceStorage is not available, we display the file select components
  displayFileSelect()
  if (document.getElementById('archiveFiles').files && document.getElementById('archiveFiles').files.length > 0) {
    // Archive files are already selected,
    setLocalArchiveFromFileSelect()
  }
  else {
    $('#btnConfigure').click()
  }
}

// Display the article when the user goes back in the browser history
window.onpopstate = function (event) {
  if (event.state) {
    var title = event.state.title
    var titleSearch = event.state.titleSearch

    $('#prefix').val('')
    $('#welcomeText').hide()
    $('#readingArticle').hide()
    if ($('#navbarToggle').is(':visible') && $('#liHomeNav').is(':visible')) {
      $('#navbarToggle').click()
    }
    $('#searchingForArticles').hide()
    $('#configuration').hide()
    $('#articleList').hide()
    $('#articleListHeaderMessage').hide()
    $('#articleContent').contents().empty()

    if (title && !('' === title)) {
      goToArticle(title)
    }
    else if (titleSearch && !('' === titleSearch)) {
      $('#prefix').val(titleSearch)
      searchDirEntriesFromPrefix($('#prefix').val())
    }
  }
}

/**
 * Populate the drop-down list of archives with the given list
 * @param {Array.<String>} archiveDirectories
 */
function populateDropDownListOfArchives (archiveDirectories) {
  $('#scanningForArchives').hide()
  $('#chooseArchiveFromLocalStorage').show()
  var comboArchiveList = document.getElementById('archiveList')
  comboArchiveList.options.length = 0
  for (var i = 0; i < archiveDirectories.length; i++) {
    var archiveDirectory = archiveDirectories[i]
    if (archiveDirectory === '/') {
      alert('It looks like you have put some archive files at the root of your sdcard (or internal storage). Please move them in a subdirectory')
    }
    else {
      comboArchiveList.options[i] = new Option(archiveDirectory, archiveDirectory)
    }
  }
  // Store the list of archives in a cookie, to avoid rescanning at each start
  cookies.setItem('listOfArchives', archiveDirectories.join('|'), Infinity)

  $('#archiveList').on('change', setLocalArchiveFromArchiveList)
  if (comboArchiveList.options.length > 0) {
    var lastSelectedArchive = cookies.getItem('lastSelectedArchive')
    if (lastSelectedArchive !== null && lastSelectedArchive !== undefined && lastSelectedArchive !== '') {
      // Attempt to select the corresponding item in the list, if it exists
      if ($('#archiveList option[value=\'' + lastSelectedArchive + '\']').length > 0) {
        $('#archiveList').val(lastSelectedArchive)
      }
    }
    // Set the localArchive as the last selected (or the first one if it has never been selected)
    setLocalArchiveFromArchiveList()
  }
  else {
    alert('Welcome to Kiwix! This application needs at least a ZIM file in your SD-card (or internal storage). Please download one and put it on the device (see About section). Also check that your device is not connected to a computer through USB device storage (which often locks the SD-card content)')
    $('#btnAbout').click()
    var isAndroid = (navigator.userAgent.indexOf('Android') !== -1)
    if (isAndroid) {
      alert('You seem to be using an Android device. Be aware that there is a bug on Firefox, that prevents finding Wikipedia archives in a SD-card (at least on some devices. See about section). Please put the archive in the internal storage if the application can\'t find it.')
    }
  }
}

/**
 * Sets the localArchive from the selected archive in the drop-down list
 */
function setLocalArchiveFromArchiveList () {
  var archiveDirectory = $('#archiveList').val()
  if (archiveDirectory && archiveDirectory.length > 0) {
    // Now, try to find which DeviceStorage has been selected by the user
    // It is the prefix of the archive directory
    var regexpStorageName = /^\/([^\/]+)\//
    var regexpResults = regexpStorageName.exec(archiveDirectory)
    var selectedStorage = null
    if (regexpResults && regexpResults.length > 0) {
      var selectedStorageName = regexpResults[1]
      for (var i = 0; i < storages.length; i++) {
        var storage = storages[i]
        if (selectedStorageName === storage.storageName) {
          // We found the selected storage
          selectedStorage = storage
        }
      }
      if (selectedStorage === null) {
        alert('Unable to find which device storage corresponds to directory ' + archiveDirectory)
      }
    }
    else {
      // This happens when the archiveDirectory is not prefixed by the name of the storage
      // (in the Simulator, or with FxOs 1.0, or probably on devices that only have one device storage)
      // In this case, we use the first storage of the list (there should be only one)
      if (storages.length === 1) {
        selectedStorage = storages[0]
      }
      else {
        alert('Something weird happened with the DeviceStorage API : found a directory without prefix : '
          + archiveDirectory + ', but there were ' + storages.length
          + ' storages found with getDeviceStorages instead of 1')
      }
    }
    resetCssCache()
    selectedArchive = zimArchiveLoader.loadArchiveFromDeviceStorage(selectedStorage, archiveDirectory, function (archive) {
      cookies.setItem('lastSelectedArchive', archiveDirectory, Infinity)
      // The archive is set : go back to home page to start searching
      $('#btnHome').click()
    })

  }
}

/**
 * Resets the CSS Cache (used only in jQuery mode)
 */
function resetCssCache () {
  // Reset the cssCache. Must be done when archive changes.
  if (cssCache) {
    cssCache = new Map()
  }
}

function displaySafeNetwork () {
  $('#safeNetworkConfiguration').show()
  $('#connectToSafe').on('click', function () {
    safeApi.requestAuth()
    $('#safeNetworkActivity').show()
  })
}

/**
 * Displays the zone to select files from the archive
 */
function displayFileSelect () {
  $('#openLocalFiles').show()
  $('#archiveFiles').on('change', setLocalArchiveFromFileSelect)
}

function setLocalArchiveFromFileList (files) {
  resetCssCache()
  selectedArchive = zimArchiveLoader.loadArchiveFromFiles(files, function (archive) {
    // The archive is set : go back to home page to start searching
    $('#btnHome').click()
  })
}

/**
 * Sets the localArchive from the File selects populated by user
 */
function setLocalArchiveFromFileSelect () {
  setLocalArchiveFromFileList(document.getElementById('archiveFiles').files)
}

function setFileOnSafeNetwork (zimFolderName, filename) {
  resetCssCache()
  selectedArchive = zimArchiveLoader.loadArchiveFromSafeNetwork(zimFolderName, filename, function (archive) {
    $('#btnHome').click()
  })
}

/**
 * Reads a remote archive with given URL, and returns the response in a Promise.
 * This function is used by setRemoteArchives below, for UI tests
 *
 * @param url The URL of the archive to read
 * @returns {Promise}
 */
function readRemoteArchive (url) {
  var deferred = q.defer()
  var request = new XMLHttpRequest()
  request.open('GET', url, true)
  request.responseType = 'blob'
  request.onreadystatechange = function () {
    if (request.readyState === XMLHttpRequest.DONE) {
      if ((request.status >= 200 && request.status < 300) || request.status === 0) {
        // Hack to make this look similar to a file
        request.response.name = url
        deferred.resolve(request.response)
      }
      else {
        deferred.reject('HTTP status ' + request.status + ' when reading ' + url)
      }
    }
  }
  request.onabort = function (e) {
    deferred.reject(e)
  }
  request.send(null)
  return deferred.promise
}

/**
 * This is used in the testing interface to inject remote archives
 */
window.setRemoteArchives = function () {
  var readRequests = []
  var i
  for (i = 0; i < arguments.length; i++) {
    readRequests[i] = readRemoteArchive(arguments[i])
  }
  return q.all(readRequests).then(function (arrayOfArchives) {
    setLocalArchiveFromFileList(arrayOfArchives)
  })
}

/**
 * Handle key input in the prefix input zone
 * @param {Event} evt
 */
function onKeyUpPrefix (evt) {
  // Use a timeout, so that very quick typing does not cause a lot of overhead
  // It is also necessary for the words suggestions to work inside Firefox OS
  if (window.timeoutKeyUpPrefix) {
    window.clearTimeout(window.timeoutKeyUpPrefix)
  }
  window.timeoutKeyUpPrefix = window.setTimeout(function () {
      var prefix = $('#prefix').val()
      if (prefix && prefix.length > 0) {
        $('#searchArticles').click()
      }
    }
    , 500)
}

/**
 * Search the index for DirEntries with title that start with the given prefix (implemented
 * with a binary search inside the index file)
 * @param {String} prefix
 */
function searchDirEntriesFromPrefix (prefix) {
  $('#searchingForArticles').show()
  $('#configuration').hide()
  $('#articleContent').contents().empty()
  if (selectedArchive !== null && selectedArchive.isReady()) {
    selectedArchive.findDirEntriesWithPrefix(prefix.trim(), MAX_SEARCH_RESULT_SIZE, populateListOfArticles)
  } else {
    $('#searchingForArticles').hide()
    // We have to remove the focus from the search field,
    // so that the keyboard does not stay above the message
    $('#searchArticles').focus()
    alert('Archive not set : please select an archive')
    $('#btnConfigure').click()
  }
}

/**
 * Display the list of articles with the given array of DirEntry
 * @param {Array.<DirEntry>} dirEntryArray
 * @param {Integer} maxArticles
 */
function populateListOfArticles (dirEntryArray, maxArticles) {
  var articleListHeaderMessageDiv = $('#articleListHeaderMessage')
  var nbDirEntry = 0
  if (dirEntryArray) {
    nbDirEntry = dirEntryArray.length
  }

  var message
  if (maxArticles >= 0 && nbDirEntry >= maxArticles) {
    message = maxArticles + ' first articles below (refine your search).'
  }
  else {
    message = nbDirEntry + ' articles found.'
  }
  if (nbDirEntry === 0) {
    message = 'No articles found.'
  }

  articleListHeaderMessageDiv.html(message)

  var articleListDiv = $('#articleList')
  var articleListDivHtml = ''
  for (var i = 0; i < dirEntryArray.length; i++) {
    var dirEntry = dirEntryArray[i]

    articleListDivHtml += '<a href=\'#\' dirEntryId=\'' + dirEntry.toStringId().replace(/'/g, '&apos;')
      + '\' class=\'list-group-item\'>' + dirEntry.title + '</a>'
  }
  articleListDiv.html(articleListDivHtml)
  $('#articleList a').on('click', handleTitleClick)
  $('#searchingForArticles').hide()
  $('#articleList').show()
  $('#articleListHeaderMessage').show()
}

/**
 * Handles the click on the title of an article in search results
 * @param {Event} event
 * @returns {Boolean}
 */
function handleTitleClick (event) {
  var dirEntryId = event.target.getAttribute('dirEntryId')
  $('#articleList').empty()
  $('#articleListHeaderMessage').empty()
  $('#prefix').val('')
  findDirEntryFromDirEntryIdAndLaunchArticleRead(dirEntryId)
  var dirEntry = selectedArchive.parseDirEntryId(dirEntryId)
  pushBrowserHistoryState(dirEntry.namespace + '/' + dirEntry.url)
  return false
}

/**
 * Creates an instance of DirEntry from given dirEntryId (including resolving redirects),
 * and call the function to read the corresponding article
 * @param {String} dirEntryId
 */
function findDirEntryFromDirEntryIdAndLaunchArticleRead (dirEntryId) {
  if (selectedArchive.isReady()) {
    var dirEntry = selectedArchive.parseDirEntryId(dirEntryId)
    $('#articleName').html(dirEntry.title)
    $('#readingArticle').show()
    $('#articleContent').contents().html('')
    if (dirEntry.isRedirect()) {
      selectedArchive.resolveRedirect(dirEntry, readArticle)
    }
    else {
      readArticle(dirEntry)
    }
  }
  else {
    alert('Data files not set')
  }
}

/**
 * Read the article corresponding to the given dirEntry
 * @param {DirEntry} dirEntry
 */
function readArticle (dirEntry) {
  if (dirEntry.isRedirect()) {
    selectedArchive.resolveRedirect(dirEntry, readArticle)
  }
  else {
    selectedArchive.readArticle(dirEntry, displayArticleInForm)
  }
}

var messageChannel

/**
 * Function that handles a message of the messageChannel.
 * It tries to read the content in the backend, and sends it back to the ServiceWorker
 * @param {Event} event
 */
function handleMessageChannelMessage (event) {
  if (event.data.error) {
    console.error('Error in MessageChannel', event.data.error)
    reject(event.data.error)
  } else {
    console.log('the ServiceWorker sent a message on port1', event.data)
    if (event.data.action === 'askForContent') {
      console.log('we are asked for a content : let\'s try to answer to this message')
      var title = event.data.title
      var messagePort = event.ports[0]
      var readFile = function (dirEntry) {
        if (dirEntry === null) {
          console.error('Title ' + title + ' not found in archive.')
          messagePort.postMessage({'action': 'giveContent', 'title': title, 'content': ''})
        } else if (dirEntry.isRedirect()) {
          selectedArchive.resolveRedirect(dirEntry, readFile)
        } else {
          console.log('Reading binary file...')
          selectedArchive.readBinaryFile(dirEntry, function (fileDirEntry, content) {
            messagePort.postMessage({'action': 'giveContent', 'title': title, 'content': content})
            console.log('content sent to ServiceWorker')
          })
        }
      }
      selectedArchive.getDirEntryByTitle(title).then(readFile).catch(function () {
        messagePort.postMessage({'action': 'giveContent', 'title': title, 'content': new UInt8Array()})
      })
    }
    else {
      console.error('Invalid message received', event.data)
    }
  }
}

// Compile some regular expressions needed to modify links
// Pattern to find the path in a url
var regexpPath = /^(.*\/)[^\/]+$/
// Pattern to find a ZIM URL (with its namespace) - see http://www.openzim.org/wiki/ZIM_file_format#Namespaces
var regexpZIMUrlWithNamespace = /(?:^|\/)([-ABIJMUVWX]\/.+)/
// Pattern to match a local anchor in a href
var regexpLocalAnchorHref = /^#/
// These regular expressions match both relative and absolute URLs
// Since late 2014, all ZIM files should use relative URLs
var regexpImageUrl = /^(?:\.\.\/|\/)+(I\/.*)$/
var regexpMetadataUrl = /^(?:\.\.\/|\/)+(-\/.*)$/

// Cache for CSS styles contained in ZIM.
// It significantly speeds up subsequent page display. See kiwix-js issue #335
var cssCache = new Map()

/**
 * Display the the given HTML article in the web page,
 * and convert links to javascript calls
 * NB : in some error cases, the given title can be null, and the htmlArticle contains the error message
 * @param {DirEntry} dirEntry
 * @param {String} htmlArticle
 */
function displayArticleInForm (dirEntry, htmlArticle) {
  $('#readingArticle').hide()
  $('#articleContent').show()
  // Scroll the iframe to its top
  $('#articleContent').contents().scrollTop(0)

  if (contentInjectionMode === 'jquery') {
    // Fast-replace img src with data-kiwixsrc [kiwix-js #272]
    htmlArticle = htmlArticle.replace(/(<img\s+[^>]*\b)src(\s*=)/ig, '$1data-kiwixsrc$2')
  }
  // Display the article inside the web page.
  $('#articleContent').contents().find('body').html(htmlArticle)

  // If the ServiceWorker is not useable, we need to fallback to parse the DOM
  // to inject math images, and replace some links with javascript calls
  if (contentInjectionMode === 'jquery') {

    // Compute base URL
    var urlPath = regexpPath.test(dirEntry.url) ? urlPath = dirEntry.url.match(regexpPath)[1] : ''
    var baseUrl = dirEntry.namespace + '/' + urlPath
    // Create (or replace) the "base" tag with our base URL
    $('#articleContent').contents().find('head').find('base').detach()
    $('#articleContent').contents().find('head').append('<base href=\'' + baseUrl + '\'>')

    var currentProtocol = location.protocol
    var currentHost = location.host

    // Convert links into javascript calls
    $('#articleContent').contents().find('body').find('a').each(function () {
      var href = $(this).attr('href')
      // Compute current link's url (with its namespace), if applicable
      var zimUrl = regexpZIMUrlWithNamespace.test(this.href) ? this.href.match(regexpZIMUrlWithNamespace)[1] : ''
      if (href === null || href === undefined) {
        // No href attribute
      }
      else if (href.length === 0) {
        // It's a link with an empty href, pointing to the current page.
        // Because of the base tag, we need to modify it
        $(this).on('click', function (e) {
          return false
        })
      }
      else if (regexpLocalAnchorHref.test(href)) {
        // It's an anchor link : we need to make it work with javascript
        // because of the base tag
        $(this).on('click', function (e) {
          $('#articleContent').first()[0].contentWindow.location.hash = href
          return false
        })
      }
      else if (this.protocol !== currentProtocol
        || this.host !== currentHost) {
        // It's an external URL : we should open it in a new tab
        $(this).attr('target', '_blank')
      }
      else {
        // It's a link to another article
        // Add an onclick event to go to this article
        // instead of following the link
        $(this).on('click', function (e) {
          var decodedURL = decodeURIComponent(zimUrl)
          pushBrowserHistoryState(decodedURL)
          goToArticle(decodedURL)
          return false
        })
      }
    })

    // Load images
    $('#articleContent').contents().find('body').find('img').each(function () {
      var image = $(this)
      // It's a standard image contained in the ZIM file
      // We try to find its name (from an absolute or relative URL)
      var imageMatch = image.attr('data-kiwixsrc').match(regexpImageUrl) //kiwix-js #272
      if (imageMatch) {
        var title = decodeURIComponent(imageMatch[1])
        selectedArchive.getDirEntryByTitle(title).then(function (dirEntry) {
          selectedArchive.readBinaryFile(dirEntry, function (fileDirEntry, content) {
            // TODO : use the complete MIME-type of the image (as read from the ZIM file)
            uiUtil.feedNodeWithBlob(image, 'src', content, 'image')
          })
        }).catch(function (e) {
          console.error('could not find DirEntry for image:' + title, e)
        })
      }
    })

    // Load CSS content
    $('#articleContent').contents().find('link[rel=stylesheet]').each(function () {
      var link = $(this)
      // We try to find its name (from an absolute or relative URL)
      var hrefMatch = link.attr('href').match(regexpMetadataUrl)
      if (hrefMatch) {
        // It's a CSS file contained in the ZIM file
        var title = uiUtil.removeUrlParameters(decodeURIComponent(hrefMatch[1]))
        if (cssCache && cssCache.has(title)) {
          var cssContent = cssCache.get(title)
          uiUtil.replaceCSSLinkWithInlineCSS(link, cssContent)
        } else {
          selectedArchive.getDirEntryByTitle(title)
            .then(function (dirEntry) {
              return selectedArchive.readBinaryFile(dirEntry,
                function (fileDirEntry, content) {
                  var fullUrl = fileDirEntry.namespace + '/' + fileDirEntry.url
                  var contentString = util.uintToString(content)
                  if (cssCache) cssCache.set(fullUrl, contentString)
                  uiUtil.replaceCSSLinkWithInlineCSS(link, contentString)
                })
            }).catch(function (e) {
            console.error('could not find DirEntry for CSS : ' + title, e)
          })
        }
      }
    })

    // Load Javascript content
    $('#articleContent').contents().find('script').each(function () {
      var script = $(this)
      // We try to find its name (from an absolute or relative URL)
      var srcMatch = script.attr('src').match(regexpMetadataUrl)
      // TODO check that the type of the script is text/javascript or application/javascript
      if (srcMatch) {
        // It's a Javascript file contained in the ZIM file
        var title = uiUtil.removeUrlParameters(decodeURIComponent(srcMatch[1]))
        selectedArchive.getDirEntryByTitle(title).then(function (dirEntry) {
          if (dirEntry === null)
            console.log('Error: js file not found: ' + title)
          else
            selectedArchive.readBinaryFile(dirEntry, function (fileDirEntry, content) {
              // TODO : I have to disable javascript for now
              // var jsContent = encodeURIComponent(util.uintToString(content));
              //script.attr("src", 'data:text/javascript;charset=UTF-8,' + jsContent);
            })
        }).catch(function (e) {
          console.error('could not find DirEntry for javascript : ' + title, e)
        })
      }
    })

  }
}

/**
 * Changes the URL of the browser page, so that the user might go back to it
 *
 * @param {String} title
 * @param {String} titleSearch
 */
function pushBrowserHistoryState (title, titleSearch) {
  var stateObj = {}
  var urlParameters
  var stateLabel
  if (title && !('' === title)) {
    stateObj.title = title
    urlParameters = '?title=' + title
    stateLabel = 'Wikipedia Article : ' + title
  }
  else if (titleSearch && !('' === titleSearch)) {
    stateObj.titleSearch = titleSearch
    urlParameters = '?titleSearch=' + titleSearch
    stateLabel = 'Wikipedia search : ' + titleSearch
  }
  else {
    return
  }
  window.history.pushState(stateObj, stateLabel, urlParameters)
}

/**
 * Replace article content with the one of the given title
 * @param {String} title
 */
function goToArticle (title) {
  selectedArchive.getDirEntryByTitle(title).then(function (dirEntry) {
    if (dirEntry === null || dirEntry === undefined) {
      $('#readingArticle').hide()
      alert('Article with title ' + title + ' not found in the archive')
    }
    else {
      $('#articleName').html(title)
      $('#readingArticle').show()
      $('#articleContent').contents().find('body').html('')
      readArticle(dirEntry)
    }
  }).catch(function () { alert('Error reading article with title ' + title) })
}

function goToRandomArticle () {
  selectedArchive.getRandomDirEntry(function (dirEntry) {
    if (dirEntry === null || dirEntry === undefined) {
      alert('Error finding random article.')
    }
    else {
      if (dirEntry.namespace === 'A') {
        $('#articleName').html(dirEntry.title)
        pushBrowserHistoryState(dirEntry.namespace + '/' + dirEntry.url)
        $('#readingArticle').show()
        $('#articleContent').contents().find('body').html('')
        readArticle(dirEntry)
      }
      else {
        // If the random title search did not end up on an article,
        // we try again, until we find one
        goToRandomArticle()
      }
    }
  })
}

function goToMainArticle () {
  selectedArchive.getMainPageDirEntry(function (dirEntry) {
    if (dirEntry === null || dirEntry === undefined) {
      console.error('Error finding main article.')
      $('#welcomeText').show()
    }
    else {
      if (dirEntry.namespace === 'A') {
        $('#articleName').html(dirEntry.title)
        pushBrowserHistoryState(dirEntry.namespace + '/' + dirEntry.url)
        $('#readingArticle').show()
        $('#articleContent').contents().find('body').html('')
        readArticle(dirEntry)
      }
      else {
        console.error('The main page of this archive does not seem to be an article')
        $('#welcomeText').show()
      }
    }
  })
}

function showZimFileUploader () {
  $('#zimFileUploader').show()
  $('#zimFileUploader').on('submit', function (event) {
    event.preventDefault()

    const fileName = $('#fileName').val()
    const filePath = $('#zimFile')[0].files[0].path
    safeApi.fileUpload(filePath, fileName)

  })
}

function showZimFolderCreator () {
  safeApi.hasZimFolder().then((result) => {
    if (result) {
      $('#zimFolderCreation').hide()
      $('#zimFolderNotExists').hide()
      $('#zimFolderExists').show()
      showZimFileUploader()
      showZimFileDeletion()
    } else {
      $('#zimFolderCreation').show()
      $('#createZimFolder').on('submit', function (event) {
        event.preventDefault()

        const zimFolderName = $('#publicName').val().trim()
        const zimFolderDescription = $('#description').val().trim()

        safeApi.createZimFolder(zimFolderName, zimFolderDescription).then(() => {
            showZimFolderCreator()
          }
        )
      })
    }
  })
}

function showZimFileSelector () {
  $('#zimFileSelector').show()
  $('#openSafeZimFile').on('submit', function (event) {
    event.preventDefault()
    const zimFolderName = $('#nfsName').val().trim()
    const zimFileName = $('#nfsFileName').val().trim()

    setFileOnSafeNetwork(zimFolderName, zimFileName)
  })
}

function showZimFileDeletion () {
  $('#zimFileDeletion').show()
  $('#zimFileDelete').on('submit', function (event) {
    event.preventDefault()
    $('#safeNetworkActivity').show()
    $('#zimFileDeletion').hide()

    const zimFileName = $('#fileNameForDelete').val().trim()
    safeApi.deleteZimFile(zimFileName).then(() => {
      $('#safeNetworkActivity').hide()
      $('#zimFileDeletion').show()
      alert(zimFileName + ' was successfully deleted.')
    })
  })
}

$('#safeNetworkConfigToggle').on('click', () => {
  displaySafeNetwork()
  $('#openLocalFiles').hide()
})

$('#defaultConfigToggle').on('click', () => {
  displayFileSelect()
  $('#safeNetworkConfiguration').hide()
})

ipc.on('auth-response', async (event, response) => {
  await safeApi.connect(response)
  $('#safeNetworkActivity').hide()
  console.log('Connected.')
  safeApi.canAccessContainers().then(() => {
    console.log('Could access containers!')
  })
  showZimFileSelector()
  showZimFolderCreator()
  $('#safeNetworkSuccess').show()
  $('#safeNetworkFailure').hide()
})