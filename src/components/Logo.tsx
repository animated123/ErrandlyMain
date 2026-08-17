import React from 'react';
import { Zap } from 'lucide-react';

interface LogoProps {
  size?: number;
  className?: string;
  url?: string;
  scale?: number;
  width?: number | string;
  height?: number | string;
  variant?: 'original' | 'square' | 'circle' | 'rounded';
  responsive?: boolean;
}

const DEFAULT_LOGO = "https://res.cloudinary.com/dul9xvvap/image/upload/v1779216350/a371z1ikclx5qbsgtgdv.png";

export const Logo = ({ 
  size = 20, 
  className = "", 
  url, 
  scale = 1, 
  width, 
  height,
  variant = 'original',
  responsive = true
}: LogoProps) => {
  const finalSize = size * scale;
  const logoUrl = url || DEFAULT_LOGO;

  const variantClasses = {
    original: '',
    square: 'aspect-square object-cover',
    circle: 'aspect-square object-cover rounded-full',
    rounded: 'aspect-square object-cover rounded-2xl'
  };

  const isIllustrative = finalSize > 120;
  // Compute responsive sizes (e.g., 80% on mobile for UI icons, and 75% for large illustrative ones)
  const mobileSize = isIllustrative ? finalSize * 0.75 : Math.max(16, finalSize * 0.8);
  const desktopSize = finalSize;

  // Generate a random-ish unique class name style key to prevent clashes while keeping it self-contained
  const styleId = React.useId().replace(/:/g, '');

  return (
    <>
      <style>{`
        .logo-res-${styleId} {
          width: ${width !== undefined ? (typeof width === 'number' ? `${width}px` : width) : `${mobileSize}px`} !important;
          height: ${height !== undefined ? (typeof height === 'number' ? `${height}px` : height) : `${mobileSize}px`} !important;
          max-width: 100%;
          max-height: 100%;
        }
        @media (min-width: 768px) {
          .logo-res-${styleId} {
            width: ${width !== undefined ? (typeof width === 'number' ? `${width}px` : width) : `${desktopSize}px`} !important;
            height: ${height !== undefined ? (typeof height === 'number' ? `${height}px` : height) : `${desktopSize}px`} !important;
          }
        }
      `}</style>
      <img 
        src={logoUrl} 
        alt="Logo" 
        className={`object-contain logo-res-${styleId} ${variantClasses[variant]} ${className}`}
        referrerPolicy="no-referrer"
      />
    </>
  );
};

export const LogoText = ({ className = "" }: { className?: string }) => (
  <span className={`font-black tracking-tighter ${className}`}>
    Errand<span className="text-primary">Runner</span>
  </span>
);
