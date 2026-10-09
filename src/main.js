

import "./styles.css";
import { AVATARS, AVATAR_ANCHOR, AVATAR_HEIGHT_PX } from "./data/avatars.js";
import { clockConfig } from "./data/clock.js";
import {
  LIGHTING_AXIS_STAGES,
  LIGHTING_VENUES_LAST_FOCUS,
  TIMELINE_END_YEAR,
  TIMELINE_START_YEAR,
  LIGHTING_PROXIMITY_TOLERANCE,
  LIGHTING_HOURLY_ON_MINUTES, LIGHTING_BURNOUTS, LIGHTING_FLICKER_CHECK_MS, LIGHTING_FLICKER_PROBABILITY, LIGHTING_OUTAGE_PROBABILITY,
} from "./data/lights.js";
import { BASE_LEGEND, CHICHA_LEGEND, VENUES_LEGEND } from "./data/legend.js";
import { setupChichas } from "./chichas.js";
import { mapLocations } from "./data/locations.js";
import { experiences } from "./experiences/index.js";

const canvas = document.querySelector("#map-canvas");
const viewport = document.querySelector("#map-viewport");
const locationsLayer = document.querySelector("#locations");
const panel = document.querySelector("#location-panel");
const panelKicker = document.querySelector("#panel-kicker");
const panelTitle = document.querySelector("#panel-title");
const panelDescription = document.querySelector("#panel-description");
const simulatedTime = document.querySelector("#simulated-time");
const timeSlider = document.querySelector("#time-slider");
const folder = document.querySelector("#folder");
const folderTabs = Array.from(document.querySelectorAll(".folder-tab"));
const clockLabel = document.querySelector("#clock-label");
const timelineLabelStart = document.querySelector("#timeline-label-start");
const timelineLabelEnd = document.querySelector("#timeline-label-end");
const lightingGeneralToggle = document.querySelector("#lighting-general");
const lightingVenuesToggle = document.querySelector("#lighting-venues");
let dayMap = document.querySelector(".map-day");
let nightMap = document.querySelector("#map-night");
const instrumentPanel = document.querySelector("#instrument-panel");
const instrumentToggle = document.querySelector("#instrument-toggle");
const narrativeImages = Array.from(document.querySelectorAll(".narrative-image"));
const narrativeSequence = document.querySelector(".narrative-sequence");
const titleSlide = document.querySelector(".narrative-panel--title");
const contextSlide = document.querySelector(".narrative-panel--context");
const bibliographicSlide = document.querySelector("#bibliographic-slide");
const bibliographicBackButton = document.querySelector("#bibliographic-back");
const bibliographicFile = document.querySelector("#bibliographic-file");
const bibliographicCardPreview = document.querySelector("#bibliographic-card-preview");
const bibliographicTitle = document.querySelector("#bibliographic-title");
const bibliographicDescription = document.querySelector("#bibliographic-description");
const bibliographicMapButton = document.querySelector("#bibliographic-map-button");
const contextMessageStack = contextSlide.querySelector("#context-message-stack");
const contextMessages = Array.from(contextMessageStack.querySelectorAll(".context-question, .context-more-info"));
const contextQuestions = contextMessages.filter((message) => message.classList.contains("context-question"));
const moreInfoTrigger = document.querySelector("#more-info-trigger");
const experiencePanel = document.querySelector(".experience-panel");
const experienceBackButton = document.querySelector("#experience-back");
const experienceKicker = document.querySelector("#experience-kicker");
const infoOverlay = document.querySelector("#info-overlay");
const infoOverlayBackButton = document.querySelector("#info-overlay-back");
const infoArchiveButtons = Array.from(document.querySelectorAll(".info-archive__button"));
const infoImageDialog = document.querySelector("#info-image-dialog");
const infoImageDialogImage = document.querySelector("#info-image-dialog-image");
const infoImageDialogClose = document.querySelector("#info-image-close");
const mapWidth = 1616.12;
const mapHeight = 1073.83;
const LIGHTS_OUT_MINUTES = 24 * 60 + 6 * 60;
const EXPECTED_LIGHT_COUNT = 92;
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

const mapState = {
  zoom: 1,
  panX: 0,
  panY: 0,
  dragActive: false,
  pointerStartX: 0,
  pointerStartY: 0,
  panStartX: 0,
  panStartY: 0,
};

let simulatedMinutes = clockConfig.startTimeMinutes;
let clockRunning = false;
let lightingAnimationPaused = false;
let lastTick = 0;
let animationFrame;
let narrativeImageDrag = null;
let contextSequenceTimer;
let contextSequenceRun = 0;
let activeNarrative = null;
let selectedNarrative = null;
let viewMode = "timeline";
let loadedMapsKey = null;
let lightingInitializationPromise = null;
let lightingStages = [];
let stageIndexByFocusId = new Map();
let lampElementsByFocusId = new Map();
let lastAppliedLightingStageCount = -1;
let lastAppliedBurnedCount = -1;
let burnedFocusIds = new Set();
let lampGeometryByFocusId = new Map();
const flickerTimeouts = new Set();
let lastAppliedLightingPauseState = null;

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[randomIndex]] = [items[randomIndex], items[index]];
  }
  return items;
}

function arrangeNarrativeImages() {
  const slideWidth = titleSlide.clientWidth || window.innerWidth;
  const slideHeight = titleSlide.clientHeight || window.innerHeight;
  const layouts = Array.from({ length: narrativeImages.length }, () => ({
    left: 0.36 + Math.random() * 0.46,
    top: 0.03 + Math.random() * 0.47,
    width: Math.max(140, Math.min(540, slideWidth * (0.22 + Math.random() * 0.16))),
  }));
  const zIndexes = shuffle(Array.from({ length: narrativeImages.length }, (_, index) => index + 1));
  const rotations = shuffle([-14, -9, -4, 4, 9, 14]).slice(0, narrativeImages.length);

  shuffle([...narrativeImages]).forEach((image, index) => {
    const layout = layouts[index];
    const left = Math.min(slideWidth * layout.left, slideWidth - layout.width - 12);
    image.style.left = `${left}px`;
    image.style.top = `${slideHeight * layout.top}px`;
    image.style.right = "auto";
    image.style.width = `${layout.width}px`;
    image.style.transform = `rotate(${rotations[index]}deg)`;
    image.style.zIndex = String(zIndexes[index]);
    image.hidden = false;
  });
}

function resetContextSequence() {
  contextSequenceRun += 1;
  window.clearTimeout(contextSequenceTimer);
  contextMessages.forEach((message) => {
    message.classList.remove("is-entering", "is-parked");
  });
}

function startContextSequence() {
  resetContextSequence();
  const runId = contextSequenceRun;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    contextMessages.forEach((message) => message.classList.add("is-parked"));
    return;
  }

  function enterMessage(index) {
    if (runId !== contextSequenceRun || index >= contextMessages.length) return;

    const message = contextMessages[index];
    message.style.setProperty("--ticker-color", message.dataset.tickerColor);
    message.classList.add("is-entering");
    message.addEventListener("animationend", (event) => {
      if (event.animationName !== "context-message-enter" || runId !== contextSequenceRun) return;

      message.classList.remove("is-entering");
      message.classList.add("is-parked");
      contextSequenceTimer = window.setTimeout(() => enterMessage(index + 1), 180);
    }, { once: true });
  }

  enterMessage(0);
}

arrangeNarrativeImages();
let contextSlideActive = false;
let contextVisibilityFrame = 0;

function updateContextSlideSequence() {
  if (contextVisibilityFrame) return;

  contextVisibilityFrame = window.setTimeout(() => {
    contextVisibilityFrame = 0;
    const rect = contextSlide.getBoundingClientRect();
    const visibleWidth = Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
    const shouldRun = visibleWidth / rect.width >= 0.4;
    if (shouldRun === contextSlideActive) return;

    contextSlideActive = shouldRun;
    if (shouldRun) {
      startContextSequence();
    } else {
      resetContextSequence();
    }
  });
}

narrativeSequence.addEventListener("scroll", updateContextSlideSequence, { passive: true });
document.addEventListener("scroll", updateContextSlideSequence, { capture: true, passive: true });
window.addEventListener("resize", updateContextSlideSequence);
updateContextSlideSequence();

window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", (event) => {
  if (event.matches && contextSlideActive) {
    resetContextSequence();
    contextMessages.forEach((message) => message.classList.add("is-parked"));
  }
});

titleSlide.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;

  const draggedImage = narrativeImages
    .slice()
    .sort((first, second) => Number(second.style.zIndex) - Number(first.style.zIndex))
    .find((image) => {
      const rect = image.getBoundingClientRect();
      return event.clientX >= rect.left && event.clientX <= rect.right
        && event.clientY >= rect.top && event.clientY <= rect.bottom;
    });
  if (!draggedImage) return;

  const slideRect = titleSlide.getBoundingClientRect();
  const imageRect = draggedImage.getBoundingClientRect();
  draggedImage.style.left = `${imageRect.left - slideRect.left}px`;
  draggedImage.style.top = `${imageRect.top - slideRect.top}px`;
  narrativeImageDrag = {
    image: draggedImage,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    left: imageRect.left - slideRect.left,
    top: imageRect.top - slideRect.top,
  };
  draggedImage.classList.add("is-dragging");
  titleSlide.setPointerCapture(event.pointerId);
  event.preventDefault();
});

titleSlide.addEventListener("pointermove", (event) => {
  if (!narrativeImageDrag || event.pointerId !== narrativeImageDrag.pointerId) return;

  narrativeImageDrag.image.style.left = `${narrativeImageDrag.left + event.clientX - narrativeImageDrag.startX}px`;
  narrativeImageDrag.image.style.top = `${narrativeImageDrag.top + event.clientY - narrativeImageDrag.startY}px`;
});

function stopNarrativeImageDrag(event) {
  if (!narrativeImageDrag || event.pointerId !== narrativeImageDrag.pointerId) return;

  narrativeImageDrag.image.classList.remove("is-dragging");
  narrativeImageDrag = null;
}

titleSlide.addEventListener("pointerup", stopNarrativeImageDrag);
titleSlide.addEventListener("pointercancel", stopNarrativeImageDrag);

function renderLocations() {
  locationsLayer.replaceChildren();
  mapLocations["1894"].forEach((location) => {
    const button = document.createElement("button");
    button.className = "location-marker";
    button.type = "button";
    button.style.left = `${location.coordinates.night.x}px`;
    button.style.top = `${location.coordinates.night.y}px`;
    button.setAttribute("aria-label", `${location.name}, ${location.date}`);

    const image = document.createElement("img");
    image.src = location.symbol;
    image.alt = "";
    button.append(image);
    button.addEventListener("click", () => showLocation(location, button));
    locationsLayer.append(button);
  });
}

function getLoadedSvgDocument(mapObject) {
  const svgDocument = mapObject.contentDocument;
  return svgDocument?.documentElement?.tagName.toLowerCase() === "svg" ? svgDocument : null;
}

function waitForMapSvg(mapObject) {
  return new Promise((resolve, reject) => {
    const loadedDocument = getLoadedSvgDocument(mapObject);
    if (loadedDocument) {
      resolve(loadedDocument);
      return;
    }

    mapObject.addEventListener("load", () => {
      const svgDocument = getLoadedSvgDocument(mapObject);
      if (!svgDocument) {
        reject(new Error(`El mapa SVG no contiene un documento válido: ${mapObject.data}`));
        return;
      }
      resolve(svgDocument);
    }, { once: true });
    mapObject.addEventListener("error", () => {
      reject(new Error(`No se pudo cargar el mapa SVG: ${mapObject.data}`));
    }, { once: true });
  });
}

function readLampCoordinates(lamp) {
  const transform = lamp.getAttribute("transform") ?? "";
  const match = transform.match(
    /^translate\(\s*(-?[\d.]+)[,\s]+(-?[\d.]+)\s*\)\s*scale\(\s*(-?[\d.]+)(?:[,\s]+(-?[\d.]+))?\s*\)$/
  );
  if (!match) {
    throw new Error(`No se reconoce la transformación SVG del foco ${lamp.id}: ${transform}`);
  }

  const [, translateX, translateY, scaleX, scaleY = scaleX] = match;
  const width = Number(lamp.getAttribute("width"));
  const height = Number(lamp.getAttribute("height"));
  const x = Number(translateX) + width * Number(scaleX) / 2;
  const y = Number(translateY) + height * Number(scaleY) / 2;
  if (![x, y].every(Number.isFinite)) {
    throw new Error(`El foco ${lamp.id} no tiene coordenadas SVG válidas.`);
  }
  return { x, y, size: Math.max(width * Math.abs(Number(scaleX)), height * Math.abs(Number(scaleY))) };
}

function readMapLamps(svgDocument) {
  const lamps = Array.from(svgDocument.querySelectorAll('use[id^="Luz_"]')).map((element) => {
    const match = /^Luz_(\d{3})$/.exec(element.id);
    if (!match) {
      throw new Error(`Identificador de foco SVG inesperado: ${element.id}`);
    }
    return {
      focusId: `FOCO_${match[1]}`,
      svgId: element.id,
      element,
      ...readLampCoordinates(element),
    };
  });

  if (lamps.length !== EXPECTED_LIGHT_COUNT) {
    throw new Error(`Se esperaban ${EXPECTED_LIGHT_COUNT} focos en el mapa y se encontraron ${lamps.length}.`);
  }
  const focusIds = new Set(lamps.map(({ focusId }) => focusId));
  if (focusIds.size !== EXPECTED_LIGHT_COUNT) {
    throw new Error("El mapa contiene identificadores de foco repetidos.");
  }
  const expectedIds = new Set(Array.from(
    { length: EXPECTED_LIGHT_COUNT },
    (_, index) => `FOCO_${String(index + 1).padStart(3, "0")}`
  ));
  if (Array.from(expectedIds).some((focusId) => !focusIds.has(focusId))) {
    throw new Error("El mapa debe contener exactamente los focos FOCO_001 a FOCO_092.");
  }
  return lamps;
}

function buildLightingStages(lamps) {
  const lampsById = new Map(lamps.map((lamp) => [lamp.focusId, lamp]));
  const axisIds = LIGHTING_AXIS_STAGES.flat();
  if (new Set(axisIds).size !== axisIds.length) {
    throw new Error("La secuencia inicial contiene identificadores de foco repetidos.");
  }
  if (axisIds.some((focusId) => !lampsById.has(focusId))) {
    throw new Error("Falta en los SVG al menos uno de los focos definidos para la carrera Séptima.");
  }

  const axisLamps = axisIds.map((focusId) => lampsById.get(focusId));
  const lateralLamps = lamps
    .filter(({ focusId }) => !axisIds.includes(focusId))
    .map((lamp) => ({
      ...lamp,
      distanceToAxis: Math.min(...axisLamps.map((axisLamp) => (
        Math.hypot(lamp.x - axisLamp.x, lamp.y - axisLamp.y)
      ))),
    }))
    .sort((first, second) => first.distanceToAxis - second.distanceToAxis
      || first.x - second.x
      || first.y - second.y);

  const lateralStages = [];
  let stageStartDistance = null;
  for (const lamp of lateralLamps) {
    if (stageStartDistance === null
      || lamp.distanceToAxis - stageStartDistance > LIGHTING_PROXIMITY_TOLERANCE) {
      lateralStages.push([]);
      stageStartDistance = lamp.distanceToAxis;
    }
    lateralStages[lateralStages.length - 1].push(lamp.focusId);
  }

  const stages = [
    ...LIGHTING_AXIS_STAGES.map((stage) => [...stage]),
    ...lateralStages,
  ];
  const scheduledIds = stages.flat();
  if (scheduledIds.length !== EXPECTED_LIGHT_COUNT
    || new Set(scheduledIds).size !== EXPECTED_LIGHT_COUNT
    || lamps.some(({ focusId }) => !scheduledIds.includes(focusId))) {
    throw new Error("La secuencia de encendido no contiene los 92 focos exactamente una vez.");
  }
  return stages;
}

function addLampGlowAnimation(svgDocument) {
  const style = svgDocument.createElementNS(SVG_NAMESPACE, "style");
  style.textContent = `
    use[id^="Luz_"] { transition: opacity .4s ease; }
    use.is-light-off { opacity: .55; filter: grayscale(.85) brightness(.75); }
    use.is-light-hidden { visibility: hidden; }
    use.is-light-on {
      animation: map-light-glow 1.6s ease-in-out infinite alternate;
    }
    use.is-light-on.is-light-flicker { animation: map-light-flicker .9s steps(1, end) 1; }
    use.is-light-on.is-light-outage { animation: none; opacity: .3; filter: grayscale(.9) brightness(.55); }
    use.is-light-burned { animation: none; opacity: .4; filter: grayscale(1) brightness(.4); }
    .lamp-spark { fill: #ff2a14; opacity: 0; animation: lamp-spark-fly .8s ease-out both; }
    .lamp-spark:nth-child(3n) { fill: #ff7a1f; }
    .lamp-spark:nth-child(5n) { fill: #ffd2a0; }
    @keyframes lamp-spark-fly {
      0% { opacity: 1; transform: translate(0, 0) scale(1); }
      100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(.2); }
    }
    @keyframes map-light-flicker {
      0% { opacity: .25; filter: none; }
      12% { opacity: 1; filter: drop-shadow(0 0 25px rgba(245, 250, 255, 1)) drop-shadow(0 0 42px rgba(120, 170, 255, .8)); }
      26% { opacity: .2; filter: none; }
      40% { opacity: 1; filter: drop-shadow(0 0 25px rgba(245, 250, 255, 1)) drop-shadow(0 0 42px rgba(120, 170, 255, .8)); }
      52% { opacity: .35; filter: none; }
      64% { opacity: 1; filter: drop-shadow(0 0 14px rgba(170, 205, 255, .75)); }
      100% { opacity: 1; filter: drop-shadow(0 0 14px rgba(170, 205, 255, .75)); }
    }
    @keyframes map-light-glow {
      0%, 100% {
        filter: drop-shadow(0 0 5px rgba(225, 240, 255, .95))
          drop-shadow(0 0 14px rgba(170, 205, 255, .75))
          drop-shadow(0 0 24px rgba(110, 160, 255, .5));
      }
      50% {
        filter: drop-shadow(0 0 10px rgba(245, 250, 255, 1))
          drop-shadow(0 0 25px rgba(190, 220, 255, .95))
          drop-shadow(0 0 42px rgba(120, 170, 255, .8));
      }
    }
  `;
  svgDocument.documentElement.insertBefore(style, svgDocument.documentElement.firstChild);
}

function initializeLightingMaps() {
  if (!lightingInitializationPromise) {
    lightingInitializationPromise = loadLightingMaps();
  }
  return lightingInitializationPromise;
}

async function loadLightingMaps() {
  const [dayDocument, nightDocument] = await Promise.all([
    waitForMapSvg(dayMap),
    waitForMapSvg(nightMap),
  ]);
  const dayLamps = readMapLamps(dayDocument);
  const nightLamps = readMapLamps(nightDocument);
  const nightLampsById = new Map(nightLamps.map((lamp) => [lamp.focusId, lamp]));

  for (const dayLamp of dayLamps) {
    const nightLamp = nightLampsById.get(dayLamp.focusId);
    if (!nightLamp
      || Math.abs(dayLamp.x - nightLamp.x) > 0.01
      || Math.abs(dayLamp.y - nightLamp.y) > 0.01) {
      throw new Error(`La posición del foco ${dayLamp.focusId} no coincide entre los mapas día y noche.`);
    }
  }

  lightingStages = buildLightingStages(dayLamps);
  stageIndexByFocusId = new Map(
    lightingStages.flatMap((stage, index) => stage.map((focusId) => [focusId, index]))
  );
  lampGeometryByFocusId = new Map(dayLamps.map(({ focusId, x, y, size }) => [focusId, { x, y, size }]));
  lampElementsByFocusId = new Map(dayLamps.map((dayLamp) => [
    dayLamp.focusId,
    [dayLamp.element, nightLampsById.get(dayLamp.focusId).element],
  ]));

  addLampGlowAnimation(dayDocument);
  addLampGlowAnimation(nightDocument);
}

function getTimelineProgress() {
  const span = LIGHTS_OUT_MINUTES - clockConfig.startTimeMinutes;
  return clamp((simulatedMinutes - clockConfig.startTimeMinutes) / span, 0, 1);
}

function getActivatedStageCount() {
  const total = lightingStages.length;
  if (simulatedMinutes >= LIGHTS_OUT_MINUTES) return 0;
  if (viewMode === "hourly") return simulatedMinutes >= LIGHTING_HOURLY_ON_MINUTES ? total : 0;
  return Math.min(total, Math.floor(getTimelineProgress() * total) + 1);
}

function isFocusVisible(focusId) {
  if (lightingGeneralToggle.checked) return true;
  return lightingVenuesToggle.checked && Number(focusId.slice(-3)) <= LIGHTING_VENUES_LAST_FOCUS;
}

function getBurnedFocusIds() {
  if (viewMode !== "hourly") return new Set();
  return new Set(LIGHTING_BURNOUTS
    .filter(({ minutes }) => simulatedMinutes >= minutes)
    .map(({ focusId }) => focusId));
}

function updateLightingState(force = false) {
  const activatedStageCount = getActivatedStageCount();
  const burned = getBurnedFocusIds();

  if (!force
    && activatedStageCount === lastAppliedLightingStageCount
    && burned.size === lastAppliedBurnedCount
    && lightingAnimationPaused === lastAppliedLightingPauseState) return;

  const newlyBurned = [...burned].filter((focusId) => !burnedFocusIds.has(focusId));
  const burnedChanged = burned.size !== burnedFocusIds.size;
  for (const [focusId, elements] of lampElementsByFocusId) {
    const hasAppeared = viewMode !== "timeline" || stageIndexByFocusId.get(focusId) < activatedStageCount;
    const isVisible = isFocusVisible(focusId) && hasAppeared;
    const isBurned = burned.has(focusId);
    const isOn = !isBurned && stageIndexByFocusId.get(focusId) < activatedStageCount;
    for (const element of elements) {
      element.classList.toggle("is-light-hidden", !isVisible);
      element.classList.toggle("is-light-on", isOn);
      element.classList.toggle("is-light-off", !isOn);
      element.classList.toggle("is-light-burned", isBurned);
      element.style.animationPlayState = lightingAnimationPaused ? "paused" : "";
    }
  }
  burnedFocusIds = burned;
  if (burnedChanged && newlyBurned.length === 1 && clockRunning) spawnBurnoutSparks(newlyBurned[0]);
  lastAppliedLightingStageCount = activatedStageCount;
  lastAppliedBurnedCount = burned.size;
  lastAppliedLightingPauseState = lightingAnimationPaused;
}

function spawnBurnoutSparks(focusId) {
  const geometry = lampGeometryByFocusId.get(focusId);
  if (!geometry || !isFocusVisible(focusId)) return;
  const radius = Math.max(geometry.size, 8) * 0.6;
  for (const element of lampElementsByFocusId.get(focusId)) {
    const svgDocument = element.ownerDocument;
    const group = svgDocument.createElementNS(SVG_NAMESPACE, "g");
    group.setAttribute("transform", `translate(${geometry.x} ${geometry.y})`);
    group.setAttribute("class", "lamp-sparks");
    for (let index = 0; index < 22; index += 1) {
      const spark = svgDocument.createElementNS(SVG_NAMESPACE, "circle");
      const angle = Math.random() * Math.PI * 2;
      const distance = radius * (1.2 + Math.random() * 2.8);
      spark.setAttribute("r", String((radius * (0.05 + Math.random() * 0.07)).toFixed(2)));
      spark.setAttribute("class", "lamp-spark");
      spark.style.setProperty("--dx", `${(Math.cos(angle) * distance).toFixed(1)}px`);
      spark.style.setProperty("--dy", `${(Math.sin(angle) * distance).toFixed(1)}px`);
      spark.style.animationDelay = `${(Math.random() * 1.1).toFixed(2)}s`;
      spark.style.animationDuration = `${(0.5 + Math.random() * 0.6).toFixed(2)}s`;
      group.append(spark);
    }
    element.parentNode.append(group);
    setTimeout(() => group.remove(), 2600);
  }
}

function flickerLamp(focusId) {
  const elements = lampElementsByFocusId.get(focusId);
  const isOutage = Math.random() < LIGHTING_OUTAGE_PROBABILITY;
  const className = isOutage ? "is-light-outage" : "is-light-flicker";
  const duration = isOutage ? 1200 + Math.random() * 2500 : 900;
  elements.forEach((element) => element.classList.add(className));
  const timeoutId = setTimeout(() => {
    elements.forEach((element) => element.classList.remove(className));
    if (isOutage) {
      elements.forEach((element) => element.classList.add("is-light-flicker"));
      const returnId = setTimeout(() => {
        elements.forEach((element) => element.classList.remove("is-light-flicker"));
        flickerTimeouts.delete(returnId);
      }, 900);
      flickerTimeouts.add(returnId);
    }
    flickerTimeouts.delete(timeoutId);
  }, duration);
  flickerTimeouts.add(timeoutId);
}

function clearFlicker() {
  flickerTimeouts.forEach(clearTimeout);
  flickerTimeouts.clear();
  for (const elements of lampElementsByFocusId.values()) {
    elements.forEach((element) => element.classList.remove("is-light-flicker", "is-light-outage"));
  }
}

setInterval(() => {
  if (viewMode !== "hourly" || !clockRunning || Math.random() > LIGHTING_FLICKER_PROBABILITY) return;
  const candidates = [...lampElementsByFocusId.keys()].filter((focusId) => (
    isFocusVisible(focusId)
    && !burnedFocusIds.has(focusId)
    && stageIndexByFocusId.get(focusId) < lastAppliedLightingStageCount
    && !lampElementsByFocusId.get(focusId)[0].classList.contains("is-light-outage")
  ));
  if (candidates.length) flickerLamp(candidates[Math.floor(Math.random() * candidates.length)]);
}, LIGHTING_FLICKER_CHECK_MS);

function updateMapTransition(simulatedTimeMinutes) {
  if (viewMode === "timeline") {
    nightMap.style.opacity = "1";
    return;
  }
  const { eveningStartMinutes, morningStartMinutes, durationMinutes, nightOpacity } = clockConfig.mapTransition;
  const currentDayMinutes = simulatedTimeMinutes % (24 * 60);
  let nightMapOpacity = 0;

  const smoothstep = (value) => {
    const clamped = Math.min(1, Math.max(0, value));
    return clamped * clamped * (3 - 2 * clamped);
  };

  if (currentDayMinutes >= eveningStartMinutes && currentDayMinutes < eveningStartMinutes + durationMinutes) {
    const progress = (currentDayMinutes - eveningStartMinutes) / durationMinutes;
    nightMapOpacity = smoothstep(progress) * nightOpacity;
  } else if (currentDayMinutes >= eveningStartMinutes + durationMinutes || currentDayMinutes < morningStartMinutes) {
    nightMapOpacity = nightOpacity;
  } else if (currentDayMinutes >= morningStartMinutes && currentDayMinutes < morningStartMinutes + durationMinutes) {
    const progress = (currentDayMinutes - morningStartMinutes) / durationMinutes;
    nightMapOpacity = (1 - smoothstep(progress)) * nightOpacity;
  } else {
    nightMapOpacity = 0;
  }

  nightMap.style.opacity = String(Math.min(1, Math.max(0, nightMapOpacity)));
}

function renderClock() {
  if (viewMode === "map") return;
  const displayValue = viewMode === "timeline"
    ? String(Math.round(TIMELINE_START_YEAR + getTimelineProgress() * (TIMELINE_END_YEAR - TIMELINE_START_YEAR)))
    : formatTime24(simulatedMinutes);
  simulatedTime.textContent = displayValue;
  simulatedTime.dateTime = displayValue;
  timeSlider.value = String(Math.round(simulatedMinutes - clockConfig.startTimeMinutes));
  updateMapTransition(simulatedMinutes);
  dayMap.style.visibility = viewMode === "timeline" ? "hidden" : "";
  updateLightingState();
}

function formatTime24(minutes) {
  const hours = Math.floor(minutes / 60) % 24;
  const remainingMinutes = Math.floor(minutes % 60);
  return `${String(hours).padStart(2, "0")}:${String(remainingMinutes).padStart(2, "0")}`;
}

function getTrackEndMinutes() {
  return viewMode === "timeline" ? LIGHTS_OUT_MINUTES - 1 : clockConfig.endTimeMinutes;
}

function runClock(timestamp) {
  if (!clockRunning) return;
  if (lastTick === 0) lastTick = timestamp;
  const elapsedSeconds = (timestamp - lastTick) / 1000;
  simulatedMinutes += elapsedSeconds * clockConfig.minutesPerSecond;
  if (simulatedMinutes >= getTrackEndMinutes()) {
    simulatedMinutes = clockConfig.startTimeMinutes;
  }
  lastTick = timestamp;
  renderClock();
  animationFrame = requestAnimationFrame(runClock);
}

function startClock() {
  if (clockRunning) return;
  if (simulatedMinutes >= getTrackEndMinutes()) {
    simulatedMinutes = clockConfig.startTimeMinutes;
    renderClock();
  }
  clockRunning = true;
  lightingAnimationPaused = false;
  updateLightingState();
  lastTick = 0;
  animationFrame = requestAnimationFrame(runClock);
}

function pauseClock() {
  clockRunning = false;
  cancelAnimationFrame(animationFrame);
  lastTick = 0;
  lightingAnimationPaused = true;
  updateLightingState();
}

function resetClock() {
  pauseClock();
  simulatedMinutes = clockConfig.startTimeMinutes;
  renderClock();
}

function showLocation(location, marker) {
  panelKicker.textContent = location.date;
  panelTitle.textContent = location.name;
  panelDescription.textContent = [location.currentReference, location.type]
    .filter(Boolean)
    .join(" · ");
  panel.hidden = false;
  const margin = 12;
  const anchor = marker.getBoundingClientRect();
  const width = panel.offsetWidth;
  const height = panel.offsetHeight;
  let left = anchor.right + margin;
  if (left + width > window.innerWidth - margin) left = anchor.left - margin - width;
  left = Math.max(margin, left);
  const top = Math.min(Math.max(margin, anchor.top + anchor.height / 2 - height / 2), window.innerHeight - height - margin);
  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getFitScale() {
  const viewportWidth = viewport.clientWidth || 1;
  const viewportHeight = viewport.clientHeight || 1;
  return Math.min(viewportWidth / mapWidth, viewportHeight / mapHeight);
}

function applyMapTransform() {
  const fitScale = getFitScale();
  const scale = fitScale * mapState.zoom;
  const viewportWidth = viewport.clientWidth;
  const viewportHeight = viewport.clientHeight;
  const renderedWidth = mapWidth * scale;
  const renderedHeight = mapHeight * scale;

  if (renderedWidth <= viewportWidth) {
    mapState.panX = (viewportWidth - renderedWidth) / 2;
  } else {
    mapState.panX = clamp(mapState.panX, viewportWidth - renderedWidth, 0);
  }

  if (renderedHeight <= viewportHeight) {
    mapState.panY = (viewportHeight - renderedHeight) / 2;
  } else {
    mapState.panY = clamp(mapState.panY, viewportHeight - renderedHeight, 0);
  }

  canvas.style.transform = `translate(${mapState.panX}px, ${mapState.panY}px) scale(${scale})`;
  canvas.style.setProperty("--map-scale", String(scale));
}

function resetView() {
  mapState.zoom = 1;
  mapState.panX = 0;
  mapState.panY = 0;
  applyMapTransform();
}

function toggleInstrumentPanel(forceOpen) {
  const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : !instrumentPanel.classList.contains("is-open");
  instrumentPanel.classList.toggle("is-open", shouldOpen);
  instrumentToggle.setAttribute("aria-expanded", String(shouldOpen));
  instrumentToggle.setAttribute("aria-label", shouldOpen ? "Cerrar instrumentos del mapa" : "Abrir instrumentos del mapa");
  requestAnimationFrame(applyMapTransform);
}

document.querySelector("#zoom-in").addEventListener("click", () => {
  mapState.zoom = Math.min(3.5, Number((mapState.zoom + 0.25).toFixed(2)));
  applyMapTransform();
});

document.querySelector("#zoom-out").addEventListener("click", () => {
  mapState.zoom = Math.max(1, Number((mapState.zoom - 0.25).toFixed(2)));
  applyMapTransform();
});

viewport.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  if (event.target.closest(".location-marker")) return;

  mapState.dragActive = true;
  mapState.pointerStartX = event.clientX;
  mapState.pointerStartY = event.clientY;
  mapState.panStartX = mapState.panX;
  mapState.panStartY = mapState.panY;
  viewport.classList.add("is-dragging");
  viewport.setPointerCapture(event.pointerId);
});

viewport.addEventListener("pointermove", (event) => {
  if (!mapState.dragActive) return;

  const deltaX = event.clientX - mapState.pointerStartX;
  const deltaY = event.clientY - mapState.pointerStartY;
  mapState.panX = mapState.panStartX + deltaX;
  mapState.panY = mapState.panStartY + deltaY;
  applyMapTransform();
});

function stopDragging(event) {
  if (!mapState.dragActive) return;
  mapState.dragActive = false;
  viewport.classList.remove("is-dragging");
  if (event && typeof event.pointerId === "number") {
    viewport.releasePointerCapture(event.pointerId);
  }
}

viewport.addEventListener("pointerup", stopDragging);
viewport.addEventListener("pointerleave", stopDragging);
viewport.addEventListener("pointercancel", stopDragging);

window.addEventListener("resize", applyMapTransform);

document.querySelector("#reset-view").addEventListener("click", resetView);
document.querySelector("#close-panel").addEventListener("click", () => {
  panel.hidden = true;
});
document.querySelector("#clock-play").addEventListener("click", startClock);
document.querySelector("#clock-pause").addEventListener("click", pauseClock);
document.querySelector("#clock-reset").addEventListener("click", resetClock);
timeSlider.addEventListener("input", (event) => {
  pauseClock();
  simulatedMinutes = clockConfig.startTimeMinutes + Number(event.target.value);
  renderClock();
});
instrumentToggle.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleInstrumentPanel();
});

document.addEventListener("click", (event) => {
  if (!instrumentPanel.contains(event.target)) {
    toggleInstrumentPanel(false);
  }
});

function setViewMode(mode) {
  viewMode = mode;
  clearFlicker();
  folder.dataset.mode = mode;
  const isTimeline = mode === "timeline";
  const isContext = mode === "context";
  document.getElementById("map-shell").hidden = isContext;
  document.getElementById("context-panel").hidden = !isContext;
  folderTabs.forEach((tab) => {
    const active = tab.dataset.mode === mode;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  if (isContext || mode === "map") {
    if (clockRunning) pauseClock();
    return;
  }
  timeSlider.max = String(getTrackEndMinutes() - clockConfig.startTimeMinutes);
  simulatedMinutes = Math.min(simulatedMinutes, getTrackEndMinutes());
  clockLabel.textContent = isTimeline ? "Recorrer los años" : "Recorrer la noche";
  timelineLabelStart.textContent = isTimeline ? String(TIMELINE_START_YEAR) : formatTime24(clockConfig.startTimeMinutes);
  timelineLabelEnd.textContent = isTimeline ? String(TIMELINE_END_YEAR) : formatTime24(clockConfig.endTimeMinutes);
  timeSlider.setAttribute("aria-label", isTimeline
    ? `Explorar años de ${TIMELINE_START_YEAR} a ${TIMELINE_END_YEAR}`
    : "Explorar hora de 16:30 a 09:00");
  renderClock();
  updateLightingState(true);
}

let chichaController = null;

const catchCounter = document.getElementById("chicha-counter");
const catchCount = document.getElementById("chicha-count");

function updateCatchCounter(caught, total) {
  catchCount.textContent = `${caught} / ${total}`;
  catchCounter.classList.toggle("is-complete", caught === total && total > 0);
}

function stopChichas() {
  chichaController?.destroy();
  chichaController = null;
}

const walkerImage = document.querySelector("#walker");
const WALKER_HEIGHT_PX = 30;
const WALKER_SPEED_MAP_PX_PER_SECOND = 45;
let walkerFrame = null;

function showVenueLamps(experience) {
  const venueIds = new Set(experience.venueFocusIds);
  for (const [focusId, elements] of lampElementsByFocusId) {
    const isVenue = venueIds.has(focusId);
    for (const element of elements) {
      element.classList.toggle("is-light-hidden", !isVenue);
      element.classList.toggle("is-light-on", isVenue);
      element.classList.toggle("is-light-off", !isVenue);
      element.classList.remove("is-light-burned");
      element.style.animationPlayState = "";
    }
  }
  nightMap.style.opacity = String(clockConfig.mapTransition.nightOpacity);
  startWalker(experience.walker);
}

function stopWalker() {
  cancelAnimationFrame(walkerFrame);
  walkerFrame = null;
  walkerImage.hidden = true;
}

function startWalker({ avatar, route }) {
  const points = route.map((focusId) => lampGeometryByFocusId.get(focusId)).filter(Boolean).map(({ x, y }) => [x, y]);
  stopWalker();
  if (points.length < 2) return;
  const segments = points.slice(1).map((point, index) => Math.hypot(point[0] - points[index][0], point[1] - points[index][1]));
  const total = segments.reduce((sum, length) => sum + length, 0);
  walkerImage.src = AVATARS[avatar].src;
  walkerImage.hidden = false;
  let startTime = null;

  const step = (timestamp) => {
    if (startTime === null) startTime = timestamp;
    const cycle = ((timestamp - startTime) / 1000) * WALKER_SPEED_MAP_PX_PER_SECOND;
    const travelled = cycle % (2 * total);
    let distance = travelled <= total ? travelled : 2 * total - travelled;
    let index = 0;
    while (index < segments.length - 1 && distance > segments[index]) {
      distance -= segments[index];
      index += 1;
    }
    const ratio = segments[index] ? distance / segments[index] : 0;
    const x = points[index][0] + (points[index + 1][0] - points[index][0]) * ratio;
    const y = points[index][1] + (points[index + 1][1] - points[index][1]) * ratio;
    const scale = Number.parseFloat(canvas.style.getPropertyValue("--map-scale")) || 1;
    const bob = Math.abs(Math.sin(timestamp / 130)) * 2.5 / scale;
    walkerImage.style.height = `${WALKER_HEIGHT_PX / scale}px`;
    walkerImage.style.left = `${x}px`;
    walkerImage.style.top = `${y - bob}px`;
    walkerFrame = requestAnimationFrame(step);
  };
  walkerFrame = requestAnimationFrame(step);
}

function replaceMapObject(mapObject, url) {
  const fresh = mapObject.cloneNode(false);
  fresh.removeAttribute("data");
  if (url) fresh.setAttribute("data", url);
  mapObject.replaceWith(fresh);
  return fresh;
}

function renderLegend(experience) {
  const entries = experience.id === "heritage" ? [...BASE_LEGEND, ...VENUES_LEGEND] : experience.chichaJars ? [...BASE_LEGEND, ...CHICHA_LEGEND] : BASE_LEGEND;
  document.getElementById("legend-list").replaceChildren(...entries.map(({ name, symbol }) => {
    const item = document.createElement("li");
    const image = document.createElement("img");
    image.src = symbol;
    image.alt = "";
    const label = document.createElement("span");
    label.textContent = name;
    item.append(image, label);
    return item;
  }));
}

function configureFolder(experience) {
  renderLegend(experience);
  folder.dataset.experience = experience.id;
  folderTabs.forEach((tab) => { tab.hidden = !experience.tabs.includes(tab.dataset.mode); });
  document.getElementById("clock-section").hidden = !experience.hasClock;
  document.getElementById("context-layout").hidden = experience.id !== "lighting";
  document.getElementById("context-empty").hidden = experience.id === "lighting";
  locationsLayer.hidden = experience.id !== "heritage";
  panel.hidden = true;
  dayMap.style.visibility = "";
  const simpleContext = document.getElementById("context-empty");
  const contextText = document.createElement("div");
  contextText.className = "context-panel__simple-text";
  contextText.append(...(experience.contextParagraphs ?? []).map((text) => {
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    return paragraph;
  }));
  simpleContext.replaceChildren(contextText);
  if (experience.contextImage) {
    const figure = document.createElement("img");
    figure.className = "context-panel__simple-image";
    figure.src = experience.contextImage.src;
    figure.alt = experience.contextImage.alt;
    simpleContext.append(figure);
  }
  simpleContext.classList.toggle("has-image", Boolean(experience.contextImage));
  document.getElementById("avatar-section").hidden = !experience.avatars;
  document.getElementById("chicha-game").hidden = !experience.chichaJars;
  stopChichas();
  stopWalker();

  const mapsKey = `${experience.maps.day}|${experience.maps.night ?? ""}`;
  if (mapsKey !== loadedMapsKey) {
    loadedMapsKey = mapsKey;
    lightingInitializationPromise = null;
    lightingStages = [];
    stageIndexByFocusId = new Map();
    lampElementsByFocusId = new Map();
    lampGeometryByFocusId = new Map();
    burnedFocusIds = new Set();
    lastAppliedLightingStageCount = -1;
    lastAppliedBurnedCount = -1;
    dayMap = replaceMapObject(dayMap, experience.maps.day);
    nightMap = replaceMapObject(nightMap, experience.maps.night);
  }
  resetClock();
  setAvatar(null);
  setViewMode(experience.defaultTab);
}

folderTabs.forEach((tab) => {
  tab.addEventListener("click", () => setViewMode(tab.dataset.mode));
});

[lightingGeneralToggle, lightingVenuesToggle].forEach((toggle) => {
  toggle.addEventListener("change", () => updateLightingState(true));
});

function scrollToSlide(target) {
  target.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
}

// Descarga los mapas mientras el usuario lee la ficha, para que ya estén en caché al entrar.
const prefetchedMaps = new Set();
function prefetchMaps(experience) {
  Object.values(experience.maps).forEach((url) => {
    if (!url || prefetchedMaps.has(url)) return;
    prefetchedMaps.add(url);
    fetch(url).catch(() => prefetchedMaps.delete(url));
  });
}

function selectNarrative(narrativeId, question) {
  const experience = experiences[narrativeId];
  if (!experience) return;
  prefetchMaps(experience);

  selectedNarrative = narrativeId;
  question.style.setProperty("--ticker-color", question.dataset.tickerColor);
  contextQuestions.forEach((item) => item.classList.toggle("is-selected", item === question));
  closeBibliographicCard();
  bibliographicTitle.textContent = experience.cardTitle ?? experience.label;
  bibliographicDescription.textContent = experience.cardDescription ?? experience.introDescription;
  bibliographicSlide.style.setProperty("--narrative-accent", question.dataset.tickerColor);
  bibliographicSlide.hidden = false;
  bibliographicSlide.classList.remove("is-entering");
  requestAnimationFrame(() => bibliographicSlide.classList.add("is-entering"));
  scrollToSlide(bibliographicSlide);
}

function returnToQuestions() {
  bibliographicSlide.hidden = true;
  bibliographicSlide.classList.remove("is-entering");
  scrollToSlide(contextSlide);
}

function toggleBibliographicCard() {
  const isOpen = bibliographicFile.classList.toggle("is-open");
  bibliographicCardPreview.setAttribute("aria-expanded", String(isOpen));
  bibliographicMapButton.setAttribute("aria-hidden", String(!isOpen));
  bibliographicMapButton.inert = !isOpen;
}

function closeBibliographicCard() {
  bibliographicFile.classList.remove("is-open");
  bibliographicCardPreview.setAttribute("aria-expanded", "false");
  bibliographicMapButton.setAttribute("aria-hidden", "true");
  bibliographicMapButton.inert = true;
}

function enterExperience(narrativeId) {
  const experience = experiences[narrativeId];
  if (!experience) return;

  if (activeNarrative && activeNarrative !== narrativeId) {
    experiences[activeNarrative].onExit?.();
  }

  activeNarrative = narrativeId;
  contextQuestions.forEach((question) => {
    question.classList.toggle("is-selected", question.dataset.narrative === narrativeId);
  });
  experienceKicker.textContent = experience.label;
  bibliographicSlide.hidden = true;
  bibliographicSlide.classList.remove("is-entering");
  experiencePanel.hidden = false;
  configureFolder(experience);
  dayMap.style.opacity = "0";
  nightMap.style.opacity = "0";
  locationsLayer.style.visibility = "hidden";
  const mapsReady = experience.hasClock || experience.showVenueLamps ? initializeLightingMaps() : waitForMapSvg(dayMap);
  mapsReady.then(() => {
    if (experience.chichaJars && activeNarrative === experience.id) {
      stopChichas();
      chichaController = setupChichas(getLoadedSvgDocument(dayMap), dayMap, updateCatchCounter);
      updateCatchCounter(0, chichaController.count);
      updateChichaScatter();
    }
    renderClock();
    applyMapTransform();
    dayMap.style.opacity = "";
    if (viewMode === "map") dayMap.style.visibility = "";
    locationsLayer.style.visibility = "";
    if (experience.showVenueLamps && activeNarrative === experience.id) showVenueLamps(experience);
  });
  experience.onEnter?.();
  requestAnimationFrame(applyMapTransform);
}

function exitExperience() {
  stopWalker();
  stopChichas();
  if (activeNarrative) {
    experiences[activeNarrative].onExit?.();
  }
  activeNarrative = null;
  experiencePanel.hidden = true;
  scrollToSlide(contextSlide);
}

function openInfoOverlay() {
  infoOverlay.hidden = false;
}

function closeInfoOverlay() {
  infoOverlay.hidden = true;
}

function openArchiveImage(button) {
  const thumbnail = button.querySelector("img");
  infoImageDialogImage.src = thumbnail.currentSrc || thumbnail.src;
  infoImageDialogImage.alt = thumbnail.alt;
  infoImageDialog.showModal();
}

contextQuestions.forEach((question) => {
  question.addEventListener("click", () => selectNarrative(question.dataset.narrative, question));
});
bibliographicCardPreview.addEventListener("click", toggleBibliographicCard);
bibliographicCardPreview.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  toggleBibliographicCard();
});
 bibliographicBackButton.addEventListener("click", returnToQuestions);
bibliographicMapButton.addEventListener("click", () => {
  if (selectedNarrative) enterExperience(selectedNarrative);
});
moreInfoTrigger.addEventListener("click", openInfoOverlay);
experienceBackButton.addEventListener("click", exitExperience);
infoOverlayBackButton.addEventListener("click", closeInfoOverlay);
infoArchiveButtons.forEach((button) => {
  button.addEventListener("click", () => openArchiveImage(button));
});
infoImageDialogClose.addEventListener("click", () => infoImageDialog.close());
infoImageDialog.addEventListener("click", (event) => {
  if (event.target === infoImageDialog) infoImageDialog.close();
});

renderLocations();
renderClock();
applyMapTransform();
document.body.classList.add("app-ready");
const avatarCursor = document.querySelector("#avatar-cursor");
const avatarToggles = Array.from(document.querySelectorAll("[data-avatar]"));
let activeAvatar = null;

let pointerInsideMap = false;

function updateChichaScatter() {
  chichaController?.setScatter(Boolean(activeAvatar) && pointerInsideMap);
}

function setAvatar(key) {
  activeAvatar = key;
  updateChichaScatter();
  avatarToggles.forEach((toggle) => { toggle.checked = toggle.dataset.avatar === key; });
  viewport.classList.toggle("has-avatar", Boolean(key));
  avatarCursor.hidden = true;
  if (key) avatarCursor.src = AVATARS[key].src;
}

avatarToggles.forEach((toggle) => {
  toggle.addEventListener("change", () => setAvatar(toggle.checked ? toggle.dataset.avatar : null));
});

avatarCursor.addEventListener("error", () => setAvatar(null));

avatarCursor.style.height = `${AVATAR_HEIGHT_PX}px`;

function moveAvatar(event) {
  pointerInsideMap = true;
  updateChichaScatter();
  if (!activeAvatar) return;
  avatarCursor.hidden = false;
  const gap = 8;
  avatarCursor.style.transform = `translate(${event.clientX + gap + avatarCursor.offsetWidth * AVATAR_ANCHOR.x}px, ${event.clientY - AVATAR_HEIGHT_PX * AVATAR_ANCHOR.y}px)`;
}

viewport.addEventListener("pointermove", moveAvatar);
viewport.addEventListener("pointerenter", moveAvatar);
viewport.addEventListener("pointerleave", () => {
  pointerInsideMap = false;
  updateChichaScatter();
  avatarCursor.hidden = true;
});

viewport.addEventListener("click", (event) => {
  if (!chichaController || !activeAvatar) return;
  const svgDocument = getLoadedSvgDocument(dayMap);
  const root = svgDocument.documentElement;
  const rect = dayMap.getBoundingClientRect();
  const scaleX = rect.width / dayMap.offsetWidth;
  const scaleY = rect.height / dayMap.offsetHeight;
  const point = root.createSVGPoint();
  point.x = (event.clientX - rect.left) / scaleX;
  point.y = (event.clientY - rect.top) / scaleY;
  const local = point.matrixTransform(root.getScreenCTM().inverse());
  chichaController.tryCatch(local.x, local.y);
});
