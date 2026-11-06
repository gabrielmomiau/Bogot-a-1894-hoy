import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { heritageNarration } from "../src/data/heritageNarration.js";
import { mapLocations } from "../src/data/locations.js";
import { heritageExperience } from "../src/experiences/heritage.js";
import { runInNewContext } from "node:vm";

const js = await readFile(new URL("../src/main.js", import.meta.url), "utf8");

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

test("Pedro Pablo starts silent, speaks without quotation marks, and resets on exit", () => {
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) elements.set(id, { style: {}, textContent: "", hidden: true });
    return elements.get(id);
  };
  const context = {
    experiences: { heritage: heritageExperience },
    activeNarrative: "heritage",
    heritageIndex: 0,
    heritagePoint: null,
    heritageDialogueStarted: false,
    heritageDialogueFrame: null,
    heritageDialogue: element("dialogue"),
    heritageStart: element("start"),
    heritagePrevious: element("previous"),
    heritageNext: element("next"),
    walkerImage: element("walker"),
    document: { querySelector: element },
    AVATARS: { pedroPablo: { src: "pedro.png" } },
    mapLocations,
    mapState: { zoom: 1 },
    viewport: { clientWidth: 800, clientHeight: 600 },
    getFitScale: () => 1,
    applyMapTransform() {},
    cancelAnimationFrame() {},
  };
  const render = js.match(/function renderHeritageNarration\(\) \{[\s\S]*?\n\}/)[0];
  const stop = js.match(/function stopWalker\(\) \{[\s\S]*?\n\}/)[0];
  runInNewContext(`${render}\n${stop}\nrenderHeritageNarration();`, context);
  assert.equal(context.walkerImage.hidden, false);
  assert.equal(context.heritageDialogue.hidden, true);
  assert.equal(element("#heritage-dialogue-text").textContent, "");
  assert.equal(context.heritageStart.disabled, false);

  context.heritageDialogueStarted = true;
  for (let index = 0; index < heritageNarration.length; index += 1) {
    context.heritageIndex = index;
    runInNewContext("renderHeritageNarration();", context);
    assert.equal(context.heritageDialogue.hidden, false);
    assert.equal(element("#heritage-dialogue-text").textContent, heritageNarration[index].text);
  }
  runInNewContext("stopWalker(); renderHeritageNarration();", context);
  assert.equal(context.heritageDialogue.hidden, true);
  assert.equal(context.heritageIndex, 0);
  assert.equal(context.heritageStart.textContent, "Empezar diálogos");
});

test("the introduction precedes the dialogue start button in the menu", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const intro = html.match(/<section class="instrument-section" id="heritage-intro"[\s\S]*?<\/section>/)[0];
  assert.match(intro, /<p class="heritage-hint">[^<]+<\/p>\s*<div class="clock-controls">\s*<button type="button" id="heritage-start" disabled>Empezar diálogos<\/button>/);
  assert.match(heritageExperience.cardDescription, /Presiona Empezar diálogos/);
});
