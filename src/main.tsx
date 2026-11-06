import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  defaults,
  sanitize,
  sounds,
  name,
  background,
  type Settings,
  type Lang,
} from "./model";
import { translations } from "./i18n";
import { AudioEngine } from "./audio";
import { Waves, type Envelopes } from "./Waves";
import "./style.css";
function load() {
  try {
    return sanitize(JSON.parse(localStorage.getItem("sh-lab-v1") || "{}"));
  } catch {
    return { ...defaults };
  }
}
function App() {
  const [s, setS] = useState<Settings>(load),
    ref = useRef(s),
    engine = useRef<AudioEngine | null>(null);
  engine.current ??= new AudioEngine(s);
  const a = engine.current;
  const [time, setTime] = useState(s.position),
    [playing, setPlaying] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(false),
    [all, setAll] = useState(false),
    [panel, setPanel] = useState(false),
    [step, setStep] = useState<number | null>(null),
    saved = useRef<Settings | null>(null),
    [envs, setEnvs] = useState<Envelopes>({});
  const t = translations[s.lang];
  ref.current = s;
  function patch(v: Partial<Settings>) {
    setS((old) => {
      const next = { ...old, ...v };
      a.update(next);
      return next;
    });
  }
  function pause() {
    a.cancel();
    setLoading(false);
    setPlaying(false);
    setTime(a.time());
    patch({ position: a.time() });
  }
  function seek(p: number, stop = false) {
    if (stop) pause();
    a.seek(p);
    setTime(p);
    patch({ position: p });
  }
  function environment(id: string) {
    if (!s.env.includes(id) && s.env.length >= 3) return;
    pause();
    const env = s.env.includes(id)
      ? s.env.filter((x) => x !== id)
      : [...s.env, id];
    a.offset = 0;
    setTime(0);
    patch({ env, position: 0, pan: 0 });
  }
  async function play() {
    if (playing) {
      pause();
      return;
    }
    const generation = ++a.generation;
    setLoading(true);
    setError(false);
    try {
      await a.unlock();
      await a.load(ref.current);
      if (generation !== a.generation) return;
      if (a.offset >= 15) a.offset = 0;
      a.update(ref.current);
      a.start();
      setPlaying(true);
    } catch {
      if (generation === a.generation) setError(true);
    } finally {
      if (generation === a.generation) setLoading(false);
    }
  }
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}audio/envelopes.json`)
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then(setEnvs)
      .catch(() => setError(true));
  }, []);
  useEffect(() => {
    document.documentElement.lang = { zh: "zh-CN", en: "en", ja: "ja" }[s.lang];
    try {
      localStorage.setItem(
        "sh-lab-v1",
        JSON.stringify(step === null ? s : saved.current),
      );
    } catch {}
  }, [s, step]);
  useEffect(() => {
    let frame: number,
      lastSave = 0;
    function tick() {
      const p = a.tick();
      if (a.playing) {
        setTime(p);
        if (ref.current.follow && ref.current.zoom > 1) {
          const d = 15 / ref.current.zoom;
          if (p < ref.current.pan || p > ref.current.pan + d * 0.85)
            patch({ pan: Math.max(0, Math.min(15 - d, p - d * 0.2)) });
        }
        if (performance.now() - lastSave > 1000) {
          lastSave = performance.now();
          patch({ position: p });
        }
      } else if (playing) {
        setPlaying(false);
        setTime(p);
        patch({ position: p });
      }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);
  useEffect(() => {
    const save = () => {
      try {
        localStorage.setItem(
          "sh-lab-v1",
          JSON.stringify(
            saved.current || { ...ref.current, position: a.time() },
          ),
        );
      } catch {}
    };
    window.addEventListener("pagehide", save);
    return () => window.removeEventListener("pagehide", save);
  }, []);
  function tutorial(n: number) {
    if (step === null) saved.current = { ...s, position: a.time() };
    pause();
    a.offset = 0;
    setTime(0);
    setStep(n);
    patch({
      env: [...defaults.env],
      targets: n === 0 ? [...defaults.env] : ["dog"],
      sh: n !== 3,
      position: 0,
      zoom: 1,
      pan: 0,
      visible: [true, true, true],
    });
    if (n === 1) setPanel(true);
  }
  function exit() {
    pause();
    if (saved.current) {
      const restore = saved.current;
      a.offset = restore.position;
      a.update(restore);
      setS(restore);
      setTime(restore.position);
    }
    saved.current = null;
    setStep(null);
  }
  const toggle = (id: string) =>
    patch({
      targets: s.targets.includes(id)
        ? s.targets.filter((x) => x !== id)
        : [...s.targets, id],
    });
  return (
    <>
      <header>
        <a className="brand" href="#">
          <span className="brand-icon">≋</span>
          <span>
            Semantic Hearing<small>{t.lab}</small>
          </span>
        </a>
        <div className="header-right">
          <span className="headphones">◉ {t.headphones}</span>
          <select
            aria-label={t.language}
            value={s.lang}
            onChange={(e) => patch({ lang: e.target.value as Lang })}
          >
            <option value="zh">简体中文</option>
            <option value="en">English</option>
            <option value="ja">日本語</option>
          </select>
        </div>
      </header>
      <main>
        <section className="intro">
          <div>
            <div className="eyebrow">
              <span /> {t.tag}
            </div>
            <h1>{t.title}</h1>
            <p>{t.intro}</p>
            <details className="explanation">
              <summary>{t.how}</summary>
              <p>{t.explain}</p>
              <a
                href="https://semantichearing.cs.washington.edu/"
                target="_blank"
                rel="noreferrer"
              >
                {t.source}
              </a>
            </details>
          </div>
          <button
            className="tutorial-start"
            onClick={() => tutorial(0)}
            disabled={step !== null}
          >
            {t.tutorial} <span>↗</span>
          </button>
        </section>
        {step !== null && (
          <section className="tutorial" aria-live="polite">
            <div>
              <small>
                {t.step} {step + 1} / 4
              </small>
              <h2>{t.steps[step]}</h2>
              <p>{t.lessons[step]}</p>
              <small>{t.tutorialHint}</small>
            </div>
            <div className="tutorial-actions">
              <button onClick={exit}>{t.exit}</button>
              <button disabled={step === 0} onClick={() => tutorial(step - 1)}>
                {t.previous}
              </button>
              <button
                className="primary"
                onClick={() => (step === 3 ? exit() : tutorial(step + 1))}
              >
                {step === 3 ? t.done : t.next}
              </button>
            </div>
          </section>
        )}
        <div className="lab">
          <section className="visual">
            <div className="section-head">
              <div>
                <span className="eyebrow">01 / {t.free}</span>
                <h2>{t.lab}</h2>
              </div>
              <span className="mode-pill">
                {s.sh ? "SEMANTIC HEARING" : "ANC"}
              </span>
            </div>
            <Waves
              s={s}
              time={time}
              envs={envs}
              step={step}
              patch={patch}
              seek={(p) => seek(p, true)}
            />
            <p className="notice">ⓘ {t.simulation}</p>
          </section>
          <aside>
            <button
              className="mobile-toggle"
              aria-expanded={panel}
              onClick={() => setPanel(!panel)}
            >
              {t.controls} {panel ? "−" : "+"}
            </button>
            <div className={`settings ${panel ? "expanded" : ""}`}>
              <section>
                <div className="section-head">
                  <h2>{t.scene}</h2>
                  <span className="count">{s.env.length} / 3</span>
                </div>
                <p>{t.sceneHint}</p>
                <div className="sound-grid">
                  {sounds.map(([id, , , , icon]) => (
                    <button
                      key={id}
                      className={s.env.includes(id) ? "selected" : ""}
                      aria-pressed={s.env.includes(id)}
                      disabled={!s.env.includes(id) && s.env.length >= 3}
                      onClick={() => environment(id)}
                    >
                      <span>{icon}</span>
                      {name(id, s.lang)}
                    </button>
                  ))}
                </div>
                <div className="background">
                  <span>{t.bg}</span>
                  <strong>{t[background(s.env)]}</strong>
                </div>
              </section>
              <section
                className={
                  step === 1 ? "target-section highlight" : "target-section"
                }
              >
                <div className="section-head">
                  <h2>{t.target}</h2>
                  <span className="target-symbol">◎</span>
                </div>
                <p>{t.targetHint}</p>
                <div className="target-list">
                  {(all ? sounds.map((x) => x[0]) : s.env).map((id) => (
                    <label
                      key={id}
                      className={s.targets.includes(id) ? "chosen" : ""}
                    >
                      <input
                        type="checkbox"
                        checked={s.targets.includes(id)}
                        onChange={() => toggle(id)}
                      />
                      <span>{name(id, s.lang)}</span>
                      {!s.env.includes(id) && <small>{t.absent}</small>}
                    </label>
                  ))}
                </div>
                <button className="text-button" onClick={() => setAll(!all)}>
                  {all ? t.less : t.all} {all ? "−" : "+"}
                </button>
                {s.sh && !s.env.some((id) => s.targets.includes(id)) && (
                  <p>{t.empty}</p>
                )}
              </section>
            </div>
          </aside>
        </div>
        <section className="player">
          <button
            className="play primary"
            disabled={loading}
            onClick={play}
            aria-label={playing ? t.pause : t.play}
          >
            {playing ? "Ⅱ" : "▶"} <span>{playing ? t.pause : t.play}</span>
          </button>
          <span className="time">
            0:{Math.floor(time).toString().padStart(2, "0")}{" "}
            <small>/ 0:15</small>
          </span>
          <input
            className="progress"
            aria-label={t.position}
            type="range"
            min="0"
            max="15"
            step=".01"
            value={time}
            onChange={(e) => seek(+e.target.value)}
          />
          <button
            className={`sh-switch ${s.sh ? "active" : ""}`}
            role="switch"
            aria-checked={s.sh}
            onClick={() => patch({ sh: !s.sh })}
          >
            <span className="switch-track">
              <i />
            </span>
            {s.sh ? t.on : t.off}
          </button>
          <div className="player-options">
            <label>
              <input
                type="checkbox"
                checked={s.loop}
                onChange={(e) => patch({ loop: e.target.checked })}
              />
              {t.loop}
            </label>
            <label>
              {t.speed}{" "}
              <select
                value={s.speed}
                onChange={(e) => patch({ speed: +e.target.value })}
              >
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((x) => (
                  <option key={x} value={x}>
                    {x}×
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t.volume}
              <input
                aria-label={t.volume}
                type="range"
                min="0"
                max="1"
                step=".01"
                value={s.volume}
                onChange={(e) => patch({ volume: +e.target.value })}
              />
            </label>
          </div>
        </section>
        {(loading || error) && (
          <div className="status" role="status">
            {loading ? t.loading : t.error}
            {error && <button onClick={play}>{t.retry}</button>}
          </div>
        )}
        <footer>
          <span>
            {t.footer}
            <br />
            <small>{t.synth}</small>
          </span>
          <a
            href={`${import.meta.env.BASE_URL}audio/sources.json`}
            target="_blank"
            rel="noreferrer"
          >
            {t.credits} ↗
          </a>
          <a
            href="https://semantichearing.cs.washington.edu/"
            target="_blank"
            rel="noreferrer"
          >
            {t.source}
          </a>
        </footer>
      </main>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
