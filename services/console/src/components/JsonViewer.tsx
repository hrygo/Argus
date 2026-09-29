import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

interface JsonViewerProps {
  data: unknown;
  title?: string;
  className?: string;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({ data, title, className = "" }) => {
  const [copied, setCopied] = useState(false);

  const formatted = JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`relative rounded-lg border border-border bg-code text-code-text font-mono text-xs overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-3 py-1.5 bg-code-header border-b border-code-border">
        <span className="text-code-muted font-medium">{title || "JSON"}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-code-dim hover:text-code-hover text-xs focus:outline-none cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-pass" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? "已复制" : "复制"}</span>
        </button>
      </div>
      <pre className="p-3 overflow-x-auto max-h-96 leading-relaxed">
        <code>{formatted}</code>
      </pre>
    </div>
  );
};
