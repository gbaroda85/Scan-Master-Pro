import React from 'react';
import { Camera } from 'lucide-react';
import { Link } from 'wouter';

export function FAB() {
  return (
    <Link href="/capture" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 group shadow-xl">
      <div className="bg-primary text-primary-foreground h-16 w-16 rounded-full flex items-center justify-center transition-transform active:scale-95 hover:scale-105 shadow-[0_0_20px_rgba(var(--primary),0.4)]">
        <Camera className="w-7 h-7" />
      </div>
    </Link>
  );
}