// Entrada narrativa 2 — clave socioespacial: los silencios de la cartografía
// de 1894, con las chicherías de Bogotá como caso de estudio (espacios
// tradicionales omitidos del plano por las medidas higienistas de la época).
// Las 100 vasijas se distribuyen de forma ilustrativa por las parroquias,
// sin representar ubicaciones históricas georreferenciadas.
export const chicheriasExperience = {
  id: "chicherias",
  label: "¿Qué nos dice un mapa de 1894 hoy?",
  introDescription: "Los silencios de la cartografía y las chicherías de Bogotá.",
  cardTitle: "Secretos, silencios y borramientos cartográficos",
  cardDescription: "Carpeta digital con una cartografía interactiva que distribuye de forma ilustrativa 100 vasijas de chicha entre las parroquias de Bogotá, sin representar ubicaciones históricas exactas. Evocan el centenar de chicherías que había a finales del siglo XIX y que fueron omitidas del mapa. En “Atrapa las chicherías”, presiona Iniciar para activar las vasijas o Pausar para detener su movimiento; haz clic sobre ellas para congelarlas donde las encuentres. Esto simboliza la dificultad de controlar estos importantes establecimientos de celebración. Además, hay un folio de contexto, que brinda más información.",
  maps: {
    day: new URL("../../assets/Mapas/Mapa_BogotaDia_1894 chicha.svg", import.meta.url).href,
  },
  contextParagraphs: [
    "En 1894, el Plano Topográfico de Bogotá mostraba una ciudad medida, ordenada y lista para crecer. Pero también guardaba silencios. Las chicherías, lugares tradicionales de encuentro santafereño, aparecían en la versión del plano de 1891 y ya no están en la de 1894. El plano lleva la firma del ministro de Instrucción Pública, Liborio Zerda, autor de un estudio sobre la chicha y sus efectos tóxicos, y la omisión coincide con las medidas higienistas de la época.",
    "Un mapa puede parecer una copia neutral de lo que existe, pero no lo es. Los mapas representan el mundo y, al mismo tiempo, son lecturas de él: alguien decide qué se dibuja, qué se nombra y qué se deja por fuera, y esas decisiones responden a las ideas, los intereses y los poderes de su época. Por eso los mapas también son instrumentos políticos. Las chicherías no dejaron de existir en la ciudad: solo desaparecieron del papel. Y si un mapa de hace más de un siglo calló cosas, ¿qué cosas no aparecen en los mapas de hoy?"
  ],
  contextImage: {
    src: new URL("../../assets/Imágenes/web/Tienda chicha.webp", import.meta.url).href,
    alt: "Tienda de chicha",
  },
  chichaJars: true,
  avatars: false,
  tabs: ["map", "context"],
  defaultTab: "map",
  hasClock: false,
  onEnter() {
    // Punto de extensión futuro: p. ej. cargar los puntos y capas
    // específicos de las chicherías y los silencios de la cartografía.
  },
  onExit() {},
};
