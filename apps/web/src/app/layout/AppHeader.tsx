import { useAppTranslation } from '@/app/i18n';
import logoUrl from '@/assets/logo.svg';
import type { AppHeaderProps } from './AppShell';

function getInitials(username = '') {
  return username.slice(0, 2).toUpperCase() || '?';
}

function UserAvatar({ username }: { username?: string }) {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
      {getInitials(username)}
    </div>
  );
}

export function AppHeader({
  appName,
  environment,
  isAuthenticated,
  isOpen,
  isSuperAdmin = false,
  language,
  languageOptions,
  onLanguageChange,
  onLogout,
  orgName,
  username,
}: AppHeaderProps) {
  const { tDefault } = useAppTranslation();

  const languageSelect = (
    <>
      <label className="sr-only" htmlFor="app-language">
        {tDefault('app.navigation.language', 'Language')}
      </label>
      <select
        className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground"
        id="app-language"
        value={language}
        onChange={(event) => {
          void onLanguageChange(event.target.value);
        }}
      >
        {languageOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </>
  );

  const logoutButton = isAuthenticated ? (
    <button
      className="cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold text-muted-foreground hover:text-primary"
      onClick={onLogout}
      type="button"
    >
      {tDefault('app.navigation.logout', 'Logout')}
    </button>
  ) : null;

  if (isSuperAdmin) {
    return (
      <header className="flex h-(--app-header-height) items-center justify-between gap-4 border-b border-border bg-card px-5 md:px-8">
        <div className="flex shrink-0 items-center gap-2">
          <img alt="" className="h-8 w-8 shrink-0" src={logoUrl} />
          <span className="text-sm font-bold text-foreground">{appName}</span>
          <span className="text-sm text-muted-foreground">
            {tDefault('app.navigation.platformAdmin', 'Platform Admin')}
          </span>
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
            {tDefault('app.navigation.superAdminBadge', 'SUPER ADMIN')}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {languageSelect}
          {environment && (
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              {environment}
            </span>
          )}
          {logoutButton}
          {isAuthenticated && <UserAvatar username={username} />}
        </div>
      </header>
    );
  }

  return (
    <header className="flex h-(--app-header-height) items-center justify-between gap-4 border-b border-border bg-card px-5 md:px-8">
      <div className="flex items-center gap-2">
        <img alt="" className="h-8 w-8 shrink-0" src={logoUrl} />
        <span className="text-sm font-bold text-foreground">{appName}</span>
        {orgName && (
          <>
            <span className="h-5 w-px bg-border" />
            <span className="text-sm text-foreground">{orgName}</span>
            <span
              className={
                isOpen
                  ? 'rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground'
              }
            >
              {isOpen
                ? tDefault('app.navigation.businessOpen', '營業中')
                : tDefault('app.navigation.businessClosed', '休息中')}
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-3">
        {languageSelect}
        {logoutButton}
        {isAuthenticated && <UserAvatar username={username} />}
      </div>
    </header>
  );
}
