export const LIGHTING_VENUES_LAST_FOCUS = 9;
export const LIGHTING_VENUES_FOCUS_IDS = Array.from({ length: LIGHTING_VENUES_LAST_FOCUS }, (_, index) => `FOCO_${String(index + 1).padStart(3, "0")}`);
export const LIGHTING_PROXIMITY_TOLERANCE = 20;

export const LIGHTING_AXIS_STAGES = [
  ["FOCO_007", "FOCO_038", "FOCO_042"],
  ["FOCO_006", "FOCO_005", "FOCO_037"],
  ["FOCO_004", "FOCO_036"],
  ["FOCO_003", "FOCO_035"],
  ["FOCO_002", "FOCO_034"],
  ["FOCO_001"],
];
export const TIMELINE_START_YEAR = 1889;
export const TIMELINE_END_YEAR = 1896;

// Modo "Línea de horas": hora de encendido y focos que se funden (minutos desde las 00:00; >1440 es el día siguiente).
export const LIGHTING_HOURLY_ON_MINUTES = 18 * 60;
export const LIGHTING_BURNOUTS = [
  { focusId: "FOCO_023", minutes: 20 * 60 + 15 },
  { focusId: "FOCO_005", minutes: 22 * 60 + 40 },
  { focusId: "FOCO_061", minutes: 24 * 60 + 50 },
  { focusId: "FOCO_078", minutes: 26 * 60 + 30 },
  { focusId: "FOCO_047", minutes: 28 * 60 + 10 },
];
// Inestabilidad de la luz: cada cuántos ms se evalúa un posible parpadeo y con qué probabilidad.
export const LIGHTING_FLICKER_CHECK_MS = 350;
export const LIGHTING_FLICKER_PROBABILITY = 0.8;
export const LIGHTING_OUTAGE_PROBABILITY = 0.3;
