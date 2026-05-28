import type { ComponentType } from 'react';
import { NavLink } from 'react-router';
import { cn } from '@/shared/utils/cn';

type SidebarNavItemProps = {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  label: string;
  to: string;
};

export function SidebarNavItem({ icon: Icon, label, to }: SidebarNavItemProps) {
  return (
    <li>
      <NavLink
        className={({ isActive }) =>
          cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            isActive
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )
        }
        to={to}
      >
        <Icon aria-hidden className="h-4 w-4 shrink-0" />
        {label}
      </NavLink>
    </li>
  );
}
