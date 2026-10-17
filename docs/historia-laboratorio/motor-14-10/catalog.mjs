/*
 * Lo que el director de arte puede elegir: tipografías, fondos, transiciones, estilos de subtítulos,
 * efectos de sonido, ambientes y música. Todo libre (OFL, MIT, CC0) y local.
 */
export const FONTS = {
  // nombre: [paquete de Fontsource, pesos, carácter]
  'Inter': ['inter', [400, 600, 800], 'sans neutra y muy legible'],
  'IBM Plex Sans': ['ibm-plex-sans', [400, 600], 'sans técnica y seria'],
  'Lexend': ['lexend', [400, 600], 'sans redonda y amable, educativa'],
  'Manrope': ['manrope', [400, 700], 'sans moderna'],
  'Space Grotesk': ['space-grotesk', [400, 700], 'sans tecnológica con carácter'],
  'Sora': ['sora', [400, 700], 'sans geométrica moderna'],
  'Outfit': ['outfit', [400, 700], 'sans geométrica limpia'],
  'Rubik': ['rubik', [400, 700], 'sans redondeada informal'],
  'Archivo': ['archivo', [400, 700], 'sans grotesca editorial'],
  'Archivo Black': ['archivo-black', [400], 'titular negro y contundente'],
  'Anton': ['anton', [400], 'titular condensado de impacto'],
  'Bebas Neue': ['bebas-neue', [400], 'titular condensado en mayúsculas'],
  'Oswald': ['oswald', [400, 600], 'condensada de prensa'],
  'Big Shoulders Display': ['big-shoulders-display', [700, 900], 'condensada industrial'],
  'Unbounded': ['unbounded', [400, 700], 'display ancha y moderna'],
  'Syne': ['syne', [400, 700], 'display artística'],
  'DM Serif Display': ['dm-serif-display', [400], 'serif de periódico para titulares'],
  'Playfair Display': ['playfair-display', [400, 700], 'serif elegante de alto contraste'],
  'Fraunces': ['fraunces', [400, 600], 'serif cálida y expresiva'],
  'Newsreader': ['newsreader', [400, 600], 'serif de lectura periodística'],
  'Instrument Serif': ['instrument-serif', [400], 'serif fina y elegante'],
  'Bodoni Moda': ['bodoni-moda', [400, 700], 'serif clásica de revista'],
  'EB Garamond': ['eb-garamond', [400, 600], 'serif clásica de libro, histórica'],
  'Libre Baskerville': ['libre-baskerville', [400, 700], 'serif sobria de libro'],
  'Lora': ['lora', [400, 600], 'serif amable de lectura'],
  'Abril Fatface': ['abril-fatface', [400], 'titular serif muy grueso'],
  'Alfa Slab One': ['alfa-slab-one', [400], 'slab gruesa de cartel'],
  'Zilla Slab': ['zilla-slab', [400, 700], 'slab periodística'],
  'JetBrains Mono': ['jetbrains-mono', [400, 700], 'monoespaciada de datos'],
  'IBM Plex Mono': ['ibm-plex-mono', [400, 600], 'monoespaciada técnica'],
  'Courier Prime': ['courier-prime', [400, 700], 'máquina de escribir limpia'],
  'Special Elite': ['special-elite', [400], 'máquina de escribir gastada, documentos'],
  'Caveat': ['caveat', [400, 700], 'letra manuscrita natural'],
  'Kalam': ['kalam', [400, 700], 'manuscrita de rotulador'],
  'Patrick Hand': ['patrick-hand', [400], 'manuscrita escolar'],
  'Permanent Marker': ['permanent-marker', [400], 'rotulador grueso'],
  'Bangers': ['bangers', [400], 'cómic de acción, pantalla de carga de videojuego'],
  'Russo One': ['russo-one', [400], 'interfaz de videojuego, marcadores'],
  'Black Ops One': ['black-ops-one', [400], 'plantilla militar de videojuego'],
};

/** Fondos de textura (CC0): nombre → fichero dentro de assets/textures. */
export const TEXTURES = {
  'papel': 'ambientcg/Paper006/Paper006_1K-JPG_Color.jpg',
  'carton': 'ambientcg/Cardboard001/Cardboard001_1K-JPG_Color.jpg',
  'hormigon': 'ambientcg/Concrete034/Concrete034_1K-JPG_Color.jpg',
  'tela': 'ambientcg/Fabric081C/Fabric081C_1K-JPG_Color.jpg',
};

export const TRANSITIONS = ['corte', 'fundido', 'deslizar', 'pagina', 'zoom', 'cortina', 'desenfoque'];
export const CAPTION_STYLES = ['tira', 'sombra', 'cinta', 'contorno', 'ninguno'];

/** Efectos de sonido reales (Kenney, CC0): nombre → fichero dentro de assets/audio/kenney. */
export const SFX = {
  'pagina': 'rpg-audio/Audio/bookFlip2.ogg',
  'pagina2': 'rpg-audio/Audio/bookFlip1.ogg',
  'libro': 'rpg-audio/Audio/bookPlace1.ogg',
  'clic': 'interface-sounds/Audio/click_003.ogg',
  'clic2': 'interface-sounds/Audio/click_001.ogg',
  'pop': 'interface-sounds/Audio/drop_002.ogg',
  'confirmar': 'interface-sounds/Audio/confirmation_002.ogg',
  'error': 'interface-sounds/Audio/error_004.ogg',
  'abrir': 'interface-sounds/Audio/maximize_006.ogg',
  'cerrar': 'interface-sounds/Audio/minimize_006.ogg',
  'golpe': 'impact-sounds/Audio/impactPunch_heavy_000.ogg',
  'golpe_suave': 'impact-sounds/Audio/impactGeneric_light_002.ogg',
  'campana': 'impact-sounds/Audio/impactBell_heavy_001.ogg',
  'cristal': 'impact-sounds/Audio/impactGlass_light_001.ogg',
  'metal': 'impact-sounds/Audio/impactMetal_light_002.ogg',
  'madera': 'impact-sounds/Audio/impactWood_light_002.ogg',
  'monedas': 'rpg-audio/Audio/handleCoins.ogg',
  'cuchilla': 'rpg-audio/Audio/drawKnife1.ogg',
  'tela': 'rpg-audio/Audio/cloth2.ogg',
  'puerta': 'rpg-audio/Audio/doorClose_1.ogg',
  'digital_sube': 'digital-audio/Audio/phaserUp1.ogg',
  'digital_baja': 'digital-audio/Audio/phaserDown1.ogg',
};

/** Ambientes sintetizados con filtros (sin licencias). */
export const AMBIENCES = ['mar', 'viento', 'lluvia', 'rio'];

/** Estados de ánimo de la música compuesta (instrumentos reales VSCO 2, CC0). */
export const MUSIC_MOODS = {
  'sereno': {key: 'G', mode: 'major', bpm: 76, lead: 'harp'},
  'luminoso': {key: 'G', mode: 'major', bpm: 84, lead: 'harp'},
  'documental': {key: 'D', mode: 'minor', bpm: 72, lead: 'piano'},
  'serio': {key: 'D', mode: 'minor', bpm: 66, lead: 'piano'},
  'tension': {key: 'C', mode: 'minor', bpm: 92, lead: 'strings'},
  'esperanza': {key: 'C', mode: 'major', bpm: 80, lead: 'piano'},
  'epico': {key: 'D', mode: 'minor', bpm: 88, lead: 'strings'},
  'urbano': {synth: 'urbano', note: 'hip-hop pausado de emisora de videojuego'},
  'curioso': {synth: 'curioso', note: 'electrónica ligera con pulsos, divulgación'},
  'synthwave': {synth: 'synthwave', note: 'sintetizadores ochenteros, atardecer en la ciudad'},
  'sin_musica': null,
};
