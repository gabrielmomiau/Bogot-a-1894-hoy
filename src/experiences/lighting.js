// Entrada narrativa 1 — clave socioespacial: el alumbrado nocturno y eléctrico
// de Bogotá a finales del siglo XIX. Reutiliza el mismo componente de mapa
// (día/noche, reloj, focos, zoom/pan); este módulo es el punto donde, en una
// siguiente etapa, se podrá ajustar lógica, datos o capas propias del
// alumbrado sin afectar las otras dos experiencias.
export const lightingExperience = {
  id: "lighting",
  label: "Un acceso desigual a la luz",
  introDescription: "Descripción: Cartografía del primer sistema de alumbrado público y eléctrico de Bogotá (1889 - 1896).",
  cardTitle: "Un acceso desigual a la luz",
  cardDescription: "Carpeta digital que contiene: 1). Cartografía que permite recorrer por años la distribución del primer sistema de alumbrado eléctrico público de Bogotá entre 1889 y 1896; 2). Cartografía que simula cómo se vería occipitalmente una noche bogotana a finales del siglo XIX, con focos encendidos, estallados y fundidos, etc. 3). Contexto histórico para comprender ambas cartografías, sus decisiones e interacciones.",
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
