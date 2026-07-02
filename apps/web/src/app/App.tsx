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
import { AllergenListPage } from '@/pages/admin/allergenList/AllergenListPage';
import { DietaryMarkerListPage } from '@/pages/admin/dietaryMarkerList/DietaryMarkerListPage';
import { HomePage } from '@/pages/home/HomePage';
import { OrganizationDetailPage } from '@/pages/admin/organizationDetail/OrganizationDetailPage';
import { OrganizationListPage } from '@/pages/admin/organizationList/OrganizationListPage';
import { OrganizationMembershipsPage } from '@/pages/admin/organizationMemberships/OrganizationMembershipsPage';
import { StoreCreatePage } from '@/pages/admin/storeCreate/StoreCreatePage';
import { StoreListPage } from '@/pages/admin/storeList/StoreListPage';
import { LoginPage } from '@/pages/login/LoginPage';
import { CartPage } from '@/pages/storeFront/cart/CartPage';
import { JoinEntryPage } from '@/pages/storeFront/join/JoinEntryPage';
import { JoinPage } from '@/pages/storeFront/join/JoinPage';
import { InvitePage } from '@/pages/storeFront/invite/InvitePage';
import { LandingPage } from '@/pages/storeFront/landing/LandingPage';
import { MenuPage } from '@/pages/storeFront/menu/MenuPage';
import { OrderTrackingPage } from '@/pages/storeFront/order/OrderTrackingPage';
import { OrderHistoryPage } from '@/pages/storeFront/orderHistory/OrderHistoryPage';
import { CategoryListPage } from '@/pages/merchant/categoryList/CategoryListPage';
import { ProductCreatePage } from '@/pages/merchant/productCreate/ProductCreatePage';
import { ProductDetailPage } from '@/pages/merchant/productDetail/ProductDetailPage';
import { ProductListPage } from '@/pages/merchant/productList/ProductListPage';
import { ProductModifierCreatePage } from '@/pages/merchant/productModifierCreate/ProductModifierCreatePage';
import { ProductModifierDetailPage } from '@/pages/merchant/productModifierDetail/ProductModifierDetailPage';
import { ProductModifierListPage } from '@/pages/merchant/productModifierList/ProductModifierListPage';
import { OrderDetailPage } from '@/pages/merchant/orderDetail/OrderDetailPage';
import { OrderListPage } from '@/pages/merchant/orderList/OrderListPage';
import { OrgSelectPage } from '@/pages/merchant/orgSelect/OrgSelectPage';
import { StoreSelectPage } from '@/pages/merchant/storeSelect/StoreSelectPage';
import { StoreSettingsPage } from '@/pages/merchant/storeSettings/StoreSettingsPage';
import { TagListPage } from '@/pages/merchant/tagList/TagListPage';
import { NotFoundPage } from '@/pages/notFound/NotFoundPage';

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
