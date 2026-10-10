import {
  ClipboardList,
  LayoutGrid,
  MessagesSquare,
  Settings,
  SlidersHorizontal,
  Tag,
  UtensilsCrossed,
} from 'lucide-react';
import { useAppTranslation } from '@/app/i18n';
import { PATHS } from '@/app/routing/paths';
import { SidebarNavItem } from '@/app/layout/SidebarNavItem';

export function MerchantSidebar() {
  const { tDefault } = useAppTranslation();

  return (
    <aside className="flex w-60 shrink-0 flex-col overflow-y-auto border-r border-border bg-card">
      <nav
        aria-label={tDefault('app.navigation.label', 'Main navigation')}
        className="flex-1 p-3"
      >
        <ul className="flex flex-col gap-0.5">
          <SidebarNavItem
            icon={UtensilsCrossed}
            label={tDefault('app.navigation.menu', 'Menu')}
            to={PATHS.MERCHANT.MENU}
          />
          <SidebarNavItem
            icon={ClipboardList}
            label={tDefault('app.navigation.orders', 'Orders')}
            to={PATHS.MERCHANT.ORDERS}
          />
          <SidebarNavItem
            icon={Settings}
            label={tDefault('app.navigation.storeSettings', 'Store Settings')}
            to={PATHS.MERCHANT.STORE_SETTINGS}
          />
          <SidebarNavItem
            icon={LayoutGrid}
            label={tDefault('app.navigation.categories', 'Categories')}
            to={PATHS.MERCHANT.CATEGORIES}
          />
          <SidebarNavItem
            icon={SlidersHorizontal}
            label={tDefault('app.navigation.modifiers', 'Modifiers')}
            to={PATHS.MERCHANT.MODIFIERS}
          />
          <SidebarNavItem
            icon={Tag}
            label={tDefault('app.navigation.tags', 'Tags')}
            to={PATHS.MERCHANT.TAGS}
          />
          {/*
            Points at the list, not the unanswered page: that one is reachable
            from the list's own header, and every entry here competes with the
            six above it. `NavLink` matches descendants by default, so this
            stays highlighted while reading one conversation.
          */}
          <SidebarNavItem
            icon={MessagesSquare}
            label={tDefault(
              'app.navigation.aiConversations',
              'Assistant Chats',
            )}
            to={PATHS.MERCHANT.AI_CONVERSATIONS}
          />
        </ul>
      </nav>
    </aside>
  );
}
