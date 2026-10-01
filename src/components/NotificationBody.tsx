import { toast } from "sonner";

// Matches DG-XXXXXX, VIP-XXXXXX, DGVIP-XXXXXX style keys anywhere in text.
const KEY_PATTERN = /\b(?:DGVIP|VIP|DG)-[A-Z0-9]{4,}\b/g;

/**
 * Renders a notification's body text, highlighting any access key found in
 * it (e.g. "Your key: VIP-A3CB81") so it stands out from the surrounding
 * sentence. Double-tapping/double-clicking a highlighted key copies it.
 */
export function NotificationBody({ text, className }: { text: string; className?: string }) {
  const parts = text.split(KEY_PATTERN);
  const keys = text.match(KEY_PATTERN) || [];

  if (keys.length === 0) return <span className={className}>{text}</span>;

  const copyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      toast.success(`Copied ${key}`);
    } catch {
      toast.error("Could not copy — press and hold the key to copy it");
    }
  };

  return (
    <span className={className}>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {keys[i] && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDoubleClick={(e) => { e.preventDefault(); e.stopPropagation(); copyKey(keys[i]); }}
              title="Double-tap to copy"
              className="mx-0.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 font-mono font-bold text-amber-300"
            >
              {keys[i]}
            </button>
          )}
        </span>
      ))}
    </span>
  );
}
