/**
 * Cross-browser emoji wrapper that normalises rendering between
 * Chrome / Firefox and Safari.  Safari renders emoji with inconsistent
 * vertical-align and line-height; this component forces a predictable
 * inline-flex box so the emoji stays centred.
 */
interface EmojiProps {
  children: React.ReactNode;
  /** Tailwind text-size class, e.g. "text-5xl" */
  className?: string;
  label?: string;
}

export default function Emoji({ children, className = "", label }: EmojiProps) {
  return (
    <span
      role="img"
      aria-label={label}
      className={`inline-flex items-center justify-center leading-none ${className}`}
      style={{ fontFamily: "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif" }}
    >
      {children}
    </span>
  );
}
