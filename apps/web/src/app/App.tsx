import { lazy, type ComponentType } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { RouteErrorBoundary } from '@/app/error/AppErrorBoundary';
import {
  AppLayout,
  MerchantLayout,
  SuperAdminLayout,
} from '@/app/layout/AppLayout';
import { StoreFrontLayout } from '@/app/layout/StoreFrontLayout';
import { PublicLayout } from '@/app/layout/PublicLayout';
import { PATHS } from '@/app/routing/paths';
import { PublicOnly } from '@/app/routing/PublicOnly';
import { RequireActiveStore } from '@/app/routing/RequireActiveStore';
import { RequireStoreManager } from '@/app/routing/RequireStoreManager';
import { RequireAuth } from '@/app/routing/RequireAuth';
import { RequireSuperAdmin } from '@/app/routing/RequireSuperAdmin';
// Keep the 404 page eager so catch-all routes resolve without a chunk fetch.
import { NotFoundPage } from '@/pages/notFound/NotFoundPage';

/**
 * Lazily load a page by its named export so each route ships as its own chunk,
 * keeping the initial bundle small. Preserves the page's prop types at the
 * call site. The layout Outlets provide the Suspense fallback while a chunk
 * loads.
 */
function lazyPage<M, K extends keyof M>(
  loader: () => Promise<M>,
  name: K,
): M[K] {
  return lazy(() =>
    loader().then((m) => ({ default: m[name] as ComponentType })),
  ) as unknown as M[K];
}

const AllergenListPage = lazyPage(
  () => import('@/pages/admin/allergenList/AllergenListPage'),
  'AllergenListPage',
);
const DietaryMarkerListPage = lazyPage(
  () => import('@/pages/admin/dietaryMarkerList/DietaryMarkerListPage'),
  'DietaryMarkerListPage',
);
const HomePage = lazyPage(() => import('@/pages/home/HomePage'), 'HomePage');
const OrganizationDetailPage = lazyPage(
  () => import('@/pages/admin/organizationDetail/OrganizationDetailPage'),
  'OrganizationDetailPage',
);
const OrganizationListPage = lazyPage(
  () => import('@/pages/admin/organizationList/OrganizationListPage'),
  'OrganizationListPage',
);
const OrganizationMembershipsPage = lazyPage(
  () =>
    import('@/pages/admin/organizationMemberships/OrganizationMembershipsPage'),
  'OrganizationMembershipsPage',
);
const StoreCreatePage = lazyPage(
  () => import('@/pages/admin/storeCreate/StoreCreatePage'),
  'StoreCreatePage',
);
const StoreListPage = lazyPage(
  () => import('@/pages/admin/storeList/StoreListPage'),
  'StoreListPage',
);
const LoginPage = lazyPage(() => import('@/pages/login/LoginPage'), 'LoginPage');
const CartPage = lazyPage(
  () => import('@/pages/storeFront/cart/CartPage'),
  'CartPage',
);
const JoinEntryPage = lazyPage(
  () => import('@/pages/storeFront/join/JoinEntryPage'),
  'JoinEntryPage',
);
const JoinPage = lazyPage(
  () => import('@/pages/storeFront/join/JoinPage'),
  'JoinPage',
);
const InvitePage = lazyPage(
  () => import('@/pages/storeFront/invite/InvitePage'),
  'InvitePage',
);
const LandingPage = lazyPage(
  () => import('@/pages/storeFront/landing/LandingPage'),
  'LandingPage',
);
const MenuPage = lazyPage(
  () => import('@/pages/storeFront/menu/MenuPage'),
  'MenuPage',
);
const OrderTrackingPage = lazyPage(
  () => import('@/pages/storeFront/order/OrderTrackingPage'),
  'OrderTrackingPage',
);
const OrderHistoryPage = lazyPage(
  () => import('@/pages/storeFront/orderHistory/OrderHistoryPage'),
  'OrderHistoryPage',
);
const CategoryListPage = lazyPage(
  () => import('@/pages/merchant/categoryList/CategoryListPage'),
  'CategoryListPage',
);
const ProductCreatePage = lazyPage(
  () => import('@/pages/merchant/productCreate/ProductCreatePage'),
  'ProductCreatePage',
);
const ProductDetailPage = lazyPage(
  () => import('@/pages/merchant/productDetail/ProductDetailPage'),
  'ProductDetailPage',
);
const ProductListPage = lazyPage(
  () => import('@/pages/merchant/productList/ProductListPage'),
  'ProductListPage',
);
const ProductModifierCreatePage = lazyPage(
  () => import('@/pages/merchant/productModifierCreate/ProductModifierCreatePage'),
  'ProductModifierCreatePage',
);
const ProductModifierDetailPage = lazyPage(
  () => import('@/pages/merchant/productModifierDetail/ProductModifierDetailPage'),
  'ProductModifierDetailPage',
);
const ProductModifierListPage = lazyPage(
  () => import('@/pages/merchant/productModifierList/ProductModifierListPage'),
  'ProductModifierListPage',
);
const OrderDetailPage = lazyPage(
  () => import('@/pages/merchant/orderDetail/OrderDetailPage'),
  'OrderDetailPage',
);
const OrderListPage = lazyPage(
  () => import('@/pages/merchant/orderList/OrderListPage'),
  'OrderListPage',
);
const OrgSelectPage = lazyPage(
  () => import('@/pages/merchant/orgSelect/OrgSelectPage'),
  'OrgSelectPage',
);
const StoreSelectPage = lazyPage(
  () => import('@/pages/merchant/storeSelect/StoreSelectPage'),
  'StoreSelectPage',
);
const StoreSettingsPage = lazyPage(
  () => import('@/pages/merchant/storeSettings/StoreSettingsPage'),
  'StoreSettingsPage',
);
const TagListPage = lazyPage(
  () => import('@/pages/merchant/tagList/TagListPage'),
  'TagListPage',
);

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RouteErrorBoundary />}>
          <Route element={<PublicLayout />}>
            <Route element={<HomePage />} path={PATHS.PUBLIC.HOME} />
          </Route>

          {/* Public storefront ordering never initializes management auth. */}
          <Route element={<StoreFrontLayout />}>
            <Route element={<LandingPage />} path={PATHS.STOREFRONT.LANDING} />
            <Route
              element={<JoinEntryPage />}
              path={PATHS.STOREFRONT.JOIN_ENTRY}
            />
            <Route element={<JoinPage />} path={PATHS.STOREFRONT.JOIN} />
            <Route element={<MenuPage />} path={PATHS.STOREFRONT.MENU} />
            <Route element={<InvitePage />} path={PATHS.STOREFRONT.INVITE} />
            <Route element={<CartPage />} path={PATHS.STOREFRONT.CART} />
            <Route
              element={<OrderHistoryPage />}
              path={PATHS.STOREFRONT.ORDER_HISTORY}
            />
            <Route
              element={<OrderTrackingPage />}
              path={PATHS.STOREFRONT.ORDER}
            />
            <Route
              element={<NotFoundPage destination="home" embedded />}
              path="/s/*"
            />
          </Route>

          <Route element={<PublicOnly />}>
            <Route element={<PublicLayout />}>
              <Route element={<LoginPage />} path={PATHS.AUTH.LOGIN} />
            </Route>
          </Route>

          <Route element={<RequireAuth />}>
            {/* Super admin platform: /admin/* with sidebar */}
            <Route element={<SuperAdminLayout />}>
              <Route element={<RequireSuperAdmin />}>
                <Route
                  element={
                    <Navigate replace to={PATHS.SUPER_ADMIN.ORGANIZATIONS} />
                  }
                  path={PATHS.SUPER_ADMIN.ROOT}
                />
                <Route
                  element={
                    <Navigate replace to={PATHS.SUPER_ADMIN.ORGANIZATIONS} />
                  }
                  path={PATHS.SUPER_ADMIN.OVERVIEW}
                />
                <Route
                  element={<OrganizationListPage />}
                  path={PATHS.SUPER_ADMIN.ORGANIZATIONS}
                />
                <Route
                  element={<OrganizationDetailPage />}
                  path={PATHS.SUPER_ADMIN.ORGANIZATION_DETAIL}
                />
                <Route
                  element={<OrganizationMembershipsPage />}
                  path={PATHS.SUPER_ADMIN.ORGANIZATION_MEMBERSHIPS}
                />
                <Route
                  element={<StoreListPage />}
                  path={PATHS.SUPER_ADMIN.STORE_LIST}
                />
                <Route
                  element={<StoreCreatePage />}
                  path={PATHS.SUPER_ADMIN.STORE_CREATE}
                />
                <Route
                  element={<AllergenListPage />}
                  path={PATHS.SUPER_ADMIN.ALLERGENS}
                />
                <Route
                  element={<DietaryMarkerListPage />}
                  path={PATHS.SUPER_ADMIN.DIETARY_MARKERS}
                />
                <Route element={<NotFoundPage embedded />} path="/admin/*" />
              </Route>
            </Route>

            {/* Merchant selection: no sidebar */}
            <Route element={<AppLayout />}>
              <Route
                element={<Navigate replace to={PATHS.MERCHANT.SELECT_ORG} />}
                path={PATHS.MERCHANT.ROOT}
              />
              <Route
                element={<OrgSelectPage />}
                path={PATHS.MERCHANT.SELECT_ORG}
              />
              <Route
                element={<StoreSelectPage />}
                path={PATHS.MERCHANT.SELECT_STORE}
              />
            </Route>

            {/* Merchant platform: /merchant/* with sidebar */}
            <Route element={<MerchantLayout />}>
              {/* Store-scoped pages require active org and store selection */}
              <Route element={<RequireActiveStore />}>
                <Route
                  element={<ProductListPage />}
                  path={PATHS.MERCHANT.MENU}
                />
                <Route
                  element={
                    <RequireStoreManager redirectTo={PATHS.MERCHANT.MENU} />
                  }
                >
                  <Route
                    element={<ProductCreatePage />}
                    path={PATHS.MERCHANT.MENU_CREATE}
                  />
                </Route>
                <Route
                  element={<ProductDetailPage />}
                  path={PATHS.MERCHANT.MENU_DETAIL}
                />
                <Route
                  element={<OrderListPage />}
                  path={PATHS.MERCHANT.ORDERS}
                />
                <Route
                  element={<OrderDetailPage />}
                  path={PATHS.MERCHANT.ORDER_DETAIL}
                />
                <Route
                  element={<StoreSettingsPage />}
                  path={PATHS.MERCHANT.STORE_SETTINGS}
                />
                <Route
                  element={<CategoryListPage />}
                  path={PATHS.MERCHANT.CATEGORIES}
                />
                <Route
                  element={<ProductModifierListPage />}
                  path={PATHS.MERCHANT.MODIFIERS}
                />
                <Route
                  element={
                    <RequireStoreManager
                      redirectTo={PATHS.MERCHANT.MODIFIERS}
                    />
                  }
                >
                  <Route
                    element={<ProductModifierCreatePage />}
                    path={PATHS.MERCHANT.MODIFIER_CREATE}
                  />
                </Route>
                <Route
                  element={<ProductModifierDetailPage />}
                  path={PATHS.MERCHANT.MODIFIER_DETAIL}
                />
                <Route element={<TagListPage />} path={PATHS.MERCHANT.TAGS} />
              </Route>

              <Route element={<NotFoundPage embedded />} path="/merchant/*" />
            </Route>
          </Route>

          {/* Public catch-all 404. Keep random URLs out of management auth. */}
          <Route element={<PublicLayout />}>
            <Route element={<NotFoundPage destination="home" />} path="*" />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
