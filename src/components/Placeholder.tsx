import React from 'react';
export default function Placeholder({ name, ...props }: { name: string; [key: string]: any }) {
  return (
    <div className="p-10 text-center bg-card text-card-foreground rounded-[2rem] border border-border shadow-sm" {...props}>
      <h3 className="text-lg font-black text-foreground mb-1">{name}</h3>
      <p className="text-xs font-bold text-muted-foreground">This component is under reconstruction.</p>
    </div>
  );
}
