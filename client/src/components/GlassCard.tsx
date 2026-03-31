import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "premium" | "accent" | "subtle";
  glowColor?: "purple" | "blue" | "pink" | "gold" | "cyan" | "silver" | "bronze";
  hover?: boolean;
  expandOnHover?: boolean;
  isActive?: boolean;
  style?: React.CSSProperties;
}

const glowColors = {
  purple: "from-purple-500/40 via-pink-500/40 to-transparent",
  blue: "from-blue-500/40 via-cyan-500/40 to-transparent",
  pink: "from-pink-500/40 via-fuchsia-500/40 to-transparent",
  gold: "from-yellow-400/40 via-yellow-500/40 to-transparent",
  cyan: "from-cyan-500/40 via-blue-500/40 to-transparent",
  silver: "from-slate-300/40 via-slate-400/40 to-transparent",
  bronze: "from-amber-700/40 via-orange-600/40 to-transparent",
};

export function GlassCard({
  children,
  className,
  variant = "default",
  glowColor = "purple",
  hover = true,
  expandOnHover = false,
  isActive = false,
  style,
}: GlassCardProps) {
  const isMobile = useIsMobile();

  const variantStyles = {
    default: "bg-gradient-to-br from-background/80 via-background/60 to-background/80",
    premium: "bg-gradient-to-br from-background/70 via-background/50 to-background/70",
    accent: "bg-gradient-to-br from-primary/10 via-background/60 to-background/80",
    subtle: "bg-gradient-to-br from-background/90 via-background/70 to-background/90",
  };

  return (
    <div
      className={cn("relative rounded-xl overflow-visible !h-full transform-gpu scale-100", className)}
      style={{ ...style }}
    >
      {/* CSS hover-driven glow - GPU accelerated */}
      <div className="absolute -inset-2 pointer-events-none" style={{ zIndex: 0 }}>
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br rounded-xl transition-opacity duration-300",
            // Disable blur-xl on mobile for performance
            !isMobile && "blur-xl",
            isActive ? "opacity-100" : "opacity-0",
            hover && !isActive && "group-hover:opacity-100",
            glowColors[glowColor]
          )}
        />
      </div>

      {/* Glass layer with backdrop-blur (disabled on mobile for performance) */}
      <div
        className={cn(
          "relative border rounded-xl h-full",
          // Only apply backdrop-blur on desktop
          !isMobile && "backdrop-blur-md",
          isActive ? "border-border/60" : "border-border/40",
          variantStyles[variant],
          hover && !isActive && "group-hover:border-border/60",
          expandOnHover && !isActive && "group-hover:h-auto"
        )}
        style={{
          // Disable backdrop-blur on mobile for performance, use solid background instead
          backdropFilter: isMobile ? 'none' : 'blur(8px) saturate(140%)',
          WebkitBackdropFilter: isMobile ? 'none' : 'blur(8px) saturate(140%)',
          // Solid background fallback for mobile
          ...(isMobile && { background: 'rgba(0, 0, 0, 0.25)' }),
        }}
      >
        {/* Subtle shine effect on top */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* Content */}
        <div className={cn("relative flex flex-col h-full", expandOnHover && !isActive && "group-hover:h-auto")}>
          {children}
        </div>
      </div>
    </div>
  );
}
