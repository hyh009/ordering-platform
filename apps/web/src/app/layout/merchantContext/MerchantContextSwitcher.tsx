import { Building2, Check, ChevronDown, Store } from 'lucide-react';
import { useAppTranslation } from '@/app/i18n';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { cn } from '@/shared/utils/cn';
import { useMerchantContextVM } from './useMerchantContextVM';

const triggerClass =
  'flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-foreground hover:bg-muted';

/**
 * Merchant header breadcrumb switcher: active organization and store, each a
 * dropdown for switching, with a live open/closed badge for the active store.
 */
export function MerchantContextSwitcher() {
  const { tDefault } = useAppTranslation();
  const vm = useMerchantContextVM();

  if (!vm.organizationName) return null;

  return (
    <div className="flex min-w-0 items-center gap-1">
      {vm.hasMultipleOrgs ? (
        <DropdownMenu>
          <DropdownMenuTrigger className={triggerClass} type="button">
            <Building2 className="size-4 shrink-0 text-muted-foreground" />
            <span className="max-w-40 truncate">{vm.organizationName}</span>
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-48">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                {tDefault('app.navigation.switchOrg', 'Switch organization')}
              </DropdownMenuLabel>
              {vm.orgOptions.map((option) => (
                <DropdownMenuItem
                  key={option.id}
                  onClick={() => vm.switchOrg(option)}
                >
                  <span className="truncate">{option.name}</span>
                  {option.isActive && <Check className="ml-auto size-4" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <span className="flex items-center gap-1.5 px-2 py-1 text-sm text-foreground">
          <Building2 className="size-4 shrink-0 text-muted-foreground" />
          <span className="max-w-40 truncate">{vm.organizationName}</span>
        </span>
      )}

      <span className="text-muted-foreground" aria-hidden>
        /
      </span>

      <DropdownMenu onOpenChange={vm.onStoreMenuOpenChange}>
        <DropdownMenuTrigger className={triggerClass} type="button">
          <Store className="size-4 shrink-0 text-muted-foreground" />
          <span className="max-w-40 truncate">
            {vm.storeName ||
              tDefault('app.navigation.noStoreSelected', 'No store selected')}
          </span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-48">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              {tDefault('app.navigation.switchStore', 'Switch store')}
            </DropdownMenuLabel>
            {vm.storesLoading && vm.storeOptions.length === 0 ? (
              <p className="px-1.5 py-1 text-sm text-muted-foreground">
                {tDefault('app.navigation.storesLoading', 'Loading stores…')}
              </p>
            ) : vm.storeOptions.length === 0 ? (
              <p className="px-1.5 py-1 text-sm text-muted-foreground">
                {tDefault(
                  'app.navigation.storesEmpty',
                  'No stores in this organization',
                )}
              </p>
            ) : (
              vm.storeOptions.map((option) => (
                <DropdownMenuItem
                  key={option.id}
                  onClick={() => vm.switchStore(option)}
                >
                  <span className="truncate">{option.name}</span>
                  {option.isActive && <Check className="ml-auto size-4" />}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {vm.isOpen !== undefined && (
        <span
          className={cn(
            'ml-1 shrink-0 rounded-full px-2 py-0.5 text-xs',
            vm.isOpen
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-muted text-muted-foreground',
          )}
        >
          {vm.isOpen
            ? tDefault('app.navigation.businessOpen', 'Open')
            : tDefault('app.navigation.businessClosed', 'Closed')}
        </span>
      )}
    </div>
  );
}
