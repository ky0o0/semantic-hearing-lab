# Verification record

## Executed

- `npm run build`: TypeScript strict compilation and Vite production bundle.
- `npm test`: eight automated tests covering the exact 20-class inventory; bundled audio/provenance/envelope presence; saved-state sanitization and three-source limit; context-driven background selection; event overlap and bounds; multiple-target gain selection; translation-key parity and tutorial text counts; mode/target changes preserving source identity, clock and paused state; speed, seeking and loop-off after wrap.
- `ffprobe`: all 23 MP3s contain two channels and approximately five seconds of audio (including MP3 padding). Preparation decoded, normalized and measured every asset; envelopes are nonzero.
- The owner created the GitHub repository and enabled Pages with GitHub Actions. Pushing the complete project to `main` succeeded.
- GitHub Actions has independently passed dependency installation, all eight tests, and the production build.

## Not verified

No browser-interaction tool was exposed, so these require real-browser acceptance testing before declaring full completion:

1. At desktop/tablet/phone widths, confirm three equal waveform panels, readable controls, no horizontal overflow, mobile panel and fixed player.
2. Start paused; play the default dog/birds/speech scene. Switch SH off and on while playing and paused. Confirm audio changes immediately and progress does not reset.
3. Select multiple targets, no targets, and targets absent from the scene. Confirm no absent class is generated; compare sound recognizability with the labels, especially synthesized singing.
4. Scrub, loop across 15 seconds, disable looping, vary speed and volume. Check sound events align with envelope changes and cursor.
5. Zoom 1–16×, drag, pinch with two fingers, toggle follow, hide/show each row. Confirm fixed amplitude scale and synchronous viewport.
6. Click event markers; confirm seeking pauses and keeps targets.
7. Change environment; confirm max three classes, automatic background, pause and reset to zero.
8. Run all four tutorial steps manually. Exit early and finish; verify restoration of the original settings and position, without autoplay.
9. Change all three languages; refresh after changing preferences and position. Confirm restoration without autoplay.
10. Test interrupted/failed audio fetches and retry, mobile AudioContext unlock, and headphones stereo movement.
11. After a deployment, check the GitHub Actions result, public Pages URL and audio paths.

The test suite mocks Web Audio timing and nodes. It does not claim to validate browser playback, subjective audio quality or mobile gestures.
