import type { ReactNode } from 'react';
import type { SupportedLanguage } from '@/app/i18n/languages';
import { AppHeader } from './AppHeader';

type LanguageOption = {
  label: string;
  value: SupportedLanguage;
};

export type AppHeaderProps = {
  appName: string;
  healthUrl: string;
  isAuthenticated: boolean;
  isSuperAdmin?: boolean;
  language: SupportedLanguage;
  languageOptions: LanguageOption[];
  onLanguageChange: (language: string) => void | Promise<void>;
  onLogout: () => void;
  onNavigateHome: () => void;
  swaggerUrl: string;
  username?: string;
};

type AppShellProps = AppHeaderProps & {
  children: ReactNode;
};

export function AppShell({ children, ...headerProps }: AppShellProps) {
  return (
    <div className="min-h-screen">
      <AppHeader {...headerProps} />
      <main>{children}</main>
    </div>
  );
}
