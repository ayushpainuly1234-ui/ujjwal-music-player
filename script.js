// ===============================
// PLAYLIST
// ===============================

const playlist = [
    {
        title: "The Fat Rat",
        src: "songs/song.mp3"
    },
    {
        title: "Infinity",
        src: "songs/song2.mp3"
    },
    {
        title: "Middle of the Night",
        src: "songs/song3.mp3"
    }
];
let currentSong = 0;


// ===============================
// ELEMENTS
// ===============================

let search = document.getElementById("search");
let songs = document.getElementsByClassName("songitem");

let nextBtn = document.getElementById("nextBtn");
let prevBtn = document.getElementById("prevBtn");
let mainPlayBtn = document.getElementById("mainPlayBtn");

let progressBar = document.getElementById("progressBar");
let currentTime = document.getElementById("currentTime");
let duration = document.getElementById("duration");
let currentSongName = document.getElementById("currentSongName");


// ===============================
// GET AUDIO
// ===============================

function getAudio(index) {
    return document.getElementById("song" + (index + 1));
}


// ===============================
// GET PLAY BUTTON
// ===============================

function getPlayButton(index) {

    if (index === 0) {
        return document.getElementById("playBtn");
    }

    return document.getElementById("playBtn" + (index + 1));
}


// ===============================
// UPDATE ALL PLAY BUTTONS
// ===============================

function updateButtons() {

    for (let i = 0; i < playlist.length; i++) {

        let audio = getAudio(i);
        let button = getPlayButton(i);

        if (audio && button) {

            if (audio.paused) {
                button.innerText = "▶";
            } else {
                button.innerText = "⏸";
            }
        }
    }

    // Main player button
    let audio = getAudio(currentSong);

    if (mainPlayBtn && audio) {

        if (audio.paused) {
            mainPlayBtn.innerText = "▶";
        } else {
            mainPlayBtn.innerText = "⏸";
        }
    }
}


// ===============================
// UPDATE SONG NAME
// ===============================

function updateSongName(index) {

    if (currentSongName) {
        currentSongName.innerText =
            playlist[index].title;
    }
}


// ===============================
// PLAY / PAUSE SONG
// ===============================

function playsong(index = 0) {

    let audio = getAudio(index);

    if (!audio) {
        return;
    }


    // Same song already playing
    if (!audio.paused) {

        audio.pause();

        updateButtons();

        return;
    }


    // Pause all other songs
    for (let i = 0; i < playlist.length; i++) {

        let otherAudio = getAudio(i);

        if (otherAudio && otherAudio !== audio) {
            otherAudio.pause();
            otherAudio.currentTime = 0;
        }
    }


    // Current song
    currentSong = index;

    updateSongName(index);


    // Play
    audio.play();

    updateButtons();
}


// ===============================
// SONG 2
// ===============================

function playsong2() {
    playsong(1);
}


// ===============================
// SONG 3
// ===============================

function playsong3() {
    playsong(2);
}


// ===============================
// SEARCH
// ===============================

if (search) {

    search.addEventListener("input", function () {

        let value =
            search.value.toLowerCase();


        for (let i = 0; i < songs.length; i++) {

            let songName =
                songs[i].innerText.toLowerCase();


            if (songName.includes(value)) {

                songs[i].style.display = "flex";

            } else {

                songs[i].style.display = "none";
            }
        }
    });
}


// ===============================
// NEXT SONG
// ===============================

nextBtn.addEventListener("click", function () {

    let oldAudio = getAudio(currentSong);

    if (oldAudio) {
        oldAudio.pause();
        oldAudio.currentTime = 0;
    }


    currentSong++;


    if (currentSong >= playlist.length) {
        currentSong = 0;
    }


    playsong(currentSong);
});


// ===============================
// PREVIOUS SONG
// ===============================

prevBtn.addEventListener("click", function () {

    let oldAudio = getAudio(currentSong);

    if (oldAudio) {
        oldAudio.pause();
        oldAudio.currentTime = 0;
    }


    currentSong--;


    if (currentSong < 0) {
        currentSong = playlist.length - 1;
    }


    playsong(currentSong);
});


// ===============================
// MAIN PLAY BUTTON
// ===============================

mainPlayBtn.addEventListener("click", function () {

    playsong(currentSong);
});


// ===============================
// PROGRESS UPDATE
// ===============================

function updateProgress() {

    let audio = getAudio(currentSong);

    if (!audio) {
        return;
    }


    if (audio.duration) {

        let progress =
            (audio.currentTime / audio.duration) * 100;

        progressBar.value = progress;
    }


    // Current time
    let minutes =
        Math.floor(audio.currentTime / 60);

    let seconds =
        Math.floor(audio.currentTime % 60);

    if (seconds < 10) {
        seconds = "0" + seconds;
    }

    currentTime.innerText =
        minutes + ":" + seconds;


    // Duration
    if (audio.duration) {

        let totalMinutes =
            Math.floor(audio.duration / 60);

        let totalSeconds =
            Math.floor(audio.duration % 60);

        if (totalSeconds < 10) {
            totalSeconds =
                "0" + totalSeconds;
        }

        duration.innerText =
            totalMinutes + ":" + totalSeconds;
    }
}


// ===============================
// PROGRESS BAR SEEKING
// ===============================

progressBar.addEventListener("input", function () {

    let audio = getAudio(currentSong);

    if (audio && audio.duration) {

        audio.currentTime =
            (progressBar.value / 100) *
            audio.duration;
    }
});


// ===============================
// AUDIO EVENTS
// ===============================

for (let i = 0; i < playlist.length; i++) {

    let audio = getAudio(i);

    if (!audio) {
        continue;
    }


    // Playlist source set from JS
    audio.src = playlist[i].src;


    audio.addEventListener("play", function () {
        updateButtons();
    });


    audio.addEventListener("pause", function () {
        updateButtons();
    });


    audio.addEventListener("timeupdate", function () {
        updateProgress();
    });


    audio.addEventListener("loadedmetadata", function () {
        updateProgress();
    });


    // Song finished
    audio.addEventListener("ended", function () {

        currentSong++;

        if (currentSong >= playlist.length) {
            currentSong = 0;
        }

        playsong(currentSong);
    });
}


// ===============================
// INITIAL BUTTON STATE
// ===============================

updateButtons();