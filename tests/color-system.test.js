import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const js = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
const root = css.match(/:root\s*\{([^}]+)\}/)[1];
const tokens = new Map([...root.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value]));
const palette = {
  "palette-ochre": "#d1971c",
  "palette-blue": "#003153",
  "palette-olive": "#6b8e23",
  "palette-cochineal": "#960018",
  "palette-sky": "#4383a9",
};

function rgb(name) {
  const value = tokens.get(name);
  assert.ok(value, `Unknown token: ${name}`);
  if (value.startsWith("#")) return value.slice(1).match(/../g).map((part) => parseInt(part, 16) / 255);
  const alias = value.match(/^var\(--([\w-]+)\)$/);
  if (alias) return rgb(alias[1]);
  const tone = value.match(/^hsl\(from var\(--([\w-]+)\) h (s|\d+%) (\d+)%\)$/);
  assert.ok(tone, `Unsupported tonal expression: ${value}`);
  const base = rgb(tone[1]);
  const max = Math.max(...base);
  const min = Math.min(...base);
  const delta = max - min;
  const saturation = tone[2] === "s" ? delta / (1 - Math.abs(max + min - 1)) : parseFloat(tone[2]) / 100;
  let hue = max === base[0] ? (base[1] - base[2]) / delta
    : max === base[1] ? (base[2] - base[0]) / delta + 2
      : (base[0] - base[1]) / delta + 4;
  hue = ((hue / 6) % 1 + 1) % 1;
  const lightness = Number(tone[3]) / 100;
  const a = saturation * Math.min(lightness, 1 - lightness);
  return [0, 8, 4].map((n) => {
    const k = (n + hue * 12) % 12;
    return lightness - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  });
}

function luminance(color) {
  return color.map((v) => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
    .reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
}

function contrast(a, b) {
  const values = [luminance(rgb(a)), luminance(rgb(b))].sort((x, y) => y - x);
  return (values[0] + .05) / (values[1] + .05);
}

test("the five master colors match the manual exactly", () => {
  for (const [name, value] of Object.entries(palette)) assert.equal(tokens.get(name), value);
  for (const [, value] of css.matchAll(/(#[\da-f]{6})\b/gi)) assert.ok(Object.values(palette).includes(value));
});

test("small text and interactive labels meet WCAG AA in every surface", () => {
  const pairs = [
    ...["ochre-paper", "ochre-soft", "ochre-mid", "palette-ochre", "sky-paper", "sky-soft", "sky-mid"]
      .map((surface) => ["palette-blue", surface]),
    ...["ochre-folio", "ochre-mid-muted", "ochre-muted"].map((surface) => ["palette-blue", surface]),
    ...["ochre-paper", "ochre-soft", "carmine-paper", "carmine-soft", "carmine-mid"]
      .map((surface) => ["carmine-deep", surface]),
    ...["olive-paper", "olive-soft", "olive-mid"].map((surface) => ["olive-deep", surface]),
    ["olive-ink", "olive-paper"],
    ["ochre-deep", "palette-ochre"],
    ["ochre-paper", "palette-cochineal"],
    ["ochre-paper", "carmine-ink"],
    ["carmine-ink", "carmine-paper"],
    ["palette-cochineal", "carmine-paper"],
  ];
  for (const [ink, surface] of pairs) {
    const ratio = contrast(ink, surface);
    assert.ok(ratio >= 4.5, `${ink} / ${surface}: ${ratio.toFixed(2)}:1`);
  }
  for (const ink of ["ochre-ink", "palette-cochineal", "olive-ink", "olive-question", "question-heritage"]) {
    assert.ok(contrast(ink, "ochre-soft") >= 3, `${ink} large question hover`);
  }
});

test("no legacy literals remain outside the protected cartographic styles", () => {
  const ui = css.replace(/:root\s*\{[^}]*\}/, "")
    .replace(/\.(?:map-stage|walker|avatar-cursor)\s*\{[^}]*\}/g, "");
  assert.doesNotMatch(ui, /#[\da-f]{3,8}\b|rgba?\(|\b(?:white|black|gray|grey)\s*[;}]/i);
  assert.doesNotMatch(css + html, /albayalde|bermellon|rojo-cochinilla|papel-amarillo|#f5f5f0/i);
  const outsideMapEffects = js.replace(/style\.textContent = `[\s\S]*?`;/g, "");
  assert.doesNotMatch(outsideMapEffects, /#[\da-f]{3,8}\b|rgba?\(/i);
});

test("experience families stay separate and all five colors have an information section", () => {
  for (const name of ["surface-page", "surface-raised", "surface-inset", "surface-strong", "interactive"]) {
    assert.doesNotMatch(tokens.get(name), /olive|blue|sky/);
  }
  for (const name of ["question-lighting", "question-chicherias", "question-heritage"]) {
    assert.doesNotMatch(tokens.get(name), /blue|sky/);
  }
  for (const match of css.matchAll(/:is\(\.narrative-panel--bibliographic, \.experience-panel\)\[data-experience="(lighting|heritage)"\]\s*\{([^}]+)\}/g)) {
    assert.doesNotMatch(match[2], /carmine|cochineal/);
    if (match[1] === "heritage") assert.doesNotMatch(match[2], /ochre/);
  }
  const heritage = css.match(/:is\(\.narrative-panel--bibliographic, \.experience-panel\)\[data-experience="heritage"\]\s*\{([^}]+)\}/)[1];
  assert.doesNotMatch(heritage, /blue|sky/);
  assert.match(heritage, /--surface-page: var\(--olive-soft\)/);
  for (const color of ["ochre", "olive", "carmine", "blue", "sky"]) {
    assert.match(html, new RegExp(`class="info-topic[^"]*" data-color="${color}"`));
    assert.match(css, new RegExp(`\\.info-topic\\[data-color="${color}"\\]`));
  }
});

test("seven folios use distinct palette tones, with a separate eighth exterior", () => {
  const colors = [];
  for (const id of ["lighting", "chicherias", "heritage"]) {
    const block = css.match(new RegExp(`\\.folder\\[data-experience="${id}"\\]\\s*\\{([^}]+)\\}`))[1];
    for (const [, token] of block.matchAll(/--tab-[\w-]+:\s*var\(--([\w-]+)\)/g)) {
      colors.push(rgb(token).join(","));
    }
  }
  colors.push(rgb("surface-page").join(","));
  assert.equal(colors.length, 8);
  assert.equal(new Set(colors).size, 8);
});

test("historical imagery retains its original appearance and full framing", () => {
  assert.doesNotMatch(html + css, /duotone|feColorMatrix|feFlood|mix-blend-mode|background-blend-mode/);
  for (const [, selector, declarations] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!/narrative-image|info-archive__button img|info-image-dialog__figure img|info-topic__avatars img|context-avatars__img|context-panel__simple-image/.test(selector)) continue;
    assert.doesNotMatch(declarations, /filter:|opacity:|object-fit:\s*cover|transform:\s*scale/);
  }
  assert.match(html, /<link rel="stylesheet" href="\/src\/styles.css"/);
  assert.match(css, /#time-slider::-webkit-slider-thumb/);
  assert.match(css, /#time-slider::-moz-range-thumb/);
});

test("cover captions, green question states and transparent process button are explicit", () => {
  assert.match(css, /\.narrative-panel--title \.intro-kicker \{ color: var\(--palette-sky\);/);
  assert.match(css, /\.narrative-panel--title h2 \{ color: var\(--palette-sky\);/);
  assert.doesNotMatch(css, /scrollbar-color:|::-webkit-scrollbar/);
  assert.match(css, /\.context-question\[data-narrative="heritage"\]\.is-parked \{ color: var\(--olive-question\);/);
  const process = css.match(/\.context-more-info\s*\{([^}]+)\}/)[1];
  assert.match(process, /background: transparent/);
  assert.match(process, /color: var\(--palette-blue\)/);
});

test("cover and questions use independent scales and file backgrounds use soft pigments", () => {
  assert.match(css, /\.narrative-panel--title h2 \{[^}]*font-size: var\(--headline-size\)/);
  assert.match(css, /\.context-question \{[^}]*font-size: var\(--question-size\)/);
  assert.match(css, /\.narrative-panel--title \.intro-kicker \{[^}]*font-size: clamp\(\.9rem, 1\.2vw, 1\.2rem\)/);
  assert.doesNotMatch(css, /\.context-question \{[^}]*font-size: (?:clamp|\d)/);
  const chicherias = css.match(/:is\(\.narrative-panel--bibliographic, \.experience-panel\)\[data-experience="chicherias"\]\s*\{([^}]+)\}/)[1];
  assert.match(chicherias, /--surface-page: var\(--carmine-soft\)/);
});

test("folio surfaces are desaturated in their yellow, red and green families", () => {
  for (const [id, family] of [["lighting", "ochre"], ["chicherias", "carmine"], ["heritage", "olive"]]) {
    const block = css.match(new RegExp(`\\.folder\\[data-experience="${id}"\\]\\s*\\{([^}]+)\\}`))[1];
    for (const [, token] of block.matchAll(/--tab-[\w-]+:\s*var\(--([\w-]+)\)/g)) {
      assert.ok(token.startsWith(family), `${id}: ${token}`);
      const expression = tokens.get(token);
      assert.match(expression, /h (?:32|45)% /, `${token} is desaturated`);
    }
  }
});
