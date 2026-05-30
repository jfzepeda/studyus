// Duraciones de las animaciones de tabla (ms). Fuente única de verdad: las usan
// TableRenderer (setTimeout) y los handlers de las tools en agent.ts (que bloquean
// hasta que termina la animación) para que voz y animación queden sincronizadas.
// Si cambias un valor aquí, ajusta el keyframe correspondiente en globals.css.
export const CELL_FLASH_MS = 600; // cellFlash (0.6s)
export const ROW_SLIDE_MS = 1200; // rowSlideDown (1.2s)
export const ROW_OP_TOTAL_MS = ROW_SLIDE_MS + CELL_FLASH_MS; // 1800 (deslizamiento + flash final)
export const HIGHLIGHT_HOLD_MS = 700; // resaltar no anima; pausa breve para "apuntar"
