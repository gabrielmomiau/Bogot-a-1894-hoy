import { CHICHA_LEGEND } from "./data/legend.js";

const SVG_NS = "http://www.w3.org/2000/svg";
export const CHICHA_COUNT = 100;
const JAR_WIDTH = 28;
const JAR_HEIGHT = 32;
const GRID_SPACING = 32;
const ROCK_PERIOD_SECONDS = 2.2;
const SCATTER_RADIUS = 110;
const SCATTER_ROCK_DEGREES = 14;
const SCATTER_RETARGET_SECONDS = [2, 3.4];
const SCATTER_EASE_PER_SECOND = 0.9;
const HIT_RADIUS = 20;

const random = (min, max) => min + Math.random() * (max - min);

function parishPositions(svgDocument) {
  const regions = svgDocument.getElementById("Relleno_trazo_ciudad");
  if (!regions) throw new Error("No se encontraron las parroquias para distribuir las chicherías.");
  const point = svgDocument.documentElement.createSVGPoint();
  const parishes = [...regions.children].filter((region) => region.id !== "Varios").map((region) => {
    const box = region.getBBox();
    const paths = [...region.querySelectorAll("path")];
    const positions = [];
    for (let y = box.y + GRID_SPACING / 2; y < box.y + box.height - GRID_SPACING / 2; y += GRID_SPACING) {
      for (let x = box.x + GRID_SPACING / 2; x < box.x + box.width - GRID_SPACING / 2; x += GRID_SPACING) {
        point.x = x;
        point.y = y;
        if (paths.some((path) => path.isPointInFill(point))) positions.push({ x, y });
      }
    }
    for (let index = positions.length - 1; index > 0; index -= 1) {
      const other = Math.floor(Math.random() * (index + 1));
      [positions[index], positions[other]] = [positions[other], positions[index]];
    }
    return { id: region.id, positions };
  });
  if (!parishes.length || parishes.some((parish) => parish.positions.length < Math.ceil(CHICHA_COUNT / parishes.length))) {
    throw new Error("No hay espacio suficiente en las parroquias para las 100 chicherías.");
  }
  return Array.from({ length: CHICHA_COUNT }, (_, index) => {
    const parish = parishes[index % parishes.length];
    return { ...parish.positions[Math.floor(index / parishes.length)], parish: parish.id };
  });
}

function buildJar(layer, position, index) {
  const doc = layer.ownerDocument;
  const outer = doc.createElementNS(SVG_NS, "g");
  outer.setAttribute("data-chicha", String(index + 1));
  outer.setAttribute("data-parish", position.parish);
  const rocker = doc.createElementNS(SVG_NS, "g");
  const image = doc.createElementNS(SVG_NS, "image");
  image.setAttribute("href", CHICHA_LEGEND[0].symbol);
  image.setAttribute("x", position.x - JAR_WIDTH / 2);
  image.setAttribute("y", position.y - JAR_HEIGHT / 2);
  image.setAttribute("width", JAR_WIDTH);
  image.setAttribute("height", JAR_HEIGHT);
  rocker.append(image);
  outer.append(rocker);
  layer.append(outer);
  return {
    outer,
    rocker,
    home: position,
    phase: index * 0.9,
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    nextRetarget: 0,
    caught: false,
  };
}

export function setupChichas(svgDocument, mapObject, onCatch = () => {}) {
  const positions = parishPositions(svgDocument);
  const viewBox = svgDocument.documentElement.viewBox.baseVal;
  const layer = document.createElementNS(SVG_NS, "svg");
  layer.setAttribute("viewBox", `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
  layer.classList.add("map-background", "chicha-layer");
  layer.setAttribute("aria-hidden", "true");
  mapObject.after(layer);
  const originalJars = svgDocument.getElementById("Chicherias");
  const originalDisplay = originalJars?.style.display;
  if (originalJars) originalJars.style.display = "none";
  const bounds = { width: viewBox.width, height: viewBox.height };
  const jars = positions.map((position, index) => buildJar(layer, position, index));
  let running = false;
  let frame = null;
  let last = null;
  let elapsed = 0;
  let caughtCount = 0;

  const retarget = (jar, now) => {
    const x = Math.min(bounds.width - HIT_RADIUS, Math.max(HIT_RADIUS, jar.home.x + random(-SCATTER_RADIUS, SCATTER_RADIUS)));
    const y = Math.min(bounds.height - HIT_RADIUS, Math.max(HIT_RADIUS, jar.home.y + random(-SCATTER_RADIUS, SCATTER_RADIUS)));
    jar.targetX = x - jar.home.x;
    jar.targetY = y - jar.home.y;
    jar.nextRetarget = now + random(...SCATTER_RETARGET_SECONDS);
  };

  const step = (timestamp) => {
    const delta = last === null ? 0 : Math.min(0.1, (timestamp - last) / 1000);
    last = timestamp;
    elapsed += delta;
    const ease = 1 - Math.exp(-SCATTER_EASE_PER_SECOND * delta);
    for (const jar of jars) {
      // No se vuelve a modificar ni la posición ni la inclinación de una vasija atrapada.
      if (jar.caught) continue;
      if (elapsed >= jar.nextRetarget) retarget(jar, elapsed);
      jar.x += (jar.targetX - jar.x) * ease;
      jar.y += (jar.targetY - jar.y) * ease;
      const period = ROCK_PERIOD_SECONDS / 1.3;
      const angle = Math.sin((elapsed / period) * Math.PI * 2 + jar.phase) * SCATTER_ROCK_DEGREES;
      jar.outer.setAttribute("transform", `translate(${jar.x.toFixed(2)} ${jar.y.toFixed(2)})`);
      jar.rocker.setAttribute("transform", `rotate(${angle.toFixed(2)} ${jar.home.x.toFixed(2)} ${jar.home.y.toFixed(2)})`);
    }
    frame = requestAnimationFrame(step);
  };

  return {
    count: jars.length,
    tryCatch(x, y) {
      let best = null;
      let bestDistance = HIT_RADIUS;
      for (const jar of jars) {
        const distance = Math.hypot(jar.home.x + jar.x - x, jar.home.y + jar.y - y);
        if (distance < bestDistance) { best = jar; bestDistance = distance; }
      }
      if (!best || best.caught) return false;
      best.caught = true;
      best.outer.setAttribute("data-caught", "true");
      caughtCount += 1;
      onCatch(caughtCount, jars.length);
      return true;
    },
    setRunning(value) {
      if (running === value) return;
      running = value;
      last = null;
      if (running) {
        frame = requestAnimationFrame(step);
      } else {
        cancelAnimationFrame(frame);
        frame = null;
      }
    },
    destroy() {
      running = false;
      cancelAnimationFrame(frame);
      frame = null;
      layer.remove();
      if (originalJars) originalJars.style.display = originalDisplay;
    },
  };
}
