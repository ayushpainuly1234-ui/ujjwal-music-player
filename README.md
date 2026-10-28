# Ujjwal Music Player

A responsive, browser-based music player built with **HTML, CSS, and vanilla JavaScript**. It plays a small playlist of local audio files and provides the core controls needed for a lightweight listening experience.

> **Project status:** Frontend project. A public live demo has not been configured yet. Run it locally using the steps below.

## Features

- Play and pause tracks from the playlist.
- Move to the next or previous track, including wrapping around the playlist.
- Search/filter the visible song list by title.
- View the current track name and playback progress.
- Seek through a track using the progress control.
- Responsive layout for desktop and mobile-sized screens.
- Local audio assets; no backend or external API is required.

## Tech stack

- HTML5 — page structure and audio elements
- CSS3 — responsive layout and styling
- JavaScript — playlist state, audio controls, search and progress updates
- HTML Audio API — playback and media events

## Run locally

No package installation or build step is needed.

1. Clone or download this repository.
2. Open a terminal in the repository root.
3. Start a static file server. For example, with Python:

   ```bash
   python -m http.server 8000
   ```

4. Open [http://localhost:8000](http://localhost:8000) in your browser.

You can also open `index.html` directly, but a local server is the more reliable option for browser testing. Make sure the audio files under `songs/` remain in place so the relative media paths resolve.

## Project structure

```text
ujjwal-music-player/
├── index.html       # Main player page
├── style.css        # Main responsive styles
├── script.js        # Playlist and playback controls
├── songs/           # Local audio assets used by the main page
├── fullstack/       # Separate experimental version
└── songs/leetcode/  # Separate page/experiment
```

The main application is the set of root-level `index.html`, `style.css`, and `script.js` files. The nested folders contain separate versions and are not required to run the main page.

## Manual verification checklist

This repository does not currently include an automated test suite. Before presenting a change as verified, check it in a browser:

- [ ] A track starts and pauses with the expected controls.
- [ ] Starting a different track pauses the previously playing track.
- [ ] Next and previous buttons switch tracks and wrap at the ends.
- [ ] Search filters track cards without breaking playback controls.
- [ ] The progress indicator updates during playback and seeking works.
- [ ] The layout remains usable on a narrow screen.

## Possible next improvements

- Add automated tests for playlist state and control behavior.
- Improve keyboard navigation and screen-reader labels.
- Add explicit loading/error feedback for missing or unsupported audio files.
- Publish a live demo and add a screenshot after verifying it in a browser.
- Review audio asset licensing before distributing the repository publicly.

## Author

**Ujjwal Painuly** · [GitHub profile](https://github.com/ayushpainuly1234-ui)

---

This project is for learning and portfolio demonstration. Only distribute audio assets that you have permission to share.
