import { Link, NavLink } from 'react-router';
import { useAppTranslation } from '@/app/i18n';
import logoUrl from '@/assets/logo.svg';
import type { AppHeaderProps } from './AppShell';

export function AppHeader({
  appName,
  healthUrl,
  isAuthenticated,
  isSuperAdmin = false,
  language,
  languageOptions,
  onLanguageChange,
  onLogout,
  onNavigateHome,
  swaggerUrl,
  username,
}: AppHeaderProps) {
  const { tDefault } = useAppTranslation();

  return (
    <header className="flex min-h-16 items-center justify-between gap-4 border-b border-border bg-card px-5 py-3 md:px-8">
      <Link
        className="flex items-center gap-2 text-sm font-bold text-foreground"
        to="/"
      >
        <img
          alt=""
          className="h-8 w-8 shrink-0 text-foreground"
          src={logoUrl}
        />
        {appName}
      </Link>
      <nav
        className="flex flex-wrap items-center justify-end gap-3 text-sm font-semibold text-muted-foreground"
        aria-label={tDefault('app.navigation.label', 'Main navigation')}
      >
        {isAuthenticated ? (
          <button
            className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-muted-foreground hover:text-primary"
            onClick={onNavigateHome}
            type="button"
          >
            {isSuperAdmin
              ? tDefault('app.navigation.home', 'Organizations')
              : tDefault('app.navigation.userHome', 'Home')}
          </button>
        ) : null}
        {isAuthenticated && isSuperAdmin ? (
          <>
            <NavLink className="hover:text-primary" to="/admin/allergens">
              {tDefault('app.navigation.allergens', 'Allergens')}
            </NavLink>
            <NavLink className="hover:text-primary" to="/admin/dietary-markers">
              {tDefault('app.navigation.dietaryMarkers', 'Dietary markers')}
            </NavLink>
          </>
        ) : null}
        <a className="hover:text-primary" href={healthUrl}>
          {tDefault('app.navigation.apiHealth', 'API health')}
        </a>
        <a className="hover:text-primary" href={swaggerUrl}>
          {tDefault('app.navigation.swaggerDocs', 'Swagger docs')}
        </a>
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
        {isAuthenticated ? (
          <div className="flex items-center gap-3">
            {username ? (
              <span className="hidden text-foreground sm:inline">
                {username}
              </span>
            ) : null}
            <button
              className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-muted-foreground hover:text-primary"
              onClick={onLogout}
              type="button"
            >
              {tDefault('app.navigation.logout', 'Logout')}
            </button>
          </div>
        ) : null}
      </nav>
    </header>
  );
}
