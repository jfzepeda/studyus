import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Study.us",
  description:
    "Háblale y genera recursos gráficos para aprender cualquier tema.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="font-sans text-slate-100 antialiased">{children}</body>
    </html>
  );
}
