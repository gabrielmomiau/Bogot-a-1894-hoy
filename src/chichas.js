const SVG_NS = "http://www.w3.org/2000/svg";
const JAR_IDS = Array.from({ length: 8 }, (_, index) => `Chicha_${String(index + 1).padStart(3, "0")}`);

const ROCK_DEGREES = 7;
const ROCK_PERIOD_SECONDS = 2.2;
const SPLIT_RATIO = 0.5;
const SCATTER_RADIUS = 110;
const SCATTER_ROCK_DEGREES = 14;
const SCATTER_RETARGET_SECONDS = [2, 3.4];
const SCATTER_EASE_PER_SECOND = 0.9;
const RETURN_EASE_PER_SECOND = 4;
const HIT_RADIUS = 44;

const random = (min, max) => min + Math.random() * (max - min);

function buildJar(svgDocument, layer, id, index, bounds) {
  const original = svgDocument.getElementById(id);
  if (!original) return null;
  const box = original.getBBox();
  const splitY = box.y + box.height * SPLIT_RATIO;
  const pivotX = box.x + box.width / 2;
  const pivot = { x: pivotX, y: splitY };
  const doc = layer.ownerDocument;

  const makeClip = (clipId, y, height) => {
    const clip = doc.createElementNS(SVG_NS, "clipPath");
    clip.setAttribute("id", clipId);
    clip.setAttribute("clipPathUnits", "userSpaceOnUse");
    const rect = doc.createElementNS(SVG_NS, "rect");
    rect.setAttribute("x", box.x - 50);
    rect.setAttribute("width", box.width + 100);
    rect.setAttribute("y", y);
    rect.setAttribute("height", height);
    clip.append(rect);
    return clip;
  };

  // La vasija original se oculta en el mapa pesado y se redibuja en una capa ligera aparte.
  const base = doc.importNode(original, true);
  base.removeAttribute("id");
  base.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
  original.style.display = "none";
  const top = base.cloneNode(true);
  top.removeAttribute("id");
  top.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
  const clipTop = makeClip(`${id}_clip_top`, box.y - 50, splitY - box.y + 50);
  const clipBottom = makeClip(`${id}_clip_bottom`, splitY, box.height + 50);
  top.setAttribute("clip-path", `url(#${id}_clip_top)`);
  base.setAttribute("clip-path", `url(#${id}_clip_bottom)`);

  const outer = doc.createElementNS(SVG_NS, "g");
  const rocker = doc.createElementNS(SVG_NS, "g");
  layer.append(outer);
  rocker.append(top);
  outer.append(clipTop, clipBottom, base, rocker);

  return {
    outer,
    rocker,
    source: original,
    pivot,
    home: { x: pivot.x, y: pivot.y },
    bounds,
    phase: index * 0.9,
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    nextRetarget: 0,
    tilt: 0,
    caught: false,
  };
}

export function setupChichas(svgDocument, mapObject, onCatch = () => {}) {
  const viewBox = svgDocument.documentElement.viewBox.baseVal;
  const layer = document.createElementNS(SVG_NS, "svg");
  layer.setAttribute("viewBox", `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
  layer.classList.add("map-background", "chicha-layer");
  layer.setAttribute("aria-hidden", "true");
  mapObject.after(layer);
  const bounds = { width: viewBox.width || 1600, height: viewBox.height || 1000 };
  const jars = JAR_IDS.map((id, index) => buildJar(svgDocument, layer, id, index, bounds)).filter(Boolean);

  let scattering = false;
  let frame = null;
  let last = 0;

  const retarget = (jar, now) => {
    const x = Math.min(bounds.width - 20, Math.max(20, jar.home.x + random(-SCATTER_RADIUS, SCATTER_RADIUS)));
    const y = Math.min(bounds.height - 20, Math.max(20, jar.home.y + random(-SCATTER_RADIUS, SCATTER_RADIUS)));
    jar.targetX = x - jar.home.x;
    jar.targetY = y - jar.home.y;
    jar.tilt = random(-1, 1);
    jar.nextRetarget = now + random(...SCATTER_RETARGET_SECONDS);
  };

  const step = (timestamp) => {
    const now = timestamp / 1000;
    const delta = Math.min(0.1, last ? now - last : 0.016);
    last = now;
    const ease = 1 - Math.exp(-(scattering ? SCATTER_EASE_PER_SECOND : RETURN_EASE_PER_SECOND) * delta);

    for (const jar of jars) {
      if (scattering) {
        if (!jar.caught && now >= jar.nextRetarget) retarget(jar, now);
        if (jar.caught) { jar.targetX = 0; jar.targetY = 0; }
      } else {
        jar.targetX = 0;
        jar.targetY = 0;
      }
      jar.x += (jar.targetX - jar.x) * ease;
      jar.y += (jar.targetY - jar.y) * ease;
      const away = Math.hypot(jar.x, jar.y) > 1;
      const amplitude = jar.caught ? 0 : scattering ? SCATTER_ROCK_DEGREES : ROCK_DEGREES;
      const period = scattering ? ROCK_PERIOD_SECONDS / 1.3 : ROCK_PERIOD_SECONDS;
      const angle = Math.sin((now / period) * Math.PI * 2 + jar.phase) * amplitude;
      jar.outer.setAttribute("transform", `translate(${jar.x.toFixed(2)} ${jar.y.toFixed(2)})`);
      jar.rocker.setAttribute("transform", `rotate(${angle.toFixed(2)} ${jar.pivot.x.toFixed(2)} ${jar.pivot.y.toFixed(2)})`);
      if (!away && !scattering) jar.x = jar.y = 0;
    }
    frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);

  return {
    count: jars.length,
    // x, y en coordenadas de usuario del SVG; devuelve true si atrapó una vasija
    tryCatch(x, y) {
      let best = null;
      let bestDistance = HIT_RADIUS;
      for (const jar of jars) {
        if (jar.caught) continue;
        const distance = Math.hypot(jar.home.x + jar.x - x, jar.home.y + jar.y - y);
        if (distance < bestDistance) { best = jar; bestDistance = distance; }
      }
      if (!best) return false;
      best.caught = true;
      onCatch(jars.filter((jar) => jar.caught).length, jars.length);
      return true;
    },
    setScatter(value) { scattering = value; },
    destroy() {
      cancelAnimationFrame(frame);
      frame = null;
      layer.remove();
      jars.forEach((jar) => { jar.source.style.display = ""; });
    },
  };
}
