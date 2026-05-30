"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

export function CardRenderer({
  markdown,
}: {
  markdown: string;
}) {
  return (
    <div className="md-content">
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
