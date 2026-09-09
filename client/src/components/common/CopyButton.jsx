import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

/**
 * Small copy-to-clipboard button with visual feedback.
 *
 * Props:
 *  - value: string to copy
 *  - className: optional additional classes
 */
const CopyButton = ({ value, className = '' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center justify-center p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors ${className}`}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <Check className="w-3 h-3 text-emerald-500" />
      ) : (
        <Copy className="w-3 h-3" />
      )}
    </button>
  );
};

export default CopyButton;
