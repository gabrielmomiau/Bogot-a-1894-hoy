import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const css = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");

test("the cover and browser tab use the final title", () => {
  assert.match(html, /<title>Misma ciudad, otras lecturas<\/title>/);
  assert.match(html, /<h2>Misma ciudad,<br \/>otras lecturas<\/h2>/);
});

test("fonts are bundled locally with swap and redistribution licenses", async () => {
  assert.doesNotMatch(css, /@import|https?:\/\//);
  const faces = [...css.matchAll(/@font-face\s*\{([^}]+)\}/g)];
  assert.equal(faces.length, 5);
  for (const [, face] of faces) {
    assert.match(face, /font-display:\s*swap/);
    const [, path] = face.match(/url\("([^"]+)"\)/);
    const font = await readFile(new URL(`../src/${path}`, import.meta.url));
    assert.ok(font.byteLength > 0);
    if (path.endsWith(".woff2")) {
      assert.equal(font.subarray(0, 4).toString(), "wOF2");
    }
  }
  for (const name of ["CormorantGaramond", "DMMono"]) {
    const license = await readFile(new URL(`../assets/Fonts/${name}-OFL.txt`, import.meta.url), "utf8");
    assert.match(license, /SIL OPEN FONT LICENSE/);
  }
});

test("archive images load lazily without deferring the cover images", () => {
  const archive = html.match(/<div class="info-archive"[\s\S]*?<\/div>/)[0];
  const images = [...archive.matchAll(/<img\b[^>]+>/g)];
  assert.equal(images.length, 6);
  for (const [image] of images) {
    assert.match(image, /loading="lazy"/);
    assert.match(image, /decoding="async"/);
  }
  for (const [image] of html.matchAll(/<img class="narrative-image"[^>]+>/g)) {
    assert.doesNotMatch(image, /loading="lazy"/);
  }
});

test("map loading has an accessible status and a retry control", () => {
  assert.match(html, /id="map-load-status" role="status" hidden/);
  assert.match(html, /<button type="button" id="map-load-retry" hidden>Reintentar<\/button>/);
});
