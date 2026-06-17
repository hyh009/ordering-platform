import { useEffect, useRef } from 'react';
import { useAppTranslation } from '@/app/i18n';
import { cn } from '@/shared/utils/cn';

export type MenuCategoryTab = { key: string; label: string };

interface MenuCategoryTabsProps {
  tabs: MenuCategoryTab[];
  activeKey: string | null;
  onSelect: (key: string) => void;
}

/**
 * Horizontally scrollable category tabs for the storefront menu. Selecting a tab
 * scrolls its section into view; while the guest scrolls the active tab tracks
 * the visible section (see the menu VM scroll-spy) and re-centers itself here.
 */
export function MenuCategoryTabs({
  tabs,
  activeKey,
  onSelect,
}: MenuCategoryTabsProps) {
  const { tDefault } = useAppTranslation();
  const navRef = useRef<HTMLElement | null>(null);
  const activeRef = useRef<HTMLButtonElement | null>(null);

  // Keep the highlighted tab visible as scroll-spy moves it along the strip.
  // Scroll only the strip horizontally — using scrollIntoView here would issue a
  // competing smooth scroll that cancels the section scroll a tap just started.
  useEffect(() => {
    const nav = navRef.current;
    const button = activeRef.current;
    if (!nav || !button) return;
    const left = button.offsetLeft - (nav.clientWidth - button.clientWidth) / 2;
    nav.scrollTo({ left, behavior: 'smooth' });
  }, [activeKey]);

  return (
    <nav
      ref={navRef}
      aria-label={tDefault('guest.menu.categoriesNav', 'Menu categories')}
      className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            ref={isActive ? activeRef : undefined}
            type="button"
            onClick={() => onSelect(tab.key)}
            className={cn(
              'shrink-0 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors',
              isActive
                ? 'bg-storefront-primary text-storefront-text'
                : 'bg-storefront-primary/10 text-storefront-text-muted hover:bg-storefront-primary/20',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
