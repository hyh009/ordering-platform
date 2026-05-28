import { Building2, Leaf, LayoutDashboard, Nut } from 'lucide-react';
import { useAppTranslation } from '@/app/i18n';
import { PATHS } from '@/app/routing/paths';
import { SidebarNavItem } from '@/app/layout/SidebarNavItem';

export function SuperAdminSidebar() {
  const { tDefault } = useAppTranslation();

  return (
    <aside className="flex w-60 shrink-0 flex-col overflow-y-auto border-r border-border bg-card">
      <nav
        aria-label={tDefault('app.navigation.label', 'Main navigation')}
        className="flex-1 p-3"
      >
        <ul className="flex flex-col gap-0.5">
          <SidebarNavItem
            icon={LayoutDashboard}
            label={tDefault('app.navigation.overview', 'Overview')}
            to={PATHS.SUPER_ADMIN.OVERVIEW}
          />
          <SidebarNavItem
            icon={Building2}
            label={tDefault('app.navigation.organizations', 'Organizations')}
            to={PATHS.SUPER_ADMIN.ORGANIZATIONS}
          />
          <SidebarNavItem
            icon={Nut}
            label={tDefault('app.navigation.allergens', 'Allergens')}
            to={PATHS.SUPER_ADMIN.ALLERGENS}
          />
          <SidebarNavItem
            icon={Leaf}
            label={tDefault('app.navigation.dietaryMarkers', 'Dietary Markers')}
            to={PATHS.SUPER_ADMIN.DIETARY_MARKERS}
          />
        </ul>
      </nav>
    </aside>
  );
}
