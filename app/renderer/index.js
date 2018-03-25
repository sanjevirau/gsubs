// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const CheckSubtitle = require('../renderer/checksub.js');
const remote = require('electron').remote;
const dialog = require('electron').remote.dialog; 
const Store = require('electron-store');
const OS = require('opensubtitles-api');
const OpenSubtitles = new OS({
  useragent: 'TemporaryUserAgent',
  ssl: true
});
const ipcRenderer = require('electron').ipcRenderer;

var shell = require('electron').shell;
var path = require('path');
var $ = require('jquery');
var https = require('https');
var fs = require('fs');
var app = require('electron').remote.app;
var os = require("os");
var SubDb = require("subdb");

global.store = new Store();
global.globalToken = "";
var deepSearchToken = "";
var subdb = new SubDb();

// A little transition when gSubs finished loading
$(document).ready(function () {
  $('body').transition('scale');
});

// When updateReady message income
ipcRenderer.on('updateReady', function(event, text) {
  console.log("triggered updateReady");
  // changes the text of the button
  $('#update-nag').nag('show');
});

// Validate if any previous language has been set, if not make EN default
if (typeof store.get('lang') == 'undefined') {
  store.set('lang', 'en');
}

// Get stored language, set the flag icon and value in the language selection dropdown
$('#flag-shown-id').removeClass();
$('#flag-shown-id').addClass('flag');
if (store.get('lang') == 'en') {
  $('#flag-shown-id').addClass('us');
} else {
  $('#flag-shown-id').addClass(store.get('lang'));
}
$('.item[data-value=' + store.get('lang') + ']').addClass('active');
$('.item[data-value=' + store.get('lang') + ']').addClass('selected');

console.log(store.get('lang'));

// Close gSubs when close icon is clicked
$('#close-button').on('click', e => {
  remote.getCurrentWindow().close();
});

// Open the video using default video player when play button is clicked
$('#play-button-id').on('click', e => {
  shell.openItem($('#play-button-id').data("path"));
});

// Open the donation link when donate button clicked
$('#donate-button-id').on('click', e => {
  console.log("clicked");
  shell.openExternal("https://paypal.me/sanjevirau");
});

// Send message to start install update when button clicked
$('#install-btn-id').on('click', e => {
  ipcRenderer.send('quitAndInstall');
});

// When home button is clicked
$('#home-button').on('click', e => {

  // If home button icon was left arrow icon (usually when user in deep search result page)
  if ($('#home-button').hasClass('lnr-arrow-left')) {
    $('#searching-sub-video-id').hide();
    $("#searching-sub-id").show();
    $("#drag-caption-id-add-one").hide();
    $('#sad-id').hide();
    $('#error-id').hide();

    // If drag and drop is shown, then hide it with scale animation
    if (!$('.zone').hasClass('hidden')) {
      $('.zone').transition('scale');
    }

    $("#loading-id").fadeOut("slow");
    $("#result-table-id").fadeIn("slow");
    $("#deep-search-table-id").fadeOut();
    $("#searching-sub-for-id").text("Successfully found subtitles for the following videos");

    // Change home button icon to home icon
    $('#home-button').removeClass();
    $('#home-button').addClass("lnr lnr-home");

    $(".main-window").css("background", "linear-gradient(to bottom,  #ADD372 0%, #8EC89F 85%,#77C0C0 100%)");
    $("#logo").attr("src", "../img/logo-g.svg");
    $("#loading-id").fadeOut("slow");
    $("#fail-to-find-text-id").hide();

    // Set deep search token to empty (means the user is not in the deep search result page)
    deepSearchToken = "";

  } else {
    $('#searching-sub-video-id').hide();
    $("#searching-sub-id").hide();
    $("#drag-caption-id-add-one").hide();
    $("#fail-to-find-text-id").hide();
    $("#loading-id").hide();
    $("#result-table-id").hide();
    $("#deep-search-table-id").hide();
    $('#checkdone-id').hide();
    $('#sad-id').hide();
    $('#error-id').hide();
    $('#play-button-id').hide();
    $('.zone').removeClass('hover');
    $("#drag-caption-id-add-one").hide();
    $("#drag-caption-id").show();
    $(".search-box-div").fadeIn("fast");

    // If drag and drop is hidden, then reveal it with scale animation
    if ($('.zone').hasClass('hidden')) {
      $('.zone').transition('scale');
    } else {
      $('.zone').transition('scale');
      $('.zone').transition('scale');
    }

    $(".main-window").css("background", "linear-gradient(to bottom, #8241f9 0%, #7f40f2 52%, #4e277b 100%)");
    $("#logo").attr("src", "../img/logo-p.svg");

    // Set global token to empty (means the user is now in home page)
    globalToken = "";
  }
});

// When language selection dropdown in clicked
$('#language-select-id').on('click', e => {

  // Store the newly chosen language value
  var value = $('#language-select-id').dropdown('get value');
  if (value == '') {
    value = store.get('lang');
  }
  store.set('lang', value);

  // Change the flag icon to the newly selected language
  $('#flag-shown-id').removeClass();
  $('#flag-shown-id').addClass('flag');
  if (store.get('lang') == 'en') {
    $('#flag-shown-id').addClass('us');
  } else {
    $('#flag-shown-id').addClass(value);
  }
});

// Seach feature contents
$("#search-box-id").keyup(function (event) {
  // If button pressed was ENTER
  if (event.keyCode === 13) {
    globalToken = "";
    var searchBoxValue = $('#search-box-id').val();
    querySearch(searchBoxValue, showQuerySuccessPage, showQueryFailurePage);
  }
});

// Function to run query search loading page and execute query search
function querySearch(query, successCB, errorCB) {

  // Generate new token for this scan
  globalToken = tokenGenerator();

  $(".main-window").css("background", "linear-gradient(to bottom, #8241f9 0%, #7f40f2 52%, #4e277b 100%)");
  $("#logo").attr("src", "../img/logo-p.svg");
  $('.loading span').css('color', '#7f40f2');
  $('#sad-id').hide();
  $(".fail-to-find-text").hide();
  $("#result-table-id").fadeOut();
  $("#drag-caption-id-add-one").hide();
  $("#loading-id").fadeIn("slow");
  $("#drag-caption-id").hide();
  $(".zone").addClass("hover");
  if ($('.zone').hasClass('hidden')) {
    $('.zone').transition('scale');
  }

  OpenSubtitles.search({
    sublanguageid: languageCodeto3Letter(store.get('lang')), // Language id needs to be changed to 3 letter code
    query: query,
    limit: 'all'
  }).then(result => {
    if (jQuery.isEmptyObject(result)) {
      console.log("failure");
      errorCB(globalToken);
    } else {
      successCB(result, globalToken);
      console.log("Current Token: " + globalToken);
    }
  });
}

// Drag and drop feature contents
$(document).on({
  // When files are being dragged into gSubs
  dragover: function (e) {
    // Check if user is in home page using global token
    if (global.globalToken == "") {
      var dropZone = $('.zone');

      // Check if files are being dragged into drag and drop zone
      var found = false,
        node = e.target;
      do {
        if (node === dropZone[0]) {
          found = true;
          break;
        }
        node = node.parentNode;
      } while (node != null);

      // If files are dragged into drag and drop zone
      if (found) {
        dropZone.addClass('hover');

        // Show the number of files being dragged
        $("#drag-caption-id-add-one").text("+" + event.dataTransfer.items.length);

        $("#drag-caption-id-add-one").show();
        $("#drag-caption-id").hide();
        $(".search-box-div").fadeOut("fast");
      } else {
        dropZone.removeClass('hover');
        $("#drag-caption-id-add-one").hide();
        $("#drag-caption-id").show();
        $(".search-box-div").fadeIn("fast");
      }

      event.preventDefault();
      return false;
    } else {
      event.preventDefault();
      return false;
    }
  },
  // When files are being dropped into gSubs
  drop: function (e) {

    //Check if files are being dropped in the home page using global token
    if (global.globalToken == "") {
      // If a single file is being added
      if (event.dataTransfer.files.length == 1) {
        // Validate if it's a valid video file
        if (validateVideoFileExtension(event.dataTransfer.files[0].name)) {
          var nameLabel;
          var fullName = event.dataTransfer.files[0].name;
          var filePath = event.dataTransfer.files[0].path;

          // Reduce the name of the video filename to suit gSubs width
          if (event.dataTransfer.files[0].name.length > 38) {
            nameLabel = event.dataTransfer.files[0].name.substring(0, 35) + '...';
          } else {
            nameLabel = event.dataTransfer.files[0].name;
          }

          // Show the subtitle searching loading page
          $('#searching-sub-video-id').text(nameLabel);
          $("#searching-sub-for-id").text("Searching subtitle for");
          $("#searching-sub-id").fadeIn("slow");
          $('#searching-sub-video-id').fadeIn("slow");
          $("#drag-caption-id-add-one").hide();
          $("#loading-id").fadeIn("slow");

          // Create a new CheckSubtitle instance
          var singleScan = new CheckSubtitle(fullName, filePath, store.get('lang'));

          // Generate a new token for this scan
          globalToken = tokenGenerator();

          // Execute single subtitle scan
          singleScan.checkSubSingle(showErrorPage, showFailurePage, showSuccessPage, showPartialSuccessPage, globalToken);

        } else
        // If not valid video file, then show error and bring back to home page
        {
          var dropZone = $('.zone');
          dropZone.removeClass('hover');
          $("#searching-sub-id").fadeOut("slow");
          $("#drag-caption-id-add-one").hide();
          $("#loading-id").fadeOut("slow");
          $("#drag-caption-id").fadeIn("slow");
          $(".search-box-div").fadeIn("fast");
          $("#drag-caption-id").text("Only video files are supported");
          $('.zone').transition('shake');
        }
        // If multiple files are dropped
      } else {
        $("#result-tbody").empty();

        // Declare a count variable for keep track of total files being add
        global.multifilesnum = 0;

        // Generate a new token for this scan
        globalToken = tokenGenerator();

        multiSearchLoading(loadMultiSearchLoadingPage, globalToken);
      }
      return false;
    } else {
      event.preventDefault();
      return false;
    }
  }
});

// Function to validate and execute subtitle search for multiple files
function multiSearchLoading(callback, token) {
  var objs = [];

  // Loop through each files being added
  $.each(event.dataTransfer.files, function (index, val) {
    var fullName = val.name;
    var filePath = val.path;

    // If valid video file format, add to table and create CheckSubtitle intance
    if (validateVideoFileExtension(fullName)) {
      $("#result-tbody").append('<tr><td>' + fullName + '</td><td><div id="futher-search' + index + '" class="further-search-btn"><div class="ui small active inverted loader"></div></div></td></tr>');
      objs.push(new CheckSubtitle(fullName, filePath, store.get('lang'), index));
      global.multifilesnum++;

    } else {
      $("#result-tbody").append('<tr><td style="text-decoration: line-through;">' + fullName + '</td><td><span class="lnr lnr-cross-circle"></span></td></tr>');
    }

  });

  // Execute subtitle scanning for each video files
  for (var i = 0; i < objs.length; i++) {
    objs[i].checkSubMulti(showErrorPageMulti, showSuccessPageMulti, showPartialSuccessPageMulti, token);
  }

  // If global token is still valid, then call back
  if (globalToken == token && globalToken.length != 0) {
    callback();
  }
}

// Function to show multi search loading page
function loadMultiSearchLoadingPage() {
  $("#searching-sub-for-id").text('Finding subtitles for the following videos');
  $(".searching-sub-video").hide();
  $("#searching-sub-id").fadeIn("fast");
  $("#loading-id").hide();
  if (!$('.zone').hasClass('hidden')) {
    $('.zone').transition('scale');
  }
  $('#result-table-id').fadeIn('fast');
}

// Function to validate video files
function validateVideoFileExtension(fName) {
  var extensionLists = ['m4v', 'avi', 'mpg', 'mp4', 'webm', 'mkv'];

  // One validation function for all file types     
  return extensionLists.indexOf(fName.split('.').pop()) > -1;

}

// Function to show success page of single scan
function showSuccessPage(path, token) {
  if (globalToken == token && globalToken.length != 0) {
    console.log('Success finding subtitle');
    $(".main-window").css("background", "linear-gradient(to bottom,  #ADD372 0%, #8EC89F 85%,#77C0C0 100%)");
    $("#searching-sub-for-id").text('Subtitle successfully downloaded for');
    $("#loading-id").hide();
    $('#checkdone-id').fadeIn('slow');
    $('#play-button-id').fadeIn('slow');
    $('#play-button-id').data('path', path);
    $("#logo").attr("src", "../img/logo-g.svg");
  }
}

// Function to show failure page of single scan
function showFailurePage(token) {
  if (globalToken == token && globalToken.length != 0) {
    console.log('Failed finding subtitle');
    $(".main-window").css("background", "linear-gradient(to bottom,  #DD1818 0%, #862626 85%,#DD1818 100%)");
    $("#searching-sub-for-id").text("Couldn't find subtitle for");
    $("#loading-id").hide();
    $('#sad-id').fadeIn('slow');
    $("#logo").attr("src", "../img/logo-r.svg");
    $(".fail-to-find-text").fadeIn("fast");
  }
}

// Function to show error page of single scan
function showErrorPage(token) {
  if (globalToken == token && globalToken.length != 0) {
    console.log('Error Finding Single Sub');
    $(".main-window").css("background", "linear-gradient(to bottom,  #DD1818 0%, #862626 85%,#DD1818 100%)");
    $("#searching-sub-for-id").text("Error finding subtitle for");
    $("#loading-id").hide();
    $('#error-id').fadeIn('slow');
    $("#logo").attr("src", "../img/logo-r.svg");
    $(".fail-to-find-text").text("Please check your internet connection before retrying.");
    $(".fail-to-find-text").fadeIn("fast");
  }
}

// Function to show partial sucess page of single scan (page to show after deep scan)
function showPartialSuccessPage(result, filePath, token) {

  function runLoading(resultJSON, callback) {
    var resultJSONParse = JSON.parse(resultJSON);
    var multipleFound = false;

    $("#result-tbody").empty();
    $.each(resultJSONParse, function (key, val) {
      if (isArray(val)) {
        multipleFound = true;
        return false;
      }
    });

    if (multipleFound) {
      $.each(resultJSONParse, function (key, val) {
        $.each(val, function (key, val) {
          var fileName = this.filename;
          var subURL = this.url;
          // The subtitle will be downloaded to the same path as the video file
          var subPath = path.join(path.dirname(filePath), fileName);
          $("#result-tbody").append('<tr><td>' + fileName + '</td><td><div id="download-button"  class="download-btn" data-url="' + subURL + '" data-fullpath="' + subPath + '"><span class="lnr lnr-download"></span></div></td></tr>');
        });
      });
    } else {
      $.each(resultJSONParse, function (key, val) {
        var fileName = this.filename;
        var subURL = this.url;
        // The subtitle will be downloaded to the same path as the video file
        var subPath = path.join(path.dirname(filePath), fileName);
        $("#result-tbody").append('<div id="download-button"  class="download-btn" data-url="' + subURL + '" data-fullpath="' + subPath + '"><span class="lnr lnr-download"></span></div></td></tr>');
      });
    }
    callback();
  }

  function loadSinglePartialSuccessPage() {
    $(".main-window").css("background", "linear-gradient(to bottom,  #ADD372 0%, #8EC89F 85%,#77C0C0 100%)");
    $("#searching-sub-for-id").text('Found subtitles that might suit');
    $("#loading-id").hide();
    if (!$('.zone').hasClass('hidden')) {
      $('.zone').transition('scale');
    }
    $('#result-table-id').fadeIn('fast');
    $("#logo").attr("src", "../img/logo-g.svg");
  }

  function isArray(what) {
    return Object.prototype.toString.call(what) === '[object Array]';
  }

  var resultJSON = JSON.stringify(result);

  // If global token is still valid, then call back
  if (globalToken == token && globalToken.length != 0) {
    runLoading(resultJSON, loadSinglePartialSuccessPage);
  }
}


// Function to show success page after a success search 
function showQuerySuccessPage(result, token) {

  function runLoading(resultJSON, callback) {
    var resultJSONParse = JSON.parse(resultJSON);
    var multipleFound = false;
    $.each(resultJSONParse, function (key, val) {
      if (isArray(val)) {
        multipleFound = true;
        return false;
      }
    });

    $("#result-tbody").empty();

    if (multipleFound) {
      $.each(resultJSONParse, function (key, val) {
        $.each(val, function (key, val) {
          var fileName = this.filename;
          var subURL = this.url;
          var subPath = path.join(os.homedir(), 'Desktop', fileName);
          $("#result-tbody").append('<tr><td>' + fileName + '</td><td><div id="download-button"  class="download-btn" data-url="' + subURL + '" data-query="yes" data-fullpath="' + subPath + '"><span class="lnr lnr-download"></span></div></td></tr>');
        });
      });
    } else {
      $.each(resultJSONParse, function (key, val) {
        var fileName = this.filename;
        var subURL = this.url;
        $("#result-tbody").append('<div id="download-button"  class="download-btn" data-url="' + subURL + '" data-query="yes" data-fullpath="' + subPath + '"><span class="lnr lnr-download" ></span></div></td></tr>');
      });
    }
    callback();
  }

  function loadQuerySearchPage() {
    console.log("Updating Table");
    $(".main-window").css("background", "linear-gradient(to bottom,  #ADD372 0%, #8EC89F 85%,#77C0C0 100%)");
    $("#searching-sub-for-id").text('Subtitles successfully searched');
    $("#loading-id").hide();
    $("#fail-to-find-text-id").hide();
    if (!$('.zone').hasClass('hidden')) {
      $('.zone').transition('scale');
    }
    $('#result-table-id').fadeIn('fast');
    $("#logo").attr("src", "../img/logo-g.svg");
  }

  function isArray(what) {
    return Object.prototype.toString.call(what) === '[object Array]';
  }

  var resultJSON = JSON.stringify(result);

  // If global token is still valid, then call back
  if (globalToken == token && globalToken.length != 0) {
    runLoading(resultJSON, loadQuerySearchPage);
  }
}

// Function to show failure page after a failed search
function showQueryFailurePage(token) {
  console.log('No search result found');
  if (globalToken == token && globalToken.length != 0) {
    $(".main-window").css("background", "linear-gradient(to bottom,  #DD1818 0%, #862626 85%,#DD1818 100%)");
    $("#loading-id").hide();
    $('#sad-id').fadeIn('slow');
    $("#logo").attr("src", "../img/logo-r.svg");
    $('#result-table-id').hide();
    $(".fail-to-find-text").fadeIn("fast");
  }
}

// Function to show success page after a success deep search
function showDeepSearchSuccessPage(result, filePath) {

  function runLoading(resultJSON, callback) {
    var resultJSONParse = JSON.parse(resultJSON);
    var multipleFound = false;

    $.each(resultJSONParse, function (key, val) {
      if (isArray(val)) {
        multipleFound = true;
        return false;
      }
    });

    $("#deep-result-tbody").empty();

    if (multipleFound) {
      $.each(resultJSONParse, function (key, val) {
        $.each(val, function (key, val) {
          var fileName = this.filename;
          var subURL = this.url;
          // The subtitle will be downloaded to the same path as the video file
          var subPath = path.join(path.dirname(filePath), fileName);
          $("#deep-result-tbody").append('<tr><td>' + fileName + '</td><td><div id="download-button"  class="download-btn" data-url="' + subURL + '" data-fullpath="' + subPath + '"><span class="lnr lnr-download"></span></div></td></tr>');
        });
      });
    } else {
      $.each(resultJSONParse, function (key, val) {
        var fileName = this.filename;
        var subURL = this.url;
        // The subtitle will be downloaded to the same path as the video file
        var subPath = path.join(path.dirname(filePath), fileName);
        $("#deep-result-tbody").append('<div id="download-button"  class="download-btn" data-url="' + subURL + '" data-fullpath="' + subPath + '"><span class="lnr lnr-download"></span></div></td></tr>');
      });
    }

    callback();
  }

  function loadDeepSearchSuccessPage() {
    console.log("Updating Table");
    $(".main-window").css("background", "linear-gradient(to bottom,  #ADD372 0%, #8EC89F 85%,#77C0C0 100%)");
    $("#searching-sub-for-id").text('Found subtitles that might suit');
    $("#loading-id").hide();
    if (!$('.zone').hasClass('hidden')) {
      $('.zone').transition('scale');
    }
    $('#deep-search-table-id').fadeIn('fast');
    $("#logo").attr("src", "../img/logo-g.svg");
  }



  function isArray(what) {
    return Object.prototype.toString.call(what) === '[object Array]';
  }

  var resultJSON = JSON.stringify(result);

  // If deep search token is still valid, then call back
  if (deepSearchToken == filePath) {
    runLoading(resultJSON, loadDeepSearchSuccessPage);
  }
}

// Function to show failure page after a failed deep search
function showDeepSearchFailurePage(result, filePath) {
  $(".main-window").css("background", "linear-gradient(to bottom,  #DD1818 0%, #862626 85%,#DD1818 100%)");
  $("#searching-sub-for-id").text("Couldn't find subtitle for");
  $("#loading-id").hide();
  $('#sad-id').fadeIn('slow');
  $("#logo").attr("src", "../img/logo-r.svg");
  $(".fail-to-find-text").fadeIn("fast");
  console.log("Failed to find subtitle using deep search");
}

// Function to show success page of multi scan 
// (shows a checkmark icon for the specific video file in the table)
function showSuccessPageMulti(filePath, index, token) {
  $("#futher-search" + index).html('<span class="lnr lnr-checkmark-circle"></span>');
  checkMultiCheckComplete(token);
}

// Function to show failure page of multi scan 
// (shows a cross icon for the specific video file in the table)
function showErrorPageMulti(filePath, index, token) {
  $("#futher-search" + index).html('<span class="lnr lnr-cross-circle"></span>');
  checkMultiCheckComplete(token);
}

// Function to show partial success page of multi scan 
// (shows a right arrow icon for the specific video file in the table to proceed to deep scan)
function showPartialSuccessPageMulti(filePath, index, token) {
  $("#futher-search" + index).html('<div id="proceed-further-id' + index + '" class="proceed-further"><span class="lnr lnr-arrow-right"></span></div>');
  checkMultiCheckComplete(token);
  $("#proceed-further-id" + index).data('path', filePath);
}

// Function to check if all multi files have been searched for subtitle, then show green layout of gSubs
function checkMultiCheckComplete(token) {
  global.multifilesnum--;

  if (global.multifilesnum == 0) {
    if (globalToken == token && globalToken.length != 0) {
      $(".main-window").css("background", "linear-gradient(to bottom,  #ADD372 0%, #8EC89F 85%,#77C0C0 100%)");
      $("#searching-sub-for-id").text('Successfully found subtitles for the following videos');
      $("#logo").attr("src", "../img/logo-g.svg");
    }
  }
}

// Proceed to deep search when clicked on the right arrow icon button
$('body').on('click', 'div.proceed-further', function () {
  var currentItem = this;
  var fullPath = $(currentItem).data("path");
  singleDeepCheck(fullPath, showDeepSearchSuccessPage, showDeepSearchFailurePage);
});

// Function to show deep search loading page and execute deep scan for selected files
function singleDeepCheck(filePathIn, successCB, errorCB) {

  var fileNameWithExtension = path.basename(filePathIn);
  var fileNameWithoutExtension = path.basename(filePathIn, path.extname(fileNameWithExtension));

  var nameLabel = "";
  if (fileNameWithExtension.length > 38) {
    nameLabel = fileNameWithExtension.substring(0, 35) + '...';
  } else {
    nameLabel = fileNameWithExtension;
  }

  // Set the deep search token as the file path of the file being deep searched
  deepSearchToken = filePathIn;

  $("#searching-sub-for-id").text("Running deep subtitle search for");
  $("#drag-caption-id-add-one").hide();
  $("#result-table-id").fadeOut();

  setTimeout(function () {
    $('#searching-sub-video-id').text(nameLabel);
    $('#searching-sub-video-id').fadeIn("slow");
    if ($('.zone').hasClass('hidden')) {
      $('.zone').transition('scale');
    }
    $("#loading-id").fadeIn("slow");
    $('.loading span').css('color', '#8EC89F');
  }, 300);

  // Change home button icon to back icon
  $('#home-button').removeClass();
  $('#home-button').addClass("lnr lnr-arrow-left");

  //Execute deep search using opensubtitle
  OpenSubtitles.search({
    sublanguageid: languageCodeto3Letter(store.get('lang')), // Language id needs to be changed to 3 letter code
    path: filePathIn,
    filename: fileNameWithExtension,
    query: fileNameWithExtension,
    limit: 'all'
  }).then(result => {
    if (jQuery.isEmptyObject(result)) {
      console.log("Failed to find subtitle using deep search");
      errorCB(result, filePathIn);
    } else {
      successCB(result, filePathIn);
    }
  });
}

// Function to download subtitle
$('body').on('click', 'div.download-btn', function () {
  var currentItem = this;
  var fullPath = $(this).data("fullpath");
  var downloadURL = $(this).data("url");
  var queryData = $(this).data("query");

  // If download button is clicked from the search query results
  if (queryData == "yes") {
    $(this).html('<div class="ui small active inverted loader"></div>');
    // Show save dialog to ask user to specify save path
    dialog.showSaveDialog({
      filters: [
        {
          name: 'Subtitle',
          extensions: ['srt']
        }
      ],
      defaultPath: fullPath
    }, function (fileName) {
      if (fileName === undefined) {
        $(currentItem).html('<span class="lnr lnr lnr-download"></span>');
        return;
      }

      // Create a file stream
      var file = fs.createWriteStream(fileName);
      
      // Start request to download
      var request = https.get(downloadURL, function (response) {

        // Check if response is success
        if (response.statusCode !== 200) {
          return console.log('Response status was ' + response.statusCode);
        }

        response.pipe(file);

        file.on('finish', function () {
          $(currentItem).html('<span class="lnr lnr-checkmark-circle"></span>');
          file.close(); // Close() is async, call cb after close completes   
        });


      });

      // Check for request error too
      request.on('error', function (err) {
        fs.unlinkSync(fileName);
        $(this).html('<span class="lnr lnr-cross-circle"></span>');
        return console.log(err.message);
      });

      file.on('error', function (err) { // Handle errors
        fs.unlinkSync(fullPath); // Delete the file async
        $(this).html('<span class="lnr lnr-cross-circle"></span>');
        return console.log(err.message);
      });

    });
  } else {
    $(this).html('<div class="ui small active inverted loader"></div>');
    var file = fs.createWriteStream(fullPath);
    var request = https.get(downloadURL, function (response) {

      // Check if response is success
      if (response.statusCode !== 200) {
        return console.log('Response status was ' + response.statusCode);
      }

      response.pipe(file);


      file.on('finish', function () {
        $(currentItem).html('<span class="lnr lnr-checkmark-circle"></span>');
        file.close(); // close() is async, call cb after close completes
      });


    });

    // Check for request error too
    request.on('error', function (err) {
      fs.unlinkSync(fullPath);
      $(currentItem).html('<span class="lnr lnr-cross-circle"></span>');
      return console.log(err.message);
    });

    file.on('error', function (err) { // Handle errors
      fs.unlinkSync(fullPath); // Delete the file async 
      $(currentItem).html('<span class="lnr lnr-cross-circle"></span>');
      return console.log(err.message);
    });
  }
});

// Function to convert default 2 language code to 3 language code for OpenSubtitle
function languageCodeto3Letter(lang) {
  switch (lang) {
    case 'en':
      return 'eng';
    case 'es':
      return 'spa';
    case 'fr':
      return 'fre';
    case 'it':
      return 'ita';
    case 'nl':
      return 'dut';
    case 'pl':
      return 'pol';
    case 'pt':
      return 'por';
    case 'ro':
      return 'ron';
    case 'sv':
      return 'swe';
    case 'tr':
      return 'tur';
    default:
      console.log("Error language code");
      break;
  }
}

// Function to genereate a simple random token 
// (token is used to determine which page user is viewing in gSubs)
function tokenGenerator() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (var i = 0; i < 8; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}