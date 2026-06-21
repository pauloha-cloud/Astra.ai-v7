import React from 'react';

interface BrandLogoProps {
  variant?: 'horizontal' | 'compact' | 'mobile';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  isDarkMode?: boolean;
}

export const BrandLogo = ({
  variant = 'horizontal',
  size = 'md',
  className = '',
  isDarkMode = true,
}: BrandLogoProps) => {
  // Determine sizes
  const iconSizes = {
    sm: 'w-7 h-7 rounded-lg',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-20 h-20 rounded-[22px]',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-2xl',
    lg: 'text-5xl',
  };

  const badgeSizes = {
    sm: 'px-1 py-0.5 text-[8px] rounded-md border',
    md: 'px-2 py-0.5 text-[10px] rounded-lg border-2',
    lg: 'px-3 py-1 text-[13px] rounded-xl border-2',
  };

  // SVG representation of the Astra icon
  // Rounded orange box containing a thick sans-serif 'A' with a 4-point star cutout
  const renderIcon = () => {
    return (
      <div className={`relative ${iconSizes[size]} shrink-0 flex items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-600/20 overflow-hidden`}>
        {/* Subtle inner shadow/border overlay */}
        <div className="absolute inset-0 border border-white/10 rounded-[inherit] pointer-events-none" />
        
        {/* Customized high-fidelity SVG for the star-cutout 'A' */}
        <svg 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg" 
          className="w-[60%] h-[60%] select-none"
        >
          {/* Main letter 'A' skeleton */}
          <path 
            d="M 16 80 L 41 18 L 59 18 L 84 80 L 68 80 L 59 58 L 41 58 L 32 80 Z" 
            fill="white" 
          />
          {/* Inner cutout filled with orange gradient matching background */}
          <path 
            d="M 41 58 L 50 36 L 59 58 Z" 
            fill="#ea580c" 
          />
          {/* Premium ✦ (4-pointed star sparkle) cutout sitting inside the 'A' crossbar/center */}
          {/* We draw the star in the background orange color to make it look like a cutout */}
          <path 
            d="M 50 32 Q 50 48 58 48 Q 50 48 50 64 Q 50 48 42 48 Q 50 48 50 32 Z" 
            fill="#ea580c" 
          />
        </svg>
      </div>
    );
  };

  if (variant === 'compact') {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        {renderIcon()}
      </div>
    );
  }

  // Display 'Astra Learning' text and '[AI]' badge below it, or close next to it.
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {renderIcon()}
      
      <div className="flex flex-col items-start leading-none justify-center">
        {/* Top block: Astra (white/dark) + Learning (orange) */}
        <div className={`font-bold tracking-tight ${textSizes[size]} leading-none`}>
          <span className={isDarkMode ? 'text-white' : 'text-slate-900'}>Astra</span>
          <span className="text-orange-600 ml-1.5">Learning</span>
        </div>
        
        {/* Bottom block: [AI] badge aligned left/below */}
        <div className="mt-1 flex items-center">
          <div className={`border-orange-500 bg-orange-500/5 font-black uppercase text-orange-500 select-none tracking-wider ${badgeSizes[size]}`}>
            AI
          </div>
        </div>
      </div>
    </div>
  );
};
