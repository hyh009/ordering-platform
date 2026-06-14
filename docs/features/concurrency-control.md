# Concurrency Control — Write Patterns & Optimistic Locking

How backend writes guard against **lost updates** (two concurrent writers each
read a document, mutate it, and the later write silently clobbers the earlier
one). This is a per-repository audit plus the convention to follow when adding
or changing a write path.

## The one problem this addresses

Lost update only arises on **read-modify-write (RMW)**: load a document → mutate
in memory → save the whole thing back. If two requests interleave, the second
save overwrites fields the first one changed. Pure inserts, pure reads, and
single-statement atomic operators (`$set`/`$inc`/`$push`/`$pull`) are not
exposed to it.

So the question for any write is never "does it need a lock" but: **is it RMW,
and does a lost update have a cost?**

## Two mechanisms in this codebase (one real, one inert)

1. **`expectedUpdatedAt` compare-and-set (CAS) — the real convention.** The
   atomic-update repos accept `options.expectedUpdatedAt` and fold it into the
   `findOneAndUpdate` filter (`{ id, updatedAt: expected }`). A stale write
   matches zero documents and returns `null`, signalling a conflict. Used by
   `order`, `cart`, `product`, `productModifier`.

2. **`optimisticConcurrency: true` schema flag — currently inert.** Set on the
   `order` and `cart` schemas (`models/order/mongo.ts:183`,
   `models/cart/mongo.ts:222`), but mongoose only enforces the `__v` version
   check on the **`.save()`** path. Those repos update via `findOneAndUpdate`,
   which ignores it. So the flag does nothing today; the actual guard is
   mechanism (1). It only becomes meaningful for an RMW `.save()` repo — which
   is exactly where it is **not** enabled (`store`).

## The convention to follow

Order of preference when writing a mutation:

1. **Prefer atomic operators / compare-and-set.** Express the change as
   `$set`/`$inc`/`$push`/`$pull` via `findOneAndUpdate`, and put any
   precondition in the _filter_ (current status, `updatedAt`). No full-document
   round-trip, no lock needed. `authSession.consumeActiveRefreshToken`
   (`repositories/authSession/mongo.repository.ts:50`) is the model example —
   `{ refreshTokenHash, revokedAt: null, expiresAt: { $gt: now } }` makes
   token rotation a single atomic CAS.

2. **If you must RMW** (e.g. cross-field subdocument validators require loading
   the whole document — see `store` below), guard the write with optimistic
   locking and retry. The established retry shape lives in
   `services/guestOrdering.service.ts:168`:

   ```ts
   for (let attempt = 0; attempt < OPTIMISTIC_WRITE_ATTEMPTS; attempt += 1) {
     const order = await orderRepository.findById(orderId);
     if (!order) throw new NotFoundError(...);
     const input = await mutate(order);
     const updated = await orderRepository.update(orderId, input, {
       expectedUpdatedAt: order.updatedAt,   // CAS precondition
     });
     if (updated) return updated;            // null === lost the race, retry
   }
   throw new ConflictError('… was modified concurrently, please retry', …);
   ```

   For a true `.save()` RMW path, the equivalent guard is
   `optimisticConcurrency: true` on the schema (which throws `VersionError` on a
   stale save) wrapped in the same retry loop.

3. **Otherwise, do nothing.** Low-contention, last-write-wins-acceptable
   resources (global metadata) should not pay the complexity of locking.

## Audit — every repository write path

Legend: **CREATE** = insert · **RMW** = findOne→mutate→save (lost-update risk) ·
**ATOMIC** = operator update, optionally with a CAS precondition.

| Repository                           | Write method                                              | Pattern                               | Guard today                    | Action                                                                  |
| ------------------------------------ | --------------------------------------------------------- | ------------------------------------- | ------------------------------ | ----------------------------------------------------------------------- |
| `store`                              | `update`                                                  | **RMW** (`findOne` + `.save()`)       | optimistic lock + retry        | DONE — optimistic lock (see gap #1)                                     |
| `order`                              | `update`                                                  | ATOMIC `$set`                         | `expectedUpdatedAt` CAS (used) | OK; `optimisticConcurrency` flag is inert noise                         |
| `cart`                               | `update`                                                  | ATOMIC `$set`                         | `expectedUpdatedAt` CAS (used) | OK; `optimisticConcurrency` flag is inert noise                         |
| `counter`                            | `nextDailyOrderSequence`                                  | ATOMIC `$inc` + `$setOnInsert` upsert | inherent                       | Already correct                                                         |
| `product`                            | `update`                                                  | ATOMIC `$set`                         | `expectedUpdatedAt` CAS (used) | OK                                                                      |
| `productModifier`                    | `update`                                                  | **RMW** (`findOne` + `.save()`)       | optimistic lock + retry        | DONE — RMW so cross-field validators run on the merged doc (see gap #2) |
| `category`                           | `update`                                                  | ATOMIC `$set`/`$unset`                | none (no CAS option)           | Low risk                                                                |
| `category`                           | `bulkSetDisplayOrder`                                     | ATOMIC `bulkWrite` (per-row `$set`)   | none, non-transactional        | Reorder race possible — see below                                       |
| `organization`                       | `update`                                                  | ATOMIC `$set` (unconditional)         | none                           | Low risk (admin, rare)                                                  |
| `organizationMembership`             | `update`                                                  | ATOMIC `$set` (unconditional)         | none                           | **Convert to compare-and-set** — role/status is security-relevant       |
| `user`                               | —                                                         | (no update method)                    | —                              | n/a; future `tokenVersion` bump must be `$inc`, not RMW                 |
| `allergen` / `dietaryMarker` / `tag` | `update`                                                  | ATOMIC `$set`/`$unset`                | none                           | No action (low contention)                                              |
| `authSession`                        | `consumeActiveRefreshToken`, `revoke`, `revokeAllForUser` | ATOMIC CAS (filter preconditions)     | inherent                       | Already correct — reference implementation                              |

`create` methods across all repos are plain inserts (CREATE) and need no lock.
All `find*`/`list*` are reads.

## Gaps & recommendations (prioritized)

1. **`store.update` — optimistic locking (DONE).** It is the only true RMW
   write, and RMW for a _legitimate_ reason: subdocument cross-field validators
   bind `this` to the document and only run on `.save()` (`supportedLocales`
   must include `defaultLocale`; business-hour open/close rules; order-mode
   uniqueness) — see `repositories/store/mongo.repository.ts`. So it cannot
   become a simple `$set` CAS. Implemented as `optimisticConcurrency: true` on
   `storeSchema` + a 3-attempt retry loop in `store.repository.update` that
   throws `ConflictError` (HTTP 409) when exhausted. An atomic alternative was
   considered and deferred — see the appendix below.

2. **`productModifier.update` — convert to RMW + optimistic lock (DONE).**
   The mirror of `store`: it _has_ cross-field invariants (`maxSelect >= minSelect`;
   `single_choice ⇒ maxSelect === 1`, `models/productModifier/mongo.ts`) but
   updates atomically with a **partial** field-level `$set`
   (`repositories/productModifier/mongo.repository.ts`), and those validators
   deliberately short-circuit on update paths (`if (typeof this.getUpdate === 'function') return true`).
   So the invariant is not enforced on update. Because updates are partial, a
   cross-field rule needs the **merged** document (persisted + patch) to be
   checked — neither a value-self-contained validator nor zod-on-the-partial can
   see the unsent siblings. The value-validator trick that works for `store`
   does **not** apply: `store`'s group is one array (one `value`), but here the
   group is three scattered scalars with no single merged `value` in update
   context. Done like `store`: `findOne` → apply partial → `.save()` (validators
   run on merged state) + `optimisticConcurrency` + 3-attempt retry →
   `ConflictError`, and the `expectedUpdatedAt` CAS was removed as redundant.
   The two `getUpdate`-short-circuit validators are now plain cross-field
   validators (they run on every save).

   **No transaction needed.** This is a single document; the read→write gap is
   exactly what optimistic locking + retry covers (re-read, re-apply the partial
   on the latest state, re-validate, re-save). Transactions are for multi-document
   atomicity, which this is not.

3. **`organizationMembership.update` — convert to compare-and-set.** Atomic but
   unconditional `$set` on `role`/`status`. No subdocuments block it, so gate
   the filter on the expected prior `role`/`status` and treat a zero-match as a
   conflict. Security-relevant (demotion/deactivation races).

4. **`category.bulkSetDisplayOrder` — reorder race.** Per-row `$set` in one
   `bulkWrite` is the right per-document primitive, but it is non-transactional
   and carries no precondition. Two concurrent reorders of the same store can
   interleave into a blended `displayOrder` sequence (`displayOrder` is not
   uniquely indexed; `listByStore` falls back to `createdAt,id`). Add a
   store/menu-scoped reorder guard only if concurrent reordering is real.

5. **`order`/`cart` `optimisticConcurrency: true` is misleading.** It implies a
   guard that `findOneAndUpdate` does not honour. Either remove the flag (the
   `expectedUpdatedAt` CAS is the true mechanism) or add a code comment so the
   next reader is not misled.

6. **Make `expectedUpdatedAt` non-optional for RMW-style service flows.** The
   CAS only protects callers that pass it. `guestOrdering.service` always does;
   `product`/`productModifier` services pass it once without a retry loop. New
   read-then-recompute flows must supply it (and ideally retry) rather than
   blind-writing.

## Decision rule (quick reference)

```
Can the change be a single atomic operator / compare-and-set?
  └─ yes → use findOneAndUpdate with the precondition in the filter. Done.
  └─ no (needs whole-document load, e.g. cross-field subdoc validation)
        └─ is it concurrency-sensitive with real lost-update cost?
              └─ yes → optimistic lock (optimisticConcurrency / expectedUpdatedAt) + retry → ConflictError
              └─ no  → leave as last-write-wins
```

Apply locking to the **RMW update class**, not to every endpoint. Inserts,
reads, atomic-operator updates, and low-contention metadata do not need it.

## Appendix — store: the atomic-update alternative (deferred)

`store.update` _could_ drop RMW (and the optimistic lock) and use a single
atomic `findOneAndUpdate` `$set`, but only if **all three** conditions hold.
They are recorded here so a future change has the decision context.

1. **Always send the whole cross-field group.** Every update must carry the
   complete `locale` object and the full 7-day `businessHours` array (each entry
   incl. `isOpen`), never a field-level partial. Otherwise a cross-field rule
   has no sibling values to compare against in update context. _Mostly already
   true:_ `isOpen` is required and `businessHoursSchema` already enforces 7
   unique days; the frontend resends the whole sub-objects.

2. **Rewrite validators to be value-self-contained (no `this`).** Update
   validators run with `this` bound to the **query, not the document**, so any
   validator reading `this.<sibling>` breaks under `findOneAndUpdate`. The
   cross-field checks must move from field level to the parent path, reading
   siblings from `value`:
   - business-hour open/close rule → a validator on the `businessHours` array
     (`value.every(h => !h.isOpen || h.openTime !== h.closeTime || h.openTime === '00:00')`),
     replacing the `this.isOpen`/`this.openTime` validator on `closeTime`
     (`models/store/mongo.ts`).
   - `supportedLocales`-includes-`defaultLocale` → a validator on the `locale`
     object, replacing the `this.defaultLocale` one.

3. **Verify mongoose actually runs the array validators on `$set`.** Update
   validators on nested subdocument arrays are unreliable and depend on the
   exact `$set` path shape (`$set: { 'operation.businessHours': [...] }` vs
   `$set: { operation: {...} }` behave differently; parent validators do not
   reliably cascade). This needs a real DB-backed integration test, not the
   current `validateSync` unit tests.

**Decision: not now.** store settings are low-frequency, low-contention admin
edits. The `.save()` path is the robust, well-trodden full-document validation
route, and the optimistic lock we added is cheap. The atomic rewrite trades that
robustness for mongoose update-validator edge cases to win throughput store does
not need. Revisit only if store writes become high-frequency or the lock starts
visibly retrying / returning 409s.

## Related code

- Retry + `ConflictError` reference: `services/guestOrdering.service.ts:168`
- CAS repository option: `repositories/order/mongo.repository.ts` (`expectedUpdatedAt`)
- Atomic CAS reference: `repositories/authSession/mongo.repository.ts:50`
- store RMW + optimistic lock: `repositories/store/mongo.repository.ts`
  (`update`), `models/store/mongo.ts` (`optimisticConcurrency`)
- store optimistic-lock tests: `tests/store.repository.test.ts`
