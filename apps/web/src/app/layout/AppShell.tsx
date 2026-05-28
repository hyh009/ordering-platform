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
  isAuthenticated: boolean;
  isOpen?: boolean;
  isSuperAdmin?: boolean;
  language: SupportedLanguage;
  languageOptions: LanguageOption[];
  onLanguageChange: (language: string) => void | Promise<void>;
  onLogout: () => void;
  orgName?: string;
  username?: string;
};

type AppShellProps = AppHeaderProps & {
  children: ReactNode;
  sidebar?: ReactNode;
};

export function AppShell({ children, sidebar, ...headerProps }: AppShellProps) {
  return (
    <div className={sidebar ? 'flex h-screen flex-col' : 'min-h-screen'}>
      <AppHeader {...headerProps} />
      {sidebar ? (
        <div className="flex min-h-0 flex-1">
          {sidebar}
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      ) : (
        <main>{children}</main>
      )}
    </div>
  );
}
