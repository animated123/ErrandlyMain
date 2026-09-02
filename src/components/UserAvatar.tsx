import React from 'react';
import { User as UserIcon } from 'lucide-react';

interface UserAvatarProps {
  src?: string | null;
  name?: string;
  className?: string;
  size?: number;
  isVerified?: boolean;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ src, name, className = "w-12 h-12", size = 24, isVerified }) => {
  const [error, setError] = React.useState(false);

  const getFallbackUrl = () => {
    if (!name) return null;
    // Using a consistent primary color background (Teal-ish) instead of random
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D9488&color=fff&bold=true`;
  };

  const finalSrc = error ? getFallbackUrl() : (src || getFallbackUrl());

  const avatarContent = finalSrc ? (
    <img 
      src={finalSrc} 
      alt={name || 'User'} 
      className={`${className} object-cover border border-border shadow-sm`}
      referrerPolicy="no-referrer"
      onError={() => {
        if (!error) setError(true);
      }}
    />
  ) : (
    <div className={`${className} bg-secondary flex items-center justify-center text-muted-foreground border border-border shadow-inner text-xs font-black uppercase`}>
      {name ? name[0] : <UserIcon size={size} strokeWidth={2.5} />}
    </div>
  );

  if (isVerified) {
    return (
      <div className="relative inline-block">
        {avatarContent}
        <div className="absolute -right-1 -bottom-1 bg-card text-card-foreground rounded-full p-0.5 shadow-sm border border-slate-50">
          <div className="bg-emerald-500 rounded-full p-0.5">
            <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        </div>
      </div>
    );
  }

  return avatarContent;
};

export default UserAvatar;
