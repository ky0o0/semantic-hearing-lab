import { useRef } from "react";
import { events, background, level, name, type Settings } from "./model";
import { translations } from "./i18n";
export type Envelopes = Record<string, number[]>;
export function Waves({
  s,
  time,
  envs,
  step,
  patch,
  seek,
}: {
  s: Settings;
  time: number;
  envs: Envelopes;
  step: number | null;
  patch: (v: Partial<Settings>) => void;
  seek: (p: number) => void;
}) {
  const t = translations[s.lang],
    duration = 15 / s.zoom,
    start = Math.min(s.pan, 15 - duration),
    pts = useRef(new Map<number, number>()),
    gesture = useRef({ x: 0, pan: 0, zoom: 1, distance: 0 });
  const ev = events(s.env);
  const titles = [t.environment, s.sh ? t.sh : t.anc, t.hear],
    subs = [t.envSub, s.sh ? t.shSub : t.ancSub, t.hearSub];
  function envelope(id: string, p: number) {
    const a = envs[id];
    if (!a) return 0;
    const at = ((p % 5) / 5) * a.length;
    const i = Math.floor(at);
    return (
      ((a[i] || 0) * (1 - at + i) +
        (a[Math.min(i + 1, a.length - 1)] || 0) * (at - i)) *
      2.8
    );
  }
  function value(p: number, row: number) {
    let a =
      envelope(background(s.env), p) * (row === 0 ? 0.32 : level("", s, true));
    for (const e of ev)
      if (p >= e.start && p < e.start + e.duration)
        a += envelope(e.id, p - e.start) * (row === 0 ? 1 : level(e.id, s));
    const carrier = Math.sin(p * 16) + 0.28 * Math.sin(p * 29 + 0.8);
    return Math.min(0.85, a) * carrier * 34;
  }
  return (
    <>
      <div className="wave-tools">
        <label>
          {t.zoom}{" "}
          <select
            aria-label={t.zoom}
            value={s.zoom}
            onChange={(e) =>
              patch({
                zoom: +e.target.value,
                pan: Math.min(start, 15 - 15 / +e.target.value),
              })
            }
          >
            {![1, 2, 4, 8, 16].includes(s.zoom) && (
              <option value={s.zoom}>{s.zoom.toFixed(1)}</option>
            )}
            {[1, 2, 4, 8, 16].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          ×
        </label>
        <label>
          <input
            type="checkbox"
            checked={s.follow}
            onChange={(e) => patch({ follow: e.target.checked })}
          />
          {t.follow}
        </label>
        <details>
          <summary>{t.show}</summary>
          <div className="visibility">
            {titles.map((title, i) => (
              <label key={i}>
                <input
                  type="checkbox"
                  checked={s.visible[i]}
                  onChange={(e) =>
                    patch({
                      visible: s.visible.map((v, j) =>
                        j === i ? e.target.checked : v,
                      ),
                    })
                  }
                />
                {title}
              </label>
            ))}
          </div>
        </details>
      </div>
      <div
        className="wave-stack"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          pts.current.set(e.pointerId, e.clientX);
          const xs = [...pts.current.values()];
          gesture.current = {
            x: e.clientX,
            pan: start,
            zoom: s.zoom,
            distance: xs.length === 2 ? Math.abs(xs[1] - xs[0]) : 0,
          };
        }}
        onPointerMove={(e) => {
          if (!pts.current.has(e.pointerId)) return;
          pts.current.set(e.pointerId, e.clientX);
          const xs = [...pts.current.values()];
          if (xs.length === 2 && gesture.current.distance) {
            const z = Math.max(
              1,
              Math.min(
                16,
                (gesture.current.zoom * Math.abs(xs[1] - xs[0])) /
                  gesture.current.distance,
              ),
            );
            patch({
              zoom: z,
              pan: Math.min(start, 15 - 15 / z),
              follow: false,
            });
          } else if (xs.length === 1) {
            patch({
              pan: Math.max(
                0,
                Math.min(
                  15 - duration,
                  gesture.current.pan -
                    ((e.clientX - gesture.current.x) /
                      e.currentTarget.clientWidth) *
                      duration,
                ),
              ),
              follow: false,
            });
          }
        }}
        onPointerUp={(e) => pts.current.delete(e.pointerId)}
        onPointerCancel={() => pts.current.clear()}
      >
        <div className="event-header">{t.events}</div>
        <div className="events">
          {ev.map((e, i) => {
            const left = ((e.start - start) / duration) * 100;
            return left >= 0 && left <= 100 ? (
              <button
                key={i}
                style={{
                  left: `${left}%`,
                  top: `${s.env.indexOf(e.id) * 24}px`,
                }}
                onClick={() => seek(e.start)}
                title={`${name(e.id, s.lang)} · ${e.start.toFixed(1)}s`}
              >
                {soundsIcon(e.id)} {name(e.id, s.lang)}
              </button>
            ) : null;
          })}
        </div>
        {titles.map(
          (title, row) =>
            s.visible[row] && (
              <section
                key={row}
                className={`wave row-${row} ${(step === 0 && row === 0) || (step === 2 && row === 1) || (step === 3 && row === 2) ? "highlight" : ""}`}
              >
                <div className="wave-heading">
                  <strong>
                    <span className="dot" />
                    {title}
                  </strong>
                  <small>{subs[row]}</small>
                  <span className="row-number">0{row + 1}</span>
                </div>
                <svg
                  viewBox="0 0 900 110"
                  preserveAspectRatio="none"
                  role="img"
                  aria-label={title}
                >
                  <defs>
                    <linearGradient id={`scan${row}`}>
                      <stop stopColor="currentColor" stopOpacity="0" />
                      <stop
                        offset="1"
                        stopColor="currentColor"
                        stopOpacity=".12"
                      />
                    </linearGradient>
                  </defs>
                  {Array.from({ length: 7 }, (_, i) => (
                    <line
                      key={i}
                      x1={i * 150}
                      x2={i * 150}
                      y1="0"
                      y2="110"
                      className="grid"
                    />
                  ))}
                  <line x1="0" x2="900" y1="55" y2="55" className="grid" />
                  <path
                    d={Array.from(
                      { length: 901 },
                      (_, i) =>
                        `${i ? "L" : "M"}${i},${55 - value(start + (i / 900) * duration, row)}`,
                    ).join(" ")}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    vectorEffect="non-scaling-stroke"
                  />
                  {time >= start && time <= start + duration && (
                    <>
                      <rect
                        x={((time - start) / duration) * 900 - 65}
                        width="65"
                        height="110"
                        fill={`url(#scan${row})`}
                      />
                      <line
                        x1={((time - start) / duration) * 900}
                        x2={((time - start) / duration) * 900}
                        y1="0"
                        y2="110"
                        stroke="currentColor"
                        opacity=".6"
                      />
                    </>
                  )}
                </svg>
              </section>
            ),
        )}
        <div className="ruler">
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i}>{(start + (i * duration) / 6).toFixed(1)}s</span>
          ))}
        </div>
      </div>
      <label className="pan">
        {t.pan}
        <input
          aria-label={t.pan}
          type="range"
          min="0"
          max={15 - duration}
          step=".01"
          value={start}
          disabled={s.zoom === 1}
          onChange={(e) => patch({ pan: +e.target.value, follow: false })}
        />
      </label>
      <p className="micro">{t.drag}</p>
    </>
  );
}
import { sounds } from "./model";
function soundsIcon(id: string) {
  return sounds.find((s) => s[0] === id)?.[4];
}
