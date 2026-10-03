
const audio = document.getElementById("audio");

const songGrid = document.getElementById("songGrid");
const recentList = document.getElementById("recentList");
const searchInput = document.getElementById("searchInput");

let songs = [];
let currentIndex = 0;

let recentSongs =
  JSON.parse(localStorage.getItem("recentSongs")) || [];

let likedSongs =
  JSON.parse(localStorage.getItem("likedSongs")) || [];

let isShuffle = false;
let isRepeat = false;


// Select Element

function getElement(id) {
  return document.getElementById(id);
}


// Load Songs From Backend

async function loadSongs() {
  try {
    const response = await fetch("/api/songs");

    songs = await response.json();

    displaySongs(songs);
    displayRecentSongs();

  } catch (error) {
    console.error("Error loading songs:", error);

    songGrid.innerHTML =
      "<p>Unable to load songs. Start the server.</p>";
  }
}


// Display Songs

function displaySongs(songList) {

  songGrid.innerHTML = "";

  if (songList.length === 0) {
    songGrid.innerHTML = "<p>No songs found.</p>";
    return;
  }

  songList.forEach(song => {

    const card = document.createElement("article");

    card.className = "song-card";

    card.innerHTML = `

      <img
        src="${song.cover}"
        alt="${song.title}">

      <button
        class="play-small"
        aria-label="Play ${song.title}">

        <i class="fa-solid fa-play"></i>

      </button>

      <h3>${song.title}</h3>

      <p>${song.artist}</p>

    `;

    const playButton =
      card.querySelector(".play-small");

    playButton.addEventListener("click", () => {
      playSong(song.id);
    });

    card.addEventListener("dblclick", () => {
      playSong(song.id);
    });

    songGrid.appendChild(card);

  });

}


// Play Song

function playSong(songId) {

  const index =
    songs.findIndex(song => song.id === songId);

  if (index === -1) return;

  currentIndex = index;

  const song = songs[currentIndex];

  audio.src = song.audio;

  audio.play();

  getElement("currentCover").src = song.cover;

  getElement("currentTitle").innerText =
    song.title;

  getElement("currentArtist").innerText =
    song.artist;

  getElement("playButton").innerHTML =
    '<i class="fa-solid fa-pause"></i>';

  updateLikeButton(song.id);

  recentSongs = [
    song,
    ...recentSongs.filter(item => item.id !== song.id)
  ];

  localStorage.setItem(
    "recentSongs",
    JSON.stringify(recentSongs)
  );

  displayRecentSongs();

}


// Play / Pause

getElement("playButton").addEventListener("click", () => {

  if (!audio.src) return;

  if (audio.paused) {

    audio.play();

  } else {

    audio.pause();

  }

});


// Audio State

audio.addEventListener("play", () => {

  getElement("playButton").innerHTML =
    '<i class="fa-solid fa-pause"></i>';

});

audio.addEventListener("pause", () => {

  getElement("playButton").innerHTML =
    '<i class="fa-solid fa-play"></i>';

});


// Next Song

function nextSong() {

  if (songs.length === 0) return;

  if (isShuffle) {

    currentIndex =
      Math.floor(Math.random() * songs.length);

  } else {

    currentIndex =
      (currentIndex + 1) % songs.length;

  }

  playSong(songs[currentIndex].id);

}


// Previous Song

function previousSong() {

  if (songs.length === 0) return;

  currentIndex =
    (currentIndex - 1 + songs.length) % songs.length;

  playSong(songs[currentIndex].id);

}


getElement("nextButton")
  .addEventListener("click", nextSong);

getElement("previousButton")
  .addEventListener("click", previousSong);


// Shuffle

getElement("shuffleButton")
  .addEventListener("click", () => {

    isShuffle = !isShuffle;

    getElement("shuffleButton").style.color =
      isShuffle ? "#1ed760" : "#bbb";

  });


// Repeat

getElement("repeatButton")
  .addEventListener("click", () => {

    isRepeat = !isRepeat;

    getElement("repeatButton").style.color =
      isRepeat ? "#1ed760" : "#bbb";

  });


// Song Ended

audio.addEventListener("ended", () => {

  if (isRepeat) {

    audio.currentTime = 0;
    audio.play();

  } else {

    nextSong();

  }

});


// Volume Control

getElement("volume")
  .addEventListener("input", event => {

    audio.volume = event.target.value;

  });


// Progress Bar

getElement("progress")
  .addEventListener("input", event => {

    if (!audio.duration) return;

    audio.currentTime =
      (event.target.value / 100) * audio.duration;

  });


// Update Progress

audio.addEventListener("timeupdate", () => {

  if (!audio.duration) return;

  const progress =
    (audio.currentTime / audio.duration) * 100;

  getElement("progress").value = progress;

  getElement("currentTime").innerText =
    formatTime(audio.currentTime);

  getElement("duration").innerText =
    formatTime(audio.duration);

});


// Format Time

function formatTime(seconds) {

  if (!Number.isFinite(seconds)) {
    return "0:00";
  }

  const minutes =
    Math.floor(seconds / 60);

  const remainingSeconds =
    Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;

}


// Like Song

getElement("likeButton")
  .addEventListener("click", () => {

    if (!songs[currentIndex]) return;

    const songId = songs[currentIndex].id;

    if (likedSongs.includes(songId)) {

      likedSongs =
        likedSongs.filter(id => id !== songId);

    } else {

      likedSongs.push(songId);

    }

    localStorage.setItem(
      "likedSongs",
      JSON.stringify(likedSongs)
    );

    updateLikeButton(songId);

  });


// Update Like Button

function updateLikeButton(songId) {

  getElement("likeButton").innerText =
    likedSongs.includes(songId) ? "♥" : "♡";

}


// Recently Played

function displayRecentSongs() {

  recentList.innerHTML = "";

  recentSongs.slice(0, 5).forEach(song => {

    const item = document.createElement("div");

    item.className = "recent-item";

    item.innerHTML = `

      <img
        src="${song.cover}"
        alt="${song.title}">

      <div>

        <strong>${song.title}</strong>

        <p>${song.artist}</p>

      </div>

    `;

    item.addEventListener("click", () => {
      playSong(song.id);
    });

    recentList.appendChild(item);

  });

}


// Search Songs

searchInput.addEventListener("input", event => {

  const query =
    event.target.value.toLowerCase().trim();

  const filteredSongs =
    songs.filter(song =>

      song.title.toLowerCase().includes(query) ||

      song.artist.toLowerCase().includes(query) ||

      song.album.toLowerCase().includes(query)

    );

  displaySongs(filteredSongs);

});


// Create Playlist

getElement("createPlaylist")
  .addEventListener("click", () => {

    const playlistName =
      prompt("Enter playlist name:");

    if (playlistName && playlistName.trim()) {

      alert(
        `Playlist "${playlistName.trim()}" created locally!`
      );

    }

  });


// Start Application

loadSongs();