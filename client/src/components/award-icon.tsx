import { 
  Rocket, Target, Moon, Star, BookOpen, Clock, PenTool, 
  Flame, Library, Trophy, Gem, GraduationCap,
  Sparkles, Award, Zap, Wand2, Stars, Dumbbell, Crown
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface AwardIconProps {
  emoji: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  size?: number;
  className?: string;
}

const ICON_MAP: Record<string, LucideIcon> = {
  '🚀': Rocket,
  '🎯': Target,
  '🌙': Moon,
  '🌟': Star,
  '📚': BookOpen,
  '⏰': Clock,
  '✍️': PenTool,
  '🔥': Flame,
  '📖': Library,
  '🏆': Trophy,
  '💎': Gem,
  '🎓': GraduationCap,
  '💫': Sparkles,
  '🎖️': Award,
  '⚡': Zap,
  '🔮': Wand2,
  '🌌': Stars,
  '💪': Dumbbell,
  '👑': Crown,
};

const RARITY_ANIMATIONS = {
  common: {
    glowAnimation: 'nft-float-slow 3s ease-in-out infinite',
    iconAnimation: null,
    gradient: 'from-purple-500 via-violet-500 to-purple-600',
    glow: 'shadow-purple-500/50',
  },
  rare: {
    glowAnimation: 'nft-float-medium 2.5s ease-in-out infinite, nft-pulse-glow 2s ease-in-out infinite',
    iconAnimation: null,
    gradient: 'from-cyan-400 via-blue-500 to-cyan-600',
    glow: 'shadow-cyan-400/60',
  },
  epic: {
    glowAnimation: 'nft-float-fast 2s ease-in-out infinite, nft-pulse-glow-strong 1.5s ease-in-out infinite',
    iconAnimation: null,
    gradient: 'from-pink-500 via-purple-600 to-pink-600',
    glow: 'shadow-pink-500/70',
  },
  legendary: {
    glowAnimation: 'nft-float-fast 2s ease-in-out infinite, nft-rainbow-glow 4s linear infinite',
    iconAnimation: 'nft-spin-slow 20s linear infinite',
    gradient: 'from-yellow-400 via-orange-500 to-yellow-500',
    glow: 'shadow-yellow-400/80',
  },
};

export function AwardIcon({ emoji, rarity, size = 32, className = '' }: AwardIconProps) {
  const Icon = ICON_MAP[emoji];
  
  if (!Icon) {
    return <span className="text-2xl">{emoji}</span>;
  }

  const config = RARITY_ANIMATIONS[rarity];
  
  return (
    <div 
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Glow effect with animation */}
      <div 
        className={`absolute inset-0 rounded-full bg-gradient-to-br ${config.gradient} blur-md opacity-60`}
        style={{ 
          animation: config.glowAnimation,
        }}
      />
      
      {/* Icon container with optional spin wrapper for legendary */}
      <div 
        className={`relative z-10 flex items-center justify-center rounded-full bg-gradient-to-br ${config.gradient} p-2 shadow-lg ${config.glow}`}
        style={{ 
          width: size, 
          height: size,
          animation: config.iconAnimation || undefined,
        }}
      >
        <Icon 
          className="text-white drop-shadow-lg" 
          size={size * 0.6}
          strokeWidth={2.5}
        />
      </div>

      {/* Outer ring effect for epic and legendary */}
      {(rarity === 'epic' || rarity === 'legendary') && config.glowAnimation && (
        <div 
          className={`absolute inset-0 rounded-full border-2 ${
            rarity === 'legendary' ? 'border-yellow-300/40' : 'border-pink-300/40'
          }`}
          style={{ 
            width: size + 4,
            height: size + 4,
            left: -2,
            top: -2,
            animation: config.glowAnimation.replace(/infinite/g, '0.5s infinite'),
          }}
        />
      )}
    </div>
  );
}
