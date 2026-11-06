import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { heritageNarration } from "../src/data/heritageNarration.js";
import { mapLocations } from "../src/data/locations.js";
import { heritageExperience } from "../src/experiences/heritage.js";

test("five ordered fragments explicitly reference existing mapped sites", () => {
  assert.deepEqual(heritageNarration.map((fragment) => fragment.id), ["casa", "san-carlos", "aulas", "samano", "siete-balcones"]);
  for (const fragment of heritageNarration) {
    const site = mapLocations["1894"].find((location) => location.id === fragment.locationId);
    assert.ok(site, fragment.locationId);
    assert.ok(Number.isFinite(site.coordinates.day.x));
    assert.ok(Number.isFinite(site.coordinates.day.y));
    assert.ok(fragment.text.length > 100);
    assert.ok(fragment.title);
    assert.ok(fragment.scene);
  }
  assert.equal(heritageExperience.narration, heritageNarration);
  assert.equal(heritageExperience.walker, undefined);
});

test("Casa Sámano explicitly discloses the provisional map anchor and supplied geographic point", () => {
  const samano = heritageNarration[3];
  assert.match(samano.locationNote, /provisional/);
  assert.deepEqual(samano.geographicCoordinates, { latitude: 4.595844, longitude: -74.073112 });
  assert.equal(samano.locationId, heritageNarration[4].locationId);
});

test("speech bubbles show only dialogue while location metadata stays in the data", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const bubble = html.match(/<aside class="heritage-dialogue"[\s\S]*?<\/aside>/)[0];
  assert.equal((bubble.match(/<p\b/g) ?? []).length, 1);
  assert.match(bubble, /id="heritage-dialogue-text"/);
  assert.doesNotMatch(bubble, /heritage-dialogue-(title|scene|note)|heritage-dialogue__speaker/);
});
