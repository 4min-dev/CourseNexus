export function Diamond({ className = "" }: { className?: string }) {
  return (
    <div className={`diamond-wrapper ${className}`}>
      <svg
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        className="diamond-svg"
        fill="none"
      >
        {/* СТОЛ - центральная площадка (1 грань) */}
        <polygon
          points="50,20 54,22 56,26 56,30 54,34 50,36 46,34 44,30 44,26 46,22"
          fill="#fae8ff"
          stroke="#f0abfc"
          strokeWidth="0.2"
        />
        
        {/* КОРОНА - верхняя часть */}
        
        {/* Звездчатые грани вокруг стола (8 граней) */}
        <polygon points="50,20 46,22 48,24" fill="#f5d0fe" />
        <polygon points="50,20 54,22 52,24" fill="#ede9fe" />
        <polygon points="54,22 56,26 54,24" fill="#e9d5ff" />
        <polygon points="56,26 56,30 54,28" fill="#ddd6fe" />
        <polygon points="56,30 54,34 54,32" fill="#d8b4fe" />
        <polygon points="54,34 50,36 52,34" fill="#d4b5f9" />
        <polygon points="50,36 46,34 48,34" fill="#c9a9f5" />
        <polygon points="46,34 44,30 46,32" fill="#c084fc" />
        
        {/* Верхние клинья короны (8 граней) */}
        <polygon points="46,22 48,24 36,30" fill="#e9d5ff" />
        <polygon points="54,22 52,24 64,30" fill="#ddd6fe" />
        <polygon points="56,26 54,24 64,30" fill="#d8b4fe" />
        <polygon points="56,26 54,28 68,36" fill="#d4b5f9" />
        <polygon points="56,30 54,32 68,40" fill="#c9a9f5" />
        <polygon points="54,34 52,34 64,46" fill="#c084fc" />
        <polygon points="46,34 48,34 36,46" fill="#b794f4" />
        <polygon points="44,30 46,32 32,40" fill="#a78bfa" />
        
        {/* Верхние парные грани (16 граней) */}
        <polygon points="48,24 50,26 36,30" fill="#ddd6fe" />
        <polygon points="52,24 50,26 64,30" fill="#d4b5f9" />
        <polygon points="54,24 52,26 64,30" fill="#d8b4fe" />
        <polygon points="54,28 54,30 68,36" fill="#c9a9f5" />
        <polygon points="54,30 52,32 68,40" fill="#c084fc" />
        <polygon points="54,32 54,34 68,44" fill="#b794f4" />
        <polygon points="52,34 50,34 64,46" fill="#a78bfa" />
        <polygon points="48,34 50,34 36,46" fill="#a855f7" />
        <polygon points="46,32 48,32 32,40" fill="#9d4edd" />
        <polygon points="46,30 46,28 32,36" fill="#9333ea" />
        <polygon points="48,26 46,26 36,30" fill="#8b2fc9" />
        <polygon points="50,26 48,26 36,32" fill="#7c3aed" />
        <polygon points="50,26 52,26 64,32" fill="#7928ca" />
        <polygon points="52,26 54,26 64,34" fill="#6d28d9" />
        <polygon points="54,28 52,28 68,38" fill="#6b21a8" />
        <polygon points="46,28 48,28 32,38" fill="#5b21b6" />
        
        {/* РУНДИСТ - самая широкая часть (8 граней) */}
        <polygon points="36,30 36,46 50,36" fill="#a855f7" />
        <polygon points="64,30 64,46 50,36" fill="#9333ea" />
        <polygon points="32,36 32,40 36,46" fill="#8b2fc9" />
        <polygon points="68,36 68,40 64,46" fill="#7c3aed" />
        <polygon points="32,40 32,44 36,46" fill="#7928ca" />
        <polygon points="68,40 68,44 64,46" fill="#6d28d9" />
        <polygon points="36,46 50,50 50,36" fill="#6b21a8" />
        <polygon points="64,46 50,50 50,36" fill="#5b21b6" />
        
        {/* ПАВИЛЬОН - нижняя часть */}
        
        {/* Нижние клинья (8 граней) */}
        <polygon points="50,50 36,46 40,60" fill="#7c3aed" />
        <polygon points="50,50 64,46 60,60" fill="#6d28d9" />
        <polygon points="40,60 32,44 34,56" fill="#6b21a8" />
        <polygon points="60,60 68,44 66,56" fill="#5b21b6" />
        <polygon points="34,56 32,40 32,50" fill="#581c87" />
        <polygon points="66,56 68,40 68,50" fill="#4c1d95" />
        <polygon points="32,50 36,46 34,56" fill="#4a1d96" />
        <polygon points="68,50 64,46 66,56" fill="#3b0764" />
        
        {/* Нижние парные грани (16 граней) */}
        <polygon points="50,50 40,60 50,75" fill="#6b21a8" />
        <polygon points="50,50 60,60 50,75" fill="#5b21b6" />
        <polygon points="40,60 34,56 46,72" fill="#581c87" />
        <polygon points="60,60 66,56 54,72" fill="#4c1d95" />
        <polygon points="34,56 32,50 42,68" fill="#4a1d96" />
        <polygon points="66,56 68,50 58,68" fill="#3b0764" />
        <polygon points="50,75 46,72 48,82" fill="#581c87" />
        <polygon points="50,75 54,72 52,82" fill="#4c1d95" />
        <polygon points="46,72 42,68 44,78" fill="#4a1d96" />
        <polygon points="54,72 58,68 56,78" fill="#3b0764" />
        <polygon points="42,68 40,64 42,74" fill="#3b0764" />
        <polygon points="58,68 60,64 58,74" fill="#2d1b69" />
        <polygon points="48,82 44,78 46,86" fill="#4a1d96" />
        <polygon points="52,82 56,78 54,86" fill="#3b0764" />
        <polygon points="44,78 42,74 44,84" fill="#3b0764" />
        <polygon points="56,78 58,74 56,84" fill="#2d1b69" />
        
        {/* КАЛЕТТА - нижняя точка (1 грань) */}
        <polygon points="46,86 50,90 54,86 50,88" fill="#1e1b4b" />
        
        {/* Блики */}
        <ellipse cx="50" cy="28" rx="4" ry="2.5" fill="#ffffff" opacity="0.65" />
        <ellipse cx="51" cy="26" rx="2" ry="1.2" fill="#ffffff" opacity="0.85" />
        <polygon points="50,20 48,21 50,21.5" fill="#ffffff" opacity="0.5" />
        <polygon points="50,20 52,21 50,21.5" fill="#ffffff" opacity="0.6" />
        
        {/* Искры */}
        <circle cx="46" cy="28" r="1" fill="#ffffff" opacity="0.8" className="diamond-sparkle-left" />
        <circle cx="54" cy="28" r="1" fill="#ffffff" opacity="0.8" className="diamond-sparkle-right" />
        <circle cx="50" cy="22" r="1.3" fill="#ffffff" opacity="0.95" className="diamond-sparkle-top" />
      </svg>
    </div>
  );
}
