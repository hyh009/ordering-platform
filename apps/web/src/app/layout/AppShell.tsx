import type { ReactNode } from 'react';
import type { SupportedLanguage } from '@/app/i18n/languages';
import { AppHeader } from './AppHeader';

type LanguageOption = {
  label: string;
  value: SupportedLanguage;
};

export type AppHeaderProps = {
  appName: string;
  environment?: string;
  /** Merchant-only header content (org/store switcher) rendered after the brand. */
  headerContext?: ReactNode;
  isAuthenticated: boolean;
  isSuperAdmin?: boolean;
  language: SupportedLanguage;
  languageOptions: LanguageOption[];
  onLanguageChange: (language: string) => void | Promise<void>;
  onLogout: () => void;
  username?: string;
};

type AppShellProps = AppHeaderProps & {
  children: ReactNode;
  sidebar?: ReactNode;
};

export function AppShell({ children, sidebar, ...headerProps }: AppShellProps) {
  return (
    <div className={sidebar ? undefined : 'min-h-screen'}>
      <AppHeader {...headerProps} />
      {sidebar ? (
        <div className="app-shell-body flex">
          {sidebar}
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      ) : (
        <main>{children}</main>
      )}
    </div>
  );
}
