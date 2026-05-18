# Promotions

## Purpose

Promotions define organization-owned discount rules that can be attached to
future cart or order pricing flows.

## Code Map

Backend:

- `apps/api/src/models/promotion/model.ts`
- `apps/api/src/models/promotion/mongo.ts`
- `apps/api/tests/promotion.mongo.test.ts`

Schema:

- `docs/schema/mongo.md`

## Supported Discounts

Current promotion definitions can describe these discount shapes:

- order percentage discount, such as 10% off the whole eligible order
- order fixed-amount discount, such as 50 off the eligible order
- category percentage discount, such as 10% off drinks
- category fixed-amount discount, such as 20 off items in a category
- product percentage discount, such as 15% off a specific product
- product fixed-amount discount, such as 10 off a specific product
- minimum-subtotal discount, such as 10% off when the eligible subtotal is at
  least 300

Percentage discounts use decimal rates:

- `0.1` means 10%
- `0.15` means 15%
- `1` means 100%

Fixed-amount discounts use normal non-negative monetary values. Currency,
rounding, and final calculation rules are not implemented in the schema.

Each promotion also defines `applicationBasis`:

- `item`: apply the discount to each eligible unit, such as every product in a
  selected category being 20 off
- `subtotal`: apply the discount once to the eligible subtotal, such as a
  selected category subtotal over 300 being 30 off

Order-scope promotions use `subtotal`. Promotions with `minimumSubtotal` also
use `subtotal`; the eligible subtotal basis follows the target scope.

## Target Scope

Each promotion has one target scope.

`order`:

- applies at order level
- may define `excludedProductIds`
- must not define `categoryIds`
- must not define `productIds`

`category`:

- requires at least one `categoryId`
- may define `excludedProductIds`
- must not define direct `productIds`

`product`:

- requires at least one `productId`
- must not define `categoryIds`
- must not define `excludedProductIds`

`excludedProductIds` can remove specific products from order and category target
scopes. Product scope does not support exclusions because `productIds` is
already a precise whitelist.

The TypeScript model uses separate target types for each scope:

- `PromotionOrderTarget`
- `PromotionCategoryTarget`
- `PromotionProductTarget`

Use TypeScript `satisfies PromotionTarget` when defining typed constants so
invalid target shapes fail at compile time. The Mongo schema keeps target id
arrays optional and validates the required ids based on `scope`.

## Lifecycle

Promotion statuses:

- `draft`: configured but not ready for normal application
- `active`: available for future promotion lookup/application flows
- `paused`: temporarily disabled
- `expired`: no longer active after business review or time window handling

Promotions also have:

- `startsAt`
- optional `endsAt`
- `isExclusive`
- optional `maxUsageTotal`
- `maxUsagePerOrder`, defaulting to `1`

The schema validates that `endsAt` is not earlier than `startsAt`.

## Data

Promotions are stored in the `promotions` collection and belong to an
organization through `organizationId`.

Promotion records use the shared soft-delete plugin. Business lifecycle is
represented by `status`; deletion lifecycle is represented by plugin-managed
fields such as `deleted`, `deletedAt`, and `deletedBy`.

Localized `name` is required and must contain at least one supported locale
value. `description` is optional.

## Not Implemented

The current promotion model does not support:

- applying promotions to carts or orders
- computing discounted totals
- storing applied promotion snapshots on carts or orders
- usage counters or customer-level usage tracking
- stack ordering between multiple promotions
- buy-X-get-Y
- bundle or combo discounts
- free item promotions
- coupon codes
- scheduled jobs that automatically expire promotions
- promotion management APIs
- custom query indexes

Add promotion application behavior only after the cart/order checkout service
boundary defines stacking rules and applied promotion snapshots.
