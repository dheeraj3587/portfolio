import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2
      aria-label="Loading"
      role="status"
      className={cn("size-5 animate-spin", className)}
    />
  );
}
