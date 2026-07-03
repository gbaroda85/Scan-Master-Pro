import React from 'react';
import { useLocation, Link } from 'wouter';
import { Home, FolderOpen, Camera, Search, Settings as SettingsIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface BottomNavProps {
  onSearchClick: () => void;
  onSettingsClick: () => void;
  onFoldersClick: () => void;
}

export function BottomNav({ onSearchClick, onSettingsClick, onFoldersClick }: BottomNavProps) {
  const [location] = useLocation();
  const isHome = location === '/' || location === '';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="relative flex items-end justify-between px-4 pt-2 pb-2 max-w-lg mx-auto">
        <NavItem
          icon={<Home className="w-6 h-6" strokeWidth={2} />}
          label="Home"
          active={isHome}
          onClick={() => {}}
          asLink="/"
        />
        <NavItem
          icon={<FolderOpen className="w-6 h-6" strokeWidth={2} />}
          label="Folders"
          active={false}
          onClick={onFoldersClick}
        />

        {/* Raised center Scan button */}
        <Link href="/capture" className="flex flex-col items-center gap-1 -mt-8 flex-1">
          <div
            className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg ring-4 ring-card transition-transform active:scale-95 hover:scale-105"
            data-testid="btn-scan-nav"
          >
            <Camera className="w-7 h-7" strokeWidth={2} />
          </div>
          <span className="text-xs font-bold text-foreground">Scan</span>
        </Link>

        <NavItem
          icon={<Search className="w-6 h-6" strokeWidth={2} />}
          label="Search"
          active={false}
          onClick={onSearchClick}
        />
        <NavItem
          icon={<SettingsIcon className="w-6 h-6" strokeWidth={2} />}
          label="Settings"
          active={false}
          onClick={onSettingsClick}
        />
      </div>
    </nav>
  );
}

function NavItem({
  icon, label, active, onClick, asLink,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  asLink?: string;
}) {
  const content = (
    <div className={cn('flex flex-col items-center gap-1 flex-1 py-1', active ? 'text-primary' : 'text-foreground/80')}>
      {icon}
      <span className={cn('text-xs', active ? 'font-bold text-foreground' : 'font-semibold text-foreground/90')}>
        {label}
      </span>
    </div>
  );

  if (asLink) {
    return <Link href={asLink} data-testid={`nav-${label.toLowerCase()}`}>{content}</Link>;
  }

  return (
    <button onClick={onClick} data-testid={`nav-${label.toLowerCase()}`} className="flex-1">
      {content}
    </button>
  );
}
