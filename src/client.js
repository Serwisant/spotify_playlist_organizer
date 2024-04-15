import { redirectToAuthCodeFlow, getAccessToken } from "./verifier.js"

const clientId = "YOUR-CLIENT-ID"; // Replace with your client ID
const params = new URLSearchParams(window.location.search);
const code = params.get("code");

var songs = {}
var userPlaylists = {}
var accessToken = null;
var userID = "";

document.getElementById("playlist").onchange = showSongDetails
document.getElementById("newPlaylist").onchange = showFilteredSongDetails
document.getElementById("filterNow").onclick = filterPlaylist
document.getElementById("copyFromYourPlaylist").onclick = copyFromYourPlaylist
document.getElementById("removeSelected").onclick = removeSelected
document.getElementById("clearNewPlaylist").onclick = clearNewPlaylist
document.getElementById("userPlaylists").onclick = refreshPlaylist
document.getElementById("loadCustomPlaylist").onclick = loadCustomPlaylist
document.getElementById("sendNewPlaylist").onclick = sendNewPlaylist

if (!code) {
    redirectToAuthCodeFlow(clientId);
} else {
    if(getCookie("accessToken") === "" ||
       getCookie("accessToken") === undefined ||
       getCookie("accessToken") === "undefined") {
        accessToken = await getAccessToken(clientId, code);
        var expirationDate = new Date();
        expirationDate.setTime(expirationDate.getTime() + (1000 * 3600 * 0.75));   // 45 minutes
        document.cookie = "accessToken=" + accessToken + ";expires=" + expirationDate.toUTCString();
    } else {
        accessToken = getCookie("accessToken");
    }
    const profile = await fetchProfile(accessToken);
    populateUI(profile)
    fillUserPlaylists(accessToken)
}

async function loadPlaylist(accessToken, playlistID) {
    const playlist = await getPlaylist(accessToken, playlistID);
    
    if(playlist["error"] !== undefined && playlist["error"]["status"] === 401)
        window.location.replace("/");
    
    var playlistList = document.getElementById("playlist");
    
    var lowBPM = 320;
    var highBPM = 0;
    
    var artistsSet = new Set();
    
    for(let i = 0; i < playlist["tracks"]["items"].length; ++i) {
        const id = playlist["tracks"]["items"][i]["track"]["id"];
        const name = playlist["tracks"]["items"][i]["track"]["name"];
        const link = playlist["tracks"]["items"][i]["track"]["external_urls"]["spotify"];
        const artists = playlist["tracks"]["items"][i]["track"]["artists"];
        
        const analysis = await getAudioAnalysis(accessToken, id);
        const tempo = analysis["track"]["tempo"];
        const key = getKey(analysis["track"]["key"]);
        const time_signature = analysis["track"]["time_signature"] + "/4";
        
        var newEntry = document.createElement("option");
        newEntry.text = name;
        playlistList.add(newEntry);
        
        if(tempo < lowBPM)
            lowBPM = tempo;
        
        if(tempo > highBPM)
            highBPM = tempo;
        
        var artistsList = [];
        for(var idx = 0; idx < artists.length; ++idx) {
            artistsList.push(artists[idx].name);
            artistsSet.add(artists[idx].name);
        }
        
        songs[name] = {"id": id, "tempo": tempo, "key": key, "timeSignature": time_signature, "artists": artistsList};
    }
    
    document.getElementById("filterLowTempo").value = lowBPM;
    document.getElementById("filterHighTempo").value = highBPM;
    
    refreshArtistsToFilter(artistsSet);
}

async function fetchProfile(token) {
    const result = await fetch("https://api.spotify.com/v1/me", {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });

    return await result.json();
}

function populateUI(profile) {
    document.getElementById("displayName").innerText = profile.display_name;
    if (profile.images[0]) {
        const profileImage = new Image(200, 200);
        profileImage.src = profile.images[0].url;
        document.getElementById("avatar").appendChild(profileImage);
        document.getElementById("imgUrl").innerText = profile.images[0].url;
    }
    document.getElementById("id").innerText = profile.id;
    userID = profile.id;
    document.getElementById("email").innerText = profile.email;
    document.getElementById("uri").innerText = profile.uri;
    document.getElementById("uri").setAttribute("href", profile.external_urls.spotify);
    document.getElementById("url").innerText = profile.href;
    document.getElementById("url").setAttribute("href", profile.href);
}

async function getPlaylist(token, playlistID) {
    const result = await fetch(`https://api.spotify.com/v1/playlists/${playlistID}`, {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });

    return await result.json();
}

async function getAudioAnalysis(token, id) {
        const result = await fetch('https://api.spotify.com/v1/audio-analysis/' + id, {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });

    return await result.json();
}

function getKey(pitchClass) {
    const keys = {
        0: "C (also B♯, D♭♭)",
        1: "C♯, D♭ (also B♯♯)",
        2: "D (also C♯♯, E♭♭)",
        3: "D♯, E♭ (also F♭♭)",
        4: "E (also D♯♯, F♭)",
        5: "F (also E♯, G♭♭)",
        6: "F♯, G♭ (also E♯♯)",
        7: "G (also F♯♯, A♭♭)",
        8: "G♯, A♭",
        9: "A (also G♯♯, B♭♭)",
        10: "A♯, B♭ (also C♭♭)",
        11: "B (also A♯♯, C♭)"
    }
    
    if(keys[pitchClass] !== undefined)
        return keys[pitchClass];
    else
        return "Unknown";
}

function showSongDetails(evt) {
    var songName = document.getElementById("songName");
    var songTempo = document.getElementById("songTempo");
    var songKey = document.getElementById("songKey");
    var songTimeSignature = document.getElementById("songTimeSignature");
    var songArtists = document.getElementById("songArtists");
    
    const songFound = songs[evt.target.value];
    
    if(songs[evt.target.value] === undefined)
        return;
    
    songName.innerText = evt.target.value;
    songTempo.innerText = songFound["tempo"];
    songKey.innerText = songFound["key"];
    songTimeSignature.innerText = songFound["timeSignature"];
    
    var artistsLabel = "";
    for(var idx = 0; idx < songFound["artists"].length; ++idx) {
        artistsLabel += songFound["artists"][idx] + "; ";
    }
    
    songArtists.innerText = artistsLabel;
}

function showFilteredSongDetails(evt) {
    var songName = document.getElementById("filteredSongName");
    var songTempo = document.getElementById("filteredSngTempo");
    var songKey = document.getElementById("filteredSongKey");
    var songTimeSignature = document.getElementById("filteredSongTimeSignature");
    
    const songFound = songs[evt.target.value];
    
    if(songs[evt.target.value] === undefined)
        return;
    
    songName.innerText = evt.target.value;
    songTempo.innerText = songFound["tempo"];
    songKey.innerText = songFound["key"];
    songTimeSignature.innerText = songFound["timeSignature"];
}

function filterPlaylist(evt) {
    const filteredPlaylist = document.getElementById("newPlaylist");
    
    const lowBPM = document.getElementById("filterLowTempo").value;
    const highBPM = document.getElementById("filterHighTempo").value;
    
    const desiredKey = document.getElementById("filterKey").value;
    const desiredTimeSignature = document.getElementById("filterTimeSignature").value;
    const desiredArtist = document.getElementById("filterArtist").value;
    
    for(const song of Object.entries(songs)) {
        const songTempo = song[1]["tempo"];
        const songKey = song[1]["key"];
        const songTimeSignature = song[1]["timeSignature"];
        const songName = song[0];
        const artists = song[1]["artists"];
        
        if((songTempo >= lowBPM && songTempo <= highBPM) &&
           (desiredKey === "[ Ignore ]" || desiredKey === songKey) &&
           (desiredTimeSignature === "[ Ignore ]" || desiredTimeSignature === songTimeSignature) &&
           (desiredArtist === "[ Ignore ]" || artists.indexOf(desiredArtist) !== -1)) {
                var newEntry = document.createElement("option");
                newEntry.text = songName;
                filteredPlaylist.add(newEntry);
          }
    }
}

function copyFromYourPlaylist(evt) {
    const filteredPlaylist = document.getElementById("newPlaylist");
    const yourPlaylist = document.getElementById("playlist");
    
    if(shouldAddNewEntry(yourPlaylist.options[yourPlaylist.selectedIndex].text) === true) {
        var newEntry = document.createElement("option");
        newEntry.text = yourPlaylist.options[yourPlaylist.selectedIndex].text;
        filteredPlaylist.add(newEntry);
    }
}

function shouldAddNewEntry(entry) {
    if(document.getElementById("preventDuplicates").checked === false)
        return true;
    
    const filteredPlaylist = document.getElementById("newPlaylist");
    for(var idx = 0; idx < filteredPlaylist.options.length; ++idx) {
        if(entry === filteredPlaylist.options[idx].text)
            return false;
    }
    
    return true;
}

function removeSelected(evt) {
    const filteredPlaylist = document.getElementById("newPlaylist");

    const currentIndex = filteredPlaylist.selectedIndex
    filteredPlaylist.remove(currentIndex);
    if(currentIndex === filteredPlaylist.options.length)
        filteredPlaylist.selectedIndex = filteredPlaylist.options.length - 1;
    else
        filteredPlaylist.selectedIndex = currentIndex;
}

function clearNewPlaylist(evt) {
    const filteredPlaylist = document.getElementById("newPlaylist");
    while(filteredPlaylist.length > 0) {
        filteredPlaylist.remove(0);
    }
}

async function refreshPlaylist(evt) {
    const userPlaylists = document.getElementById("userPlaylists");
    
    const selectedPlaylist = userPlaylists.options[userPlaylists.selectedIndex].text;
    
    const currentPlaylist = document.getElementById("playlist");
    while(currentPlaylist.length > 0) {
        currentPlaylist.remove(0);
    }
    
    await loadPlaylist(accessToken, userPlaylists[selectedPlaylist]);
}

async function fillUserPlaylists(accessToken) {
    const result = await fetch("https://api.spotify.com/v1/me/playlists", {
        method: "GET", headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    const response = await result.json();
    
    const userPlaylists = document.getElementById("userPlaylists");
    
    for(var idx = 0; idx < response.items.length; ++idx) {
        const playlistName = response.items[idx].name;
        const playlistID = response.items[idx].id;
        
        userPlaylists[playlistName] = playlistID;
        
        var newEntry = document.createElement("option");
        newEntry.text = playlistName;
        userPlaylists.add(newEntry);
    }
}

function refreshArtistsToFilter(artists) {
    const artistsSelect = document.getElementById("filterArtist");
    
    while(artistsSelect.length > 0) {
        artistsSelect.remove(0);
    }
    
    var newEntry = document.createElement("option");
    newEntry.text = "[ Ignore ] ";
    artistsSelect.add(newEntry);
    
    var artistsArray = Array.from(artists).sort();
    
    for(var idx = 0; idx < artistsArray.length; ++idx) {
        var newEntry = document.createElement("option");
        newEntry.text = artistsArray[idx];
        artistsSelect.add(newEntry);
    }
}

function loadCustomPlaylist() { 
    const currentPlaylist = document.getElementById("playlist");
    while(currentPlaylist.length > 0) {
        currentPlaylist.remove(0);
    }
    
    const customPlaylistID = document.getElementById("customPlaylist").value;
    
    loadPlaylist(accessToken, customPlaylistID);
}

async function sendNewPlaylist() {
    const newPlaylistName = document.getElementById("newPlaylistName").value;
    
    const newPlaylistCreationResult = await fetch(`https://api.spotify.com/v1/users/${userID}/playlists`, {
        method: "POST", headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ name: `${newPlaylistName}` })
    });
    
    const newPlaylistJson = await newPlaylistCreationResult.json();
    
    const newPlaylistID = newPlaylistJson["id"];
    
    const newPlaylist = document.getElementById("newPlaylist");
    
    var bodyURIs = [];
    
    for(var idx = newPlaylist.options.length - 1; idx >= 0; --idx) {
        const trackID = songs[newPlaylist.options[idx].text].id;
        bodyURIs.push("spotify:track:" + trackID);
    }
    
    const newPlaylistUpdateResult = await fetch(`https://api.spotify.com/v1/playlists/${newPlaylistID}/tracks`, {
        method: "POST", headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ uris: bodyURIs })
    });
    
    const newPlaylistTracksJson = await newPlaylistUpdateResult.json();
    
    const userPlaylists = document.getElementById("userPlaylists");
    while(userPlaylists.length > 0) {
        userPlaylists.remove(0);
    }
    
    fillUserPlaylists(accessToken);
}

// Source: https://www.w3schools.com/js/js_cookies.asp
function getCookie(cname) {
  let name = cname + "=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(';');
  for(let i = 0; i <ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}