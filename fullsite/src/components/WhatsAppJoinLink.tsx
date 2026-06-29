import { openWhatsAppCommunity } from "@/constants/community";
import WhatsAppIcon from "./WhatsAppIcon";

interface Props {
  className?: string;
  /** Optional visible label. When omitted, renders an icon-only control. */
  children?: React.ReactNode;
  iconSize?: number;
  /** Hide the WhatsApp glyph (e.g. when the label already conveys it). */
  hideIcon?: boolean;
  /** Accessible label — required when there's no visible text. */
  ariaLabel?: string;
}

/** Opens the WhatsApp community group. Renders a <button> (not an <a href>) and
 *  resolves the URL only on click, so the invite link never appears in the
 *  markup for crawlers/scrapers to harvest. */
export default function WhatsAppJoinLink({
  className,
  children,
  iconSize = 20,
  hideIcon = false,
  ariaLabel,
}: Props) {
  return (
    <button
      type="button"
      onClick={openWhatsAppCommunity}
      className={className}
      aria-label={ariaLabel ?? (typeof children === "string" ? undefined : "Join our WhatsApp community")}
    >
      {!hideIcon && <WhatsAppIcon size={iconSize} />}
      {children}
    </button>
  );
}
