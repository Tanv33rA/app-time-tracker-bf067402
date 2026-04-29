import { Apple, Smartphone } from "lucide-react";
import type { Platform } from "@/lib/devtrack-types";

export function PlatformIcon({ platform, className = "h-4 w-4" }: { platform: Platform; className?: string }) {
  if (platform === "iOS") return <Apple className={className} />;
  return <Smartphone className={className} />;
}