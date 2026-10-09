// Imágenes en assets/Stickers (PNG o SVG con fondo transparente). Ajusta nombres y tamaño aquí.
// Altura fija del avatar en píxeles de pantalla.
export const AVATAR_HEIGHT_PX = 44;
// Punto del sticker que coincide con el puntero, en proporción (0.5, 1 = centro inferior).
export const AVATAR_ANCHOR = { x: 0.5, y: 1 };
export const AVATARS = {
  barbara: { label: "Bárbara", src: new URL("../../assets/Stickers/Barbara@600x.png", import.meta.url).href },
  pedroPablo: { label: "Pedro Pablo", src: new URL("../../assets/Stickers/PedroPablo@600x.png", import.meta.url).href },
};
