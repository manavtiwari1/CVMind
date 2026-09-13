import { cn } from "@/lib/utils";
import React, { useState } from "react";

interface BackgroundDemoProps {
  children?: React.ReactNode;
  className?: string;
}

export default function Component({ children, className }: BackgroundDemoProps) {
  const [_count, _setCount] = useState(0);

  return (
    <div className={cn("min-h-screen w-full bg-[#fff8f0] relative", className)}>
      {/* Soft Warm Pastel Texture */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 80%, rgba(255, 182, 153, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255, 244, 214, 0.5) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(255, 182, 153, 0.1) 0%, transparent 50%)`,
        }}
      />
      {/* Content */}
      <div className="relative z-10 w-full">
        {children}
      </div>
    </div>
  );
}

export const BackgroundWarmPastelDemo = Component;
