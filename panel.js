// event log text
var log = ""

// downloaded and parsed subtitles
var currentSubtitles = [];

var mediaId = "";
var title = "";

// current time in seconds of video playing
var time = 0;

//refresh of sub is ms
var refreshSpeed = 200;

//invokes main event loop async.
async function videoLoop() {
    // wait for div to become available
    setTimeout(updateSubtitle, 2000);
}
videoLoop();


// looks at current time and displays current
// subtitle on panel.
function updateSubtitle() {

    var subtitleText = "";
    if (currentSubtitles.length > 0) {
        for (var i = 0; i < currentSubtitles.length; i++) {
            sub = currentSubtitles[i];
            if (sub.start < time && sub.end > time) {
                subtitleText = `[${sub.character}]: ${sub.text} <br>` + subtitleText;
            }
        }
        document.getElementById("subtitle").innerHTML = subtitleText;
    }

    var minutes = Math.floor(time / 60) + "";
    var seconds = time % 60 + "";
    document.getElementById("time").innerHTML = minutes.padStart(2, "0") + ":" + seconds.padStart(2, "0");

    // re-call heartbeat fnc every second
    time += refreshSpeed / 1000.0;
    setTimeout(updateSubtitle, refreshSpeed);
}

// examines network and waits for certain requests to be made by crunchyroll
chrome.devtools.network.onRequestFinished.addListener(request => {
    request.getContent((body) => {
        if (request.request && request.request.url) {
            // used to sync time when user pauses video
            if (request.request.url.includes('playheads')) {
                var obj = JSON.parse(request.request.postData.text);
                time = obj.playhead;
            }

            // syncs time on play events
            if (request.request.url.includes('/v1/track')) {
              var obj = JSON.parse(request.request.postData.text);
              time = obj.properties.playheadTime;
              title = obj.properties.episodeTitle;

              // save dub URL as title of movie so we can access it during dub page where media id changes
              if(title != "" && mediaId == obj.properties.mediaId && localStorage.getItem(title) == null) {
                var url = localStorage.getItem(mediaId);
                if (url != null) {
                    localStorage.setItem(title, url);
                }
              }

              // new video from clicking next video on player
              if(mediaId != "" && mediaId != obj.properties.mediaId) {
                  clearSubtitles();

              }

              updateMediaId(obj.properties.mediaId);
              if (currentSubtitles.length == 0) {
                  // attempt to download subtitles if available
                  downloadSubtitles();
              }
          }

            // the play request will return subtitle information. However,
            // only the japanese audio play will return english subtitles.
            //https://cr-play-service.prd.crunchyrollsvc.com/v1/G6NQXD0X6/web/chrome/play
            if (request.request.url.includes("/chrome/play")) {
                var urlSplit = request.request.url.split("d=https://");
                var mediaIdSplit = request.request.url.split("/");
                updateMediaId(mediaIdSplit[4]);
                console.log(urlSplit);

                var bodyObj = JSON.parse(body);
                log = JSON.stringify(bodyObj, null, 4) + "\n" + log;

                log = JSON.stringify(request.request, null, 4) + "\n" + log;

                document.getElementById("log").innerHTML = log;

                processSubtitleMetaData(bodyObj);

                downloadSubtitles();
            }

            if (request.request.url.includes("https://www.crunchyroll.com/watch/")) {
                var urlSplit = request.request.url.split("d=https://");
                currentPage = urlSplit[1];
                document.getElementById("videoLug").innerHTML = currentPage;

                //https://www.crunchyroll.com/watch/G7PU4925J/idiots-only-event-kin
                var mediaIdSplit = currentPage.split("/");
                updateMediaId(mediaIdSplit[2]);
            }
        }
    });
});

// parses subtitle response from crunchyroll
function processSubtitleMetaData(response) {
    var subtitles = response.subtitles;

    console.log(subtitles);

    if (subtitles.hasOwnProperty("en-US") && mediaId != "") {
        console.log(subtitles["en-US"]);
        console.log(`Saving to local storage ${mediaId} ${subtitles["en-US"].url}`)
        localStorage.setItem(mediaId, subtitles["en-US"].url)
    }
}

// downloads & loads subtitles for the current page
function downloadSubtitles() {
    clearSubtitles();

    if (mediaId == "") {
        return;
    }

    var url = localStorage.getItem(mediaId);

    if (url == null) {
        if(title != null) {
          url = localStorage.getItem(title);
        }
        if(url == null) {
          console.log("No Subtitle file cached for page, toggle japanese language");
          document.getElementById("subtitle").innerHTML = "No Subtitle file cached for page " + mediaId + ", toggle japanese language";
          return;
        }
    }

    fetch(url, {
        method: 'GET',
        mode: 'cors',
        headers: {
            'Content-Type': 'Text'
            // 'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.text())
    .then(text => {
        document.getElementById("subtitlesCache").innerHTML = text;

        parseASS(text);
    })
    .catch(exception => {
        console.log(exception);
    });
}

// parses ASS subtitle format & saves it into currentSubtitles obj
function parseASS(subtileFile) {
    var assList = subtileFile.split("\n");

    for (var i = 0; i < assList.length; i++) {
        var line = assList[i];
        //format
        //Dialogue: 0,0:02:17.42,0:02:20.99,Main,Rei,0000,0000,0000,,I, Reigen Arataka, shall accept this job!
        //Dialogue: 0,0:02:17.42,0:02:20.99,Main,Rei,0000,0000,0000,,I, Reigen Arataka, shall accept this job!
        if (line.startsWith("Dialogue:")) {
            // need to extract time and dialog
            var exploded = line.split(",");
            var start = exploded[1];
            var end = exploded[2];
            var character = exploded[4];
            var text = exploded.slice(9, exploded.length).join(",");

            //console.log(`${start} to ${end} ${character} saying: ${text}`);
            currentSubtitles.push({
                start: timeStampToSeconds(start) - 1.5,
                end: timeStampToSeconds(end) + 2,
                character: character,
                text: cleanSubtitle(text)
            })
        }
    }
}

function clearSubtitles() {
    // clear any prior loaded subtitles
    currentSubtitles = [];
    document.getElementById("subtitlesCache").innerHTML = "No subtitles loaded";
}

function updateMediaId(id) {
  mediaId = id;
  document.getElementById("videoLug").innerHTML = mediaId + " " + title;
}

function timeStampToSeconds(time) {
    var splitTime = time.split(":");
    var hours = splitTime[0];
    var minutes = splitTime[1];
    var seconds = splitTime[2];
    return parseFloat(seconds) + 60 * parseFloat(minutes) + 60 * 60 * parseFloat(hours);
}

function cleanSubtitle(text) {
    //yen {\fs12\b0}(Tax Excluded)\NOutside of Offer Period: 8980 yen
    text = text.replace('\\N', " ");
    text = text.replace(/([\s\S]*?){[\s\S]*?}/g, '$1');
    return text;
}
