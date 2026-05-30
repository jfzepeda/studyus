"use client";

import { useEffect, useState } from "react";

export function DiagramRenderer({
  id,
  code,
}: {
  id: string;
  code: string;
}) {
  const [svg, setSvg] = useState<string>("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // Import dinámico: mermaid toca el DOM, así que solo en el navegador.
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "loose",
          fontFamily: "var(--font-sans), sans-serif",
        });
        const { svg } = await mermaid.render(`mermaid-${id}`, code);
        if (active) setSvg(svg);
      } catch (err) {
        console.warn("Mermaid render failed:", err);
        if (active) setFailed(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, code]);

  if (failed) {
    return (
      <pre className="overflow-x-auto rounded-lg bg-slate-900/60 p-3 text-xs text-slate-300">
        {code}
      </pre>
    );
  }

  if (!svg) {
    return <div className="h-24 animate-pulse rounded-lg bg-slate-700/30" />;
  }

  return (
    <div
      className="mermaid-svg flex justify-center"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
