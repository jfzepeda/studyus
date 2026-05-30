"use client";

export function ImageRenderer({
  src,
  titulo,
  loading,
}: {
  src: string;
  titulo: string;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-lg bg-slate-800/40 text-sm text-slate-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-fuchsia-400" />
        Generando imagen…
      </div>
    );
  }

  if (!src) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
        No se pudo generar la imagen.
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={titulo} className="w-full rounded-lg" />;
}
