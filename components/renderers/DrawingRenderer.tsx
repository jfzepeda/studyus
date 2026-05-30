"use client";

/**
 * Sanea SVG generado por el modelo antes de inyectarlo: nos quedamos solo con el
 * bloque <svg>...</svg> y quitamos vectores de XSS comunes (scripts, handlers, javascript:).
 */
function sanitizeSvg(raw: string): string {
  let svg = raw.trim();
  const match = svg.match(/<svg[\s\S]*<\/svg>/i);
  if (match) svg = match[0];
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

export function DrawingRenderer({ svg }: { svg: string }) {
  const clean = sanitizeSvg(svg);

  if (!clean.toLowerCase().includes("<svg")) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
        No se pudo dibujar este recurso.
      </div>
    );
  }

  return (
    <div
      className="drawing-svg flex justify-center"
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
