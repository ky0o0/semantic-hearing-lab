# Semantic Hearing Interactive Lab

A standalone React / TypeScript / Vite educational simulation of semantic hearing, inspired by [Vistep Noise](https://vistep.ai/explore/noise/) and the [University of Washington research](https://semantichearing.cs.washington.edu/). No neural model, server, or database is used.

## Run

Node 22.18+ is recommended.

```sh
npm ci
npm run dev
npm test
npm run build
```

## Features

- Simplified Chinese (default), English and Japanese; localized controls, classes, explanations and four tutorial steps.
- All 20 original research classes, verified against [Classes.yaml](https://github.com/vb000/SemanticHearing/blob/main/data/Classes.yaml) and the official `curated_binaural.py` class list. At most three simultaneous environment classes, with automatically selected outdoor, street or room background.
- Independent stereo assets loaded only when the selected scene is played. Targets absent from the environment never produce sound.
- A 15-second shared Web Audio clock; smooth illustrative RMS-envelope waveforms, synchronized events, scanner, seeking, looping, speed and volume.
- ANC simulation retains prominent sources while attenuating background. SH simulation retains selected classes and strongly attenuates other sources. Switching gains preserves sources, time and play/pause state without crossfades.
- Shared 1–16× horizontal zoom, drag and pinch, pan slider, follow toggle, independent visibility, fixed amplitude scale.
- Manual four-step tutorial with settings snapshot/restore. No autoplay, including refresh and tutorial entry.
- Local storage for preferences and position; mobile collapsible settings and fixed player.

## Research and interpretation

Veluri et al., *Semantic Hearing: Programming Acoustic Scenes with Binaural Hearables*, UIST 2023, DOI [10.1145/3586183.3606779](https://doi.org/10.1145/3586183.3606779).

The research uses a neural network for binaural target extraction while preserving spatial cues. This lab simply mixes known tracks with deterministic gains. ANC is deliberately simplified to background attenuation; it does not model acoustics or phase cancellation. The contrast is exaggerated for teaching. Waveforms are smoothed envelope illustrations, not measured microphone or model outputs. Speed changes also change pitch. Panning illustrates direction, not a calibrated binaural HRTF.

## Audio and licensing

All 20 target assets and three background assets are included in `public/audio`. Exact sources, authors, licenses and modifications are in [sources.json](public/audio/sources.json). Original ESC-50 attribution text is retained in [ESC50-LICENSE.txt](public/audio/ESC50-LICENSE.txt).

- 15 environmental recordings selected from ESC-50, prioritizing CC0 original recordings. The ESC-50 compilation is CC BY-NC 3.0; retain that noncommercial restriction for these derived dataset clips.
- Speech: *Ashiel Mystery*, chapter 2, narrated by Garth Comira, LibriSpeech 5703-47212-0000, CC BY 4.0, served by librosa.
- Hammer, gunshot, music, singing and three backgrounds: original procedural synthesis, dedicated under CC0-1.0. Singing is an explicitly artificial, formant-synthesized wordless melody, not a natural vocalist recording.

Assets are normalized and exported as stereo MP3; the browser adds moving stereo placement. Each source is five seconds; the engine places excerpts at documented event times in a 15-second buffer. `scripts/prepare_audio.py` reproduces assets with Python, numpy, ffmpeg and network access. This noncommercial educational distribution includes audio under the licenses above; the code license does not override them.

## GitHub Pages deployment

Repository: https://github.com/ky0o0/semantic-hearing-lab

The repository owner created the repository and the project has been pushed to `main`. Enabling Pages through the current integration returned HTTP 403 (`Resource not accessible by integration`). The owner must select **GitHub Actions** under repository **Settings → Pages → Build and deployment → Source**.

The included workflow tests and builds on pushes to `main`, then uploads and deploys `dist`. It can also be started manually from Actions. Vite's relative base supports project Pages paths. Check the deployment job's URL and actual public HTTP response before reporting deployment success.

## Verification and limitations

See [TESTING.md](TESTING.md). Unit tests validate the state model and audio-clock/gain contracts using a mocked AudioContext; they are not a substitute for real browser or auditory tests. No usable browser-interaction tool was available in the task environment, so desktop/mobile interaction, touch gestures, tutorial flow and subjective recognition remain unverified. Public GitHub Pages verification is pending Pages enablement by the repository owner.
