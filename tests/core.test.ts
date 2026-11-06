import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import {
  defaults,
  ids,
  sanitize,
  background,
  events,
  level,
} from "../src/model.ts";
import { AudioEngine } from "../src/audio.ts";
import { translations } from "../src/i18n.ts";
test("All 20 research classes have audio, envelopes, translations and provenance", () => {
  assert.equal(ids.length, 20);
  assert.equal(new Set(ids).size, 20);
  const credits = JSON.parse(readFileSync("public/audio/sources.json", "utf8"));
  const env = JSON.parse(readFileSync("public/audio/envelopes.json", "utf8"));
  for (const id of [...ids, "outdoor", "street", "room"]) {
    assert.ok(existsSync(`public/audio/${id}.mp3`));
    assert.ok(credits.find((c) => c.id === id && c.license && c.source));
    assert.equal(env[id].length, 100);
    assert.ok(env[id].some((x) => x > 0.001));
  }
});
test("Persisted state is constrained and corrupt settings are rejected", () => {
  const s = sanitize({
    env: [...ids, "invalid"],
    targets: ["invalid", "dog", "dog"],
    zoom: 20,
    position: 100,
    volume: -1,
    visible: [true],
  });
  assert.equal(s.env.length, 3);
  assert.deepEqual(s.targets, ["dog"]);
  assert.equal(s.zoom, 16);
  assert.equal(s.position, 15);
  assert.equal(s.volume, 0);
  assert.deepEqual(s.visible, [true, true, true]);
});
test("Background selection follows scene semantics", () => {
  assert.equal(background(defaults.env), "outdoor");
  assert.equal(background(["car_horn", "speech"]), "street");
  assert.equal(background(["computer_typing", "music"]), "room");
});
test("Events overlap, are bounded, and cannot create absent targets", () => {
  const ev = events(defaults.env);
  assert.equal(ev.length, 6);
  assert.ok(ev.every((e) => e.start + e.duration <= 15));
  assert.ok(ev[0].start + ev[0].duration > ev[2].start);
  assert.ok(!ev.some((e) => e.id === "cat"));
});
test("ANC attenuates background; SH retains multiple existing targets", () => {
  const s = { ...defaults, targets: ["dog", "speech", "cat"] };
  assert.equal(level("dog", s), 1);
  assert.equal(level("speech", s), 1);
  assert.equal(level("birds_chirping", s), 0.035);
  assert.equal(level("dog", { ...s, sh: false }), 0.8);
  assert.equal(level("", { ...s, sh: false }, true), 0.28);
});
test("Translations have complete parity and four tutorial steps", () => {
  for (const l of ["zh", "en", "ja"] as const) {
    assert.deepEqual(
      Object.keys(translations[l]),
      Object.keys(translations.zh),
    );
    assert.ok(
      Object.values(translations[l]).every((v) =>
        Array.isArray(v) ? v.length === 4 : v.length > 0,
      ),
    );
  }
});
function mock() {
  const param = () => ({
    value: 0,
    setValueAtTime(v: number) {
      this.value = v;
    },
  });
  const node = () => ({
    connect(n: unknown) {
      return n;
    },
    disconnect() {},
  });
  return {
    currentTime: 0,
    sampleRate: 100,
    destination: {},
    createGain: () => ({ ...node(), gain: param() }),
    createStereoPanner: () => ({ ...node(), pan: param() }),
    createBuffer: (_: number, n: number) => ({
      getChannelData: () => new Float32Array(n),
    }),
    createBufferSource: () => ({
      ...node(),
      playbackRate: param(),
      startAt: -1,
      start(at: number) {
        this.startAt = at;
      },
      stop() {},
    }),
  };
}
test("Playing mode and target changes preserve clock and source nodes", () => {
  const a = new AudioEngine({ ...defaults });
  a.ctx = mock() as any;
  a.master = a.ctx.createGain();
  for (const id of [...defaults.env, "outdoor"])
    a.cache.set(id, {
      numberOfChannels: 2,
      getChannelData: () => new Float32Array(500).fill(0.1),
    } as any);
  a.start();
  a.ctx.currentTime = 3 as any;
  const nodes = a.tracks.map((t) => t.source);
  a.update({ ...defaults, sh: false });
  assert.equal(a.time(), 3);
  assert.ok(a.playing);
  assert.deepEqual(
    a.tracks.map((t) => t.source),
    nodes,
  );
  assert.equal(a.tracks[0].gain.gain.value, 0.8);
  a.update({ ...defaults, targets: ["dog", "speech"] });
  assert.equal(a.time(), 3);
  assert.equal(a.tracks[2].gain.gain.value, 1);
  a.stop();
  a.update({ ...defaults, sh: false });
  assert.equal(a.time(), 3);
  assert.equal(a.playing, false);
});
test("Speed changes, loop-off after a wrap, and seek preserve timeline semantics", () => {
  const a = new AudioEngine({ ...defaults });
  a.ctx = mock() as any;
  a.master = a.ctx.createGain();
  a.start();
  a.ctx.currentTime = 17 as any;
  assert.equal(a.time(), 2);
  a.update({ ...defaults, loop: false });
  assert.equal(a.time(), 2);
  a.ctx.currentTime = 18 as any;
  assert.equal(a.time(), 3);
  a.update({ ...defaults, loop: false, speed: 2 });
  a.ctx.currentTime = 19 as any;
  assert.equal(a.time(), 5);
  a.seek(7);
  assert.equal(a.time(), 7);
  a.stop();
  assert.equal(a.time(), 7);
});
