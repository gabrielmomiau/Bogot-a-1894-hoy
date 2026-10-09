// Registro de las tres experiencias narrativas ("tres claves
// socioespaciales") que comparten el mismo componente de mapa pero conservan
// su propia identidad e información, de modo que cada una pueda evolucionar
// de forma independiente sin afectar a las otras.
import { lightingExperience } from "./lighting.js";
import { chicheriasExperience } from "./chicherias.js";
import { heritageExperience } from "./heritage.js";

export const experiences = {
  [lightingExperience.id]: lightingExperience,
  [chicheriasExperience.id]: chicheriasExperience,
  [heritageExperience.id]: heritageExperience,
};
