// Entrada narrativa 1 — clave socioespacial: el alumbrado nocturno y eléctrico
// de Bogotá a finales del siglo XIX. Reutiliza el mismo componente de mapa
// (día/noche, reloj, focos, zoom/pan); este módulo es el punto donde, en una
// siguiente etapa, se podrá ajustar lógica, datos o capas propias del
// alumbrado sin afectar las otras dos experiencias.
export const lightingExperience = {
  id: "lighting",
  label: "Luz nocturna en 1894",
  introDescription: "Descripción: Cartografía del primer sistema de alumbrado público y eléctrico de Bogotá (1889 - 1896).",
  maps: {
    day: new URL("../../assets/Mapas/Mapa_BogotaDia_1894.svg", import.meta.url).href,
    night: new URL("../../assets/Mapas/Mapa_bogotaNoche_1894.svg", import.meta.url).href,
  },
  tabs: ["timeline", "hourly", "context"],
  defaultTab: "timeline",
  hasClock: true,
  avatars: true,
  onEnter() {
    // Punto de extensión futuro: p. ej. enfocar automáticamente los focos
    // o resaltar la capa de iluminación eléctrica.
  },
  onExit() {},
};
