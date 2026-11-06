export type Lang = "zh" | "en" | "ja";
export const sounds = [
  ["dog", "狗叫", "Dog", "犬の鳴き声", "🐕"],
  ["birds_chirping", "鸟叫", "Birds chirping", "鳥のさえずり", "🐦"],
  ["speech", "人声", "Speech", "話し声", "💬"],
  ["cat", "猫叫", "Cat", "猫の鳴き声", "🐈"],
  ["baby_cry", "婴儿哭声", "Baby crying", "赤ちゃんの泣き声", "👶"],
  ["cock_a_doodle_doo", "鸡鸣", "Rooster", "鶏の鳴き声", "🐓"],
  ["cricket", "蟋蟀", "Cricket", "コオロギ", "🦗"],
  ["music", "音乐", "Music", "音楽", "♫"],
  ["singing", "歌声", "Singing", "歌声", "♬"],
  ["car_horn", "汽车喇叭", "Car horn", "車のクラクション", "🚗"],
  ["siren", "警笛", "Siren", "サイレン", "🚨"],
  ["alarm_clock", "闹钟", "Alarm clock", "目覚まし時計", "⏰"],
  ["computer_typing", "键盘声", "Typing", "キーボード", "⌨"],
  ["door_knock", "敲门声", "Door knock", "ノック", "🚪"],
  ["hammer", "锤击声", "Hammer", "ハンマー", "🔨"],
  ["glass_breaking", "玻璃破碎", "Breaking glass", "ガラスの割れる音", "◇"],
  ["gunshot", "枪声", "Gunshot", "銃声", "✴"],
  ["ocean", "海浪", "Ocean", "波の音", "🌊"],
  ["thunderstorm", "雷暴", "Thunderstorm", "雷雨", "⛈"],
  ["toilet_flush", "冲水声", "Toilet flush", "トイレの流水音", "🚽"],
];
export const ids = sounds.map((s) => s[0]);
export const name = (id: string, l: Lang) =>
  sounds.find((s) => s[0] === id)?.[{ zh: 1, en: 2, ja: 3 }[l]] || id;
export type Settings = {
  lang: Lang;
  env: string[];
  targets: string[];
  sh: boolean;
  position: number;
  loop: boolean;
  speed: number;
  volume: number;
  zoom: number;
  pan: number;
  follow: boolean;
  visible: boolean[];
};
export const defaults: Settings = {
  lang: "zh",
  env: ["dog", "birds_chirping", "speech"],
  targets: ["dog"],
  sh: true,
  position: 0,
  loop: true,
  speed: 1,
  volume: 0.65,
  zoom: 1,
  pan: 0,
  follow: true,
  visible: [true, true, true],
};
export function sanitize(v: Partial<Settings>): Settings {
  const d = { ...defaults };
  for (const k of ["sh", "loop", "follow"] as const)
    if (typeof v[k] === "boolean") d[k] = v[k];
  if (["zh", "en", "ja"].includes(v.lang!)) d.lang = v.lang!;
  for (const k of ["env", "targets"] as const)
    if (Array.isArray(v[k]))
      d[k] = [...new Set(v[k].filter((x) => ids.includes(x)))].slice(
        0,
        k === "env" ? 3 : 20,
      );
  for (const [k, min, max] of [
    ["position", 0, 15],
    ["volume", 0, 1],
    ["zoom", 1, 16],
    ["pan", 0, 15],
    ["speed", 0.5, 2],
  ] as const)
    if (Number.isFinite(v[k])) d[k] = Math.max(min, Math.min(max, v[k]!));
  if (
    Array.isArray(v.visible) &&
    v.visible.length === 3 &&
    v.visible.every((x) => typeof x === "boolean")
  )
    d.visible = v.visible;
  d.pan = Math.min(d.pan, 15 - 15 / d.zoom);
  return d;
}
export function background(env: string[]) {
  return env.some((x) => ["siren", "car_horn", "gunshot"].includes(x))
    ? "street"
    : env.some((x) =>
          [
            "dog",
            "birds_chirping",
            "cricket",
            "cock_a_doodle_doo",
            "ocean",
            "thunderstorm",
          ].includes(x),
        )
      ? "outdoor"
      : "room";
}
export function events(env: string[]) {
  return env.flatMap((id, i) =>
    [0.5 + i * 2.1, 8 + i * 1.1].map((start) => ({
      id,
      start,
      duration: Math.min(4.5, 15 - start),
    })),
  );
}
export function level(id: string, s: Settings, bg = false) {
  return bg
    ? s.sh
      ? 0.035
      : 0.28
    : s.sh
      ? s.targets.includes(id)
        ? 1
        : 0.035
      : 0.8;
}
