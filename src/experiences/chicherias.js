// Entrada narrativa 2 — clave socioespacial: los silencios de la cartografía
// de 1894, con las chicherías de Bogotá como caso de estudio (espacios
// tradicionales omitidos del plano por las medidas higienistas de la época).
// Comparte el mismo componente de mapa que las otras dos experiencias; este
// módulo es el punto donde, en una siguiente etapa, se podrán incorporar los
// puntos, capas e interacciones propias de las chicherías.
export const chicheriasExperience = {
  id: "chicherias",
  label: "¿Qué nos dice un mapa de 1894 hoy?",
  introDescription: "Los silencios de la cartografía y las chicherías de Bogotá.",
  maps: {
    day: new URL("../../assets/Mapas/Mapa_BogotaDia_1894 chicha.svg", import.meta.url).href,
  },
  contextParagraphs: [
    "En 1894, el Plano Topográfico de Bogotá mostraba una ciudad medida, ordenada y lista para crecer. Pero también guardaba silencios. Las chicherías, lugares tradicionales de encuentro santafereño, desaparecieron del plano en medio de las medidas higienistas de la época. El mapa fue firmado por el ministro de Instrucción Pública, Liborio Zerda, autor de un ensayo sobre la chicha y sus efectos tóxicos.",
    "Un mapa puede parecer una copia neutral de lo que existe, pero no lo es. Los mapas representan el mundo y, al mismo tiempo, son lecturas de él: alguien decide qué se dibuja, qué se nombra y qué se deja por fuera, y esas decisiones responden a las ideas, los intereses y los poderes de su época. Por eso los mapas también son instrumentos políticos. Las chicherías aparecían en la versión del plano de 1891 y ya no están en la de 1894. No por eso dejaron de existir en la ciudad: solo desaparecieron del papel. Y si un mapa de hace más de un siglo calló cosas, ¿qué cosas no aparecen en los mapas de hoy?",
    "Esta carpeta vuelve a ubicar las chicherías sobre el mapa. Explóralas y piensa en lo que un mapa decide mostrar y en lo que deja por fuera."
  ],
  contextImage: {
    src: new URL("../../assets/Imágenes/web/Tienda chicha.webp", import.meta.url).href,
    alt: "Tienda de chicha",
  },
  chichaJars: true,
  avatars: true,
  tabs: ["map", "context"],
  defaultTab: "map",
  hasClock: false,
  onEnter() {
    // Punto de extensión futuro: p. ej. cargar los puntos y capas
    // específicos de las chicherías y los silencios de la cartografía.
  },
  onExit() {},
};
