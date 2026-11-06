import { background, events, level, type Settings } from "./model.ts";
export class AudioEngine {
  ctx?: AudioContext;
  master?: GainNode;
  cache = new Map<string, AudioBuffer>();
  rendered = new Map<string, AudioBuffer>();
  tracks: {
    id: string;
    source: AudioBufferSourceNode;
    gain: GainNode;
    pan: StereoPannerNode;
    bg: boolean;
  }[] = [];
  playing = false;
  offset = 0;
  anchor = 0;
  settings: Settings;
  generation = 0;
  constructor(s: Settings) {
    this.settings = s;
    this.offset = s.position;
  }
  time() {
    if (!this.playing || !this.ctx) return this.offset;
    const t =
      this.offset + (this.ctx.currentTime - this.anchor) * this.settings.speed;
    return this.settings.loop ? t % 15 : Math.min(t, 15);
  }
  async unlock() {
    this.ctx ??= new AudioContext();
    this.master ??= this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    await this.ctx.resume();
  }
  async load(s: Settings) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    await Promise.all(
      [...s.env, background(s.env)].map(async (id) => {
        if (this.cache.has(id)) return;
        const r = await fetch(`${import.meta.env.BASE_URL}audio/${id}.mp3`);
        if (!r.ok) throw Error("audio");
        this.cache.set(id, await ctx.decodeAudioData(await r.arrayBuffer()));
      }),
    );
  }
  stop() {
    this.offset = this.time();
    this.playing = false;
    for (const t of this.tracks) {
      t.source.stop();
      t.source.disconnect();
      t.gain.disconnect();
      t.pan.disconnect();
    }
    this.tracks = [];
  }
  cancel() {
    this.generation++;
    this.stop();
  }
  seek(p: number) {
    const was = this.playing;
    this.stop();
    this.offset = p;
    if (was) this.start();
  }
  start() {
    if (!this.ctx || !this.master) return;
    const c = this.ctx;
    this.playing = true;
    this.master.gain.value = this.settings.volume * 0.4;
    for (const id of [...this.settings.env, background(this.settings.env)]) {
      const bg = id === background(this.settings.env),
        input = this.cache.get(id);
      if (!input) continue;
      let b = this.rendered.get(id);
      if (!b) {
        b = c.createBuffer(2, c.sampleRate * 15, c.sampleRate);
        const spans = bg
          ? [{ start: 0, duration: 15 }]
          : events(this.settings.env).filter((e) => e.id === id);
        for (let ch = 0; ch < 2; ch++) {
          const dst = b.getChannelData(ch),
            src = input.getChannelData(
              Math.min(ch, input.numberOfChannels - 1),
            );
          for (const e of spans) {
            const start = Math.floor(e.start * c.sampleRate),
              n = Math.floor(e.duration * c.sampleRate);
            for (let j = 0; j < n && start + j < dst.length; j++)
              dst[start + j] = src[j % src.length];
          }
        }
        this.rendered.set(id, b);
      }
      const source = c.createBufferSource(),
        gain = c.createGain(),
        pan = c.createStereoPanner();
      source.buffer = b;
      source.loop = this.settings.loop;
      source.playbackRate.value = this.settings.speed;
      gain.gain.value = level(id, this.settings, bg);
      source.connect(gain).connect(pan).connect(this.master);
      this.tracks.push({ id, source, gain, pan, bg });
    }
    this.anchor = c.currentTime;
    for (const t of this.tracks) t.source.start(this.anchor, this.offset);
    this.tick();
  }
  update(s: Settings) {
    if (s.env.join() !== this.settings.env.join()) this.rendered.clear();
    const speed =
      s.speed !== this.settings.speed || s.loop !== this.settings.loop;
    const p = this.time();
    this.settings = s;
    if (speed && this.playing) {
      this.offset = p;
      this.anchor = this.ctx!.currentTime;
    }
    if (this.master) this.master.gain.value = s.volume * 0.4;
    for (const t of this.tracks) {
      t.gain.gain.setValueAtTime(level(t.id, s, t.bg), this.ctx!.currentTime);
      t.source.playbackRate.value = s.speed;
      t.source.loop = s.loop;
    }
  }
  tick() {
    const p = this.time();
    this.tracks.forEach((t, i) => {
      t.pan.pan.value = t.bg ? 0 : Math.sin(p * 0.32 + i * 2) * 0.65;
    });
    if (this.playing && !this.settings.loop && p >= 15) {
      this.stop();
      this.offset = 15;
    }
    return p;
  }
}
