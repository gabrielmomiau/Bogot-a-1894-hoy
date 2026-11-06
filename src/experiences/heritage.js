// Entrada narrativa 3 — clave socioespacial: la georreferenciación de los
// lugares en los que ha estado la Biblioteca Nacional de Colombia y el Museo
// de Bogotá, conectando las transformaciones urbanas históricas con el
// presente. Comparte el mismo componente de mapa que las otras dos
// experiencias; este módulo es el punto donde, en una siguiente etapa, se
// podrán ajustar los recorridos e información propios del patrimonio.
import { LIGHTING_VENUES_FOCUS_IDS } from "../data/lights.js";
import { heritageNarration } from "../data/heritageNarration.js";

export const heritageExperience = {
  id: "heritage",
  label: "¿Dónde ha pasado la noche nuestro patrimonio?",
  introDescription: "Los lugares que ha ocupado la Biblioteca Nacional de Colombia y su relación con el Museo de Bogotá.",
  cardTitle: "Un niebluno te lo cuenta…",
  cardDescription: "Carpeta digital con una cartografía en la que Pedro Pablo, un artesano talabartero niebluno (gentilicio de los habitantes de la Parroquia de Las Nieves), narra cinco viñetas entre las sedes de la Biblioteca Nacional de Colombia y el Museo de Bogotá. Usa las flechas del globo para avanzar o regresar: cada viñeta sitúa al personaje en el punto del plano asociado. El punto de Casa Sámano utiliza provisionalmente el símbolo del Museo, pendiente de ajuste.",
  maps: {
    day: new URL("../../assets/Mapas/Mapa_BogotaDia_1894 bnc copy.svg", import.meta.url).href,
    night: new URL("../../assets/Mapas/Mapa_bogotaNoche_1894 bnc copy.svg", import.meta.url).href,
  },
  contextParagraphs: [
    "La Biblioteca Nacional de Colombia y el Museo de Bogotá no siempre han estado donde hoy los encontramos. Como la ciudad, han cambiado de lugar y de forma, y cada una de sus sedes guarda una parte de su historia: quiénes las habitaron, qué se guardó en ellas y cómo era el entorno a su alrededor.",
    "Esta solapa ubica esos lugares sobre el mapa y los une en un recorrido. Seguirlo es una forma de ver cómo se transformó Bogotá con el tiempo: barrios que crecieron, calles que cambiaron de uso, edificios que se quedaron y otros que ya no están. Cada parada es un punto de encuentro entre el pasado y la ciudad que caminamos hoy.",
    "El recorrido también guarda la pregunta que guía todo el proyecto: la noche. El patrimonio no solo se resguarda de día, entre horarios y salas abiertas; también pasa las noches en algún lugar, protegido o expuesto, a la espera de ser consultado, mostrado o cuidado. Preguntarnos dónde ha pasado la noche nuestro patrimonio es una forma de pensar quién lo ha cuidado y cómo lo cuidamos hoy."
  ],
  narration: heritageNarration,
  tabs: ["map", "context"],
  defaultTab: "map",
  hasClock: false,
  showVenueLamps: true,
  venueFocusIds: LIGHTING_VENUES_FOCUS_IDS,
  onEnter() {
    // Punto de extensión futuro: p. ej. resaltar las localizaciones de la
    // Biblioteca Nacional y el Museo de Bogotá o guiar un recorrido propio.
  },
  onExit() {},
};
