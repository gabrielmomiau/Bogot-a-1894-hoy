import assert from "node:assert/strict";
import test from "node:test";
import { CHICHA_COUNT, setupChichas } from "../src/chichas.js";
import { chicheriasExperience } from "../src/experiences/chicherias.js";

function fixture(t) {
  class Element {
    constructor(tag) {
      this.tag = tag;
      this.children = [];
      this.attributes = new Map();
      this.style = { display: "" };
      this.ownerDocument = doc;
      this.classList = { add() {} };
    }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.get(name); }
    append(...nodes) { this.children.push(...nodes); }
    remove() { this.removed = true; }
  }
  const doc = { createElementNS: (_, tag) => new Element(tag) };
  const original = new Element("g");
  const parishIds = ["San_Victorino", "San_Pablo", "San_Pedro", "Las_Aguas", "Santa_Barbara", "Las_Cruces", "Las_Nieves", "Egipto"];
  const parishes = parishIds.map((id, index) => {
    const x = index * 600;
    return {
      id,
      getBBox: () => ({ x, y: 0, width: 512, height: 512 }),
      querySelectorAll: () => [{ isPointInFill: (point) => point.x >= x && point.x <= x + 512 && point.y >= 0 && point.y <= 512 }],
    };
  });
  const root = {
    viewBox: { baseVal: { x: 0, y: 0, width: 5000, height: 1000 } },
    createSVGPoint: () => ({ x: 0, y: 0 }),
  };
  const svgDocument = {
    documentElement: root,
    getElementById: (id) => id === "Relleno_trazo_ciudad" ? { children: parishes } : id === "Chicherias" ? original : null,
  };
  let layer;
  let nextFrame;
  let cancelled = false;
  const globals = ["document", "requestAnimationFrame", "cancelAnimationFrame"];
  const descriptors = globals.map((key) => Object.getOwnPropertyDescriptor(globalThis, key));
  globalThis.document = doc;
  globalThis.requestAnimationFrame = (callback) => { nextFrame = callback; return 1; };
  globalThis.cancelAnimationFrame = () => { cancelled = true; nextFrame = null; };
  t.after(() => globals.forEach((key, index) => {
    if (descriptors[index]) Object.defineProperty(globalThis, key, descriptors[index]);
    else delete globalThis[key];
  }));
  const catches = [];
  const controller = setupChichas(svgDocument, { after: (node) => { layer = node; } }, (...args) => catches.push(args));
  const position = (jar) => {
    const image = jar.children[0].children[0];
    const [dx, dy] = (jar.getAttribute("transform") ?? "translate(0 0)").match(/-?\d+(?:\.\d+)?/g).map(Number);
    return { x: Number(image.getAttribute("x")) + 14 + dx, y: Number(image.getAttribute("y")) + 16 + dy };
  };
  return { controller, layer, original, catches, position, frame: (time) => nextFrame?.(time), scheduled: () => Boolean(nextFrame), cancelled: () => cancelled };
}

test("100 PNG jars are distributed across all eight parishes without avatars", (t) => {
  const { controller, layer, original } = fixture(t);
  assert.equal(CHICHA_COUNT, 100);
  assert.equal(controller.count, 100);
  assert.equal(layer.children.length, 100);
  assert.equal(original.style.display, "none");
  const counts = new Map();
  for (const jar of layer.children) {
    const parish = jar.getAttribute("data-parish");
    counts.set(parish, (counts.get(parish) ?? 0) + 1);
    assert.match(jar.children[0].children[0].getAttribute("href"), /Chicha@600x\.png$/);
  }
  assert.equal(counts.size, 8);
  assert.deepEqual([...counts.values()].sort(), [12, 12, 12, 12, 13, 13, 13, 13]);
  assert.equal(chicheriasExperience.avatars, false);
});

test("caught jars keep their exact position and tilt when the game pauses and resumes", (t) => {
  const { controller, layer, catches, frame, position } = fixture(t);
  controller.setRunning(true);
  frame(1000);
  frame(1100);
  const jar = layer.children[0];
  const point = position(jar);
  const transforms = [jar.getAttribute("transform"), jar.children[0].getAttribute("transform")];
  assert.equal(controller.tryCatch(point.x, point.y), true);
  assert.equal(controller.tryCatch(point.x, point.y), false);
  controller.setRunning(false);
  frame(3000);
  controller.setRunning(true);
  frame(6000);
  assert.deepEqual([jar.getAttribute("transform"), jar.children[0].getAttribute("transform")], transforms);
  assert.equal(jar.getAttribute("data-caught"), "true");
  assert.deepEqual(catches, [[1, 100]]);
});

test("jars start still and pause without returning home or advancing animation time", (t) => {
  const { controller, layer, frame, scheduled } = fixture(t);
  const transforms = () => layer.children.map((jar) => [jar.getAttribute("transform"), jar.children[0].getAttribute("transform")]);
  const initial = transforms();
  assert.equal(scheduled(), false);
  frame(1000);
  assert.deepEqual(transforms(), initial);
  controller.setRunning(true);
  assert.equal(scheduled(), true);
  frame(1000);
  frame(1100);
  const moving = transforms();
  assert.notDeepEqual(moving, initial);
  controller.setRunning(false);
  assert.equal(scheduled(), false);
  frame(10000);
  assert.deepEqual(transforms(), moving);
  controller.setRunning(true);
  frame(20000);
  assert.deepEqual(transforms(), moving);
  frame(20100);
  assert.notDeepEqual(transforms(), moving);
});

test("the counter reaches exactly 100 and cleanup restores the original map", (t) => {
  const { controller, layer, original, catches, position, cancelled } = fixture(t);
  assert.equal(controller.tryCatch(-100, -100), false);
  for (const jar of layer.children) {
    const point = position(jar);
    assert.equal(controller.tryCatch(point.x, point.y), true);
  }
  assert.equal(catches.length, 100);
  assert.deepEqual(catches.at(-1), [100, 100]);
  controller.destroy();
  assert.equal(layer.removed, true);
  assert.equal(original.style.display, "");
  assert.equal(cancelled(), true);
});

test("missing parish geometry produces an explicit error", () => {
  assert.throws(
    () => setupChichas({ getElementById: () => null }, {}),
    /No se encontraron las parroquias/,
  );
});
