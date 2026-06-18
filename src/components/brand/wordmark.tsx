import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Official Avnet primary logo (A-frame + green base bar + wordmark), extracted
 * from brand/avnet-logo-usage.pdf as a transparent PNG. Black primary mark — use
 * on light surfaces only; a reversed/white asset would be needed for dark backgrounds.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <Image
      src="/avnet-logo.png"
      alt="Avnet"
      width={1872}
      height={411}
      priority
      className={cn("h-7 w-auto", className)}
    />
  );
}
