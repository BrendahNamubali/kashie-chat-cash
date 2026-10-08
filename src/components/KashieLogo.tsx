import fullLogo from "@/assets/kashie-full.png.asset.json";
import iconLogo from "@/assets/kashie-icon.png.asset.json";
import { cn } from "@/lib/utils";

export default function KashieLogo({ variant = "full", className }: { variant?: "full" | "icon"; className?: string }) {
  const icon = variant === "icon";
  return <img src={icon ? iconLogo.url : fullLogo.url} alt="Kashie" width={icon ? 768 : 1374} height={768} className={cn("object-contain shrink-0", icon ? "size-8" : "w-40 h-auto", className)} />;
}