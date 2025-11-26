import { ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

interface NeonLogoProps {
  variant?: "flicker" | "pulse" | "gradient";
  className?: string;
}

export function NeonLogo({ variant = "pulse", className }: NeonLogoProps) {
  const variants = {
    flicker: "animate-neon-flicker",
    pulse: "animate-neon-pulse", 
    gradient: "animate-neon-gradient"
  };

  return (
    <div className={cn("flex items-center gap-3 relative", className)}>
      {/* Backdrop glow effect */}
      <div className="absolute inset-0 blur-2xl opacity-30 bg-gradient-to-r from-purple-500 via-cyan-500 to-purple-500 animate-pulse" style={{ zIndex: -1 }}></div>
      
      <ShoppingBag className={cn(
        "h-8 w-8 sm:h-10 sm:w-10 text-primary transition-all flex-shrink-0",
        variant === "flicker" && "animate-neon-flicker",
        variant === "pulse" && "animate-neon-pulse",
        variant === "gradient" && "animate-neon-pulse"
      )} 
      style={{
        filter: "drop-shadow(0 0 10px var(--primary)) drop-shadow(0 0 20px var(--primary)) drop-shadow(0 0 30px rgba(168, 85, 247, 0.5))"
      }}
      />
      <span className={cn(
        "font-black text-xl sm:text-3xl transition-all relative whitespace-nowrap",
        variants[variant]
      )}
      style={{
        fontFamily: "'Exo 2', 'Orbitron', 'Russo One', sans-serif",
        letterSpacing: '0.08em',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #667eea 100%)',
        backgroundSize: '200% 200%',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        animation: 'gradient-shift 4s ease infinite',
        filter: 'drop-shadow(0 0 20px rgba(102, 126, 234, 0.5)) drop-shadow(0 0 40px rgba(118, 75, 162, 0.3))',
      }}>
        В КУРСЕ{" "}
        <span className="animate-question-premium inline-block" style={{
          background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 50%, #ffd700 100%)',
          backgroundSize: '200% 200%',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          animation: 'gradient-shift 3s ease infinite, question-premium 3s ease-in-out infinite',
          filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.8)) drop-shadow(0 0 20px rgba(255, 215, 0, 0.5))',
        }}>?</span>
      </span>
    </div>
  );
}
