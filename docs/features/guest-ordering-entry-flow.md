# Guest Ordering Entry Flow

## Purpose

Define how a guest enters, resumes, joins, or reviews orders from a store's
Landing page.

The Landing page is the chooser for the current store. It does not display an
order-mode picker, Join Code form, or order history list until the guest chooses
the corresponding action.

## Entry Actions

Landing route:

```txt
/s/:storeId
```

The Landing page offers these actions:

- **New order**: always available while the store accepts ordering.
- **Join a friend's order**: always available.
- **Resume ordering**: shown only when this browser has a persisted active guest
  session for the route store.
- **Recent orders**: shown as a secondary link only when this browser has
  non-expired order history entries for the route store.

`Resume ordering` and `Recent orders` are different capabilities:

- Resume returns to the one active cart or unfinished order represented by the
  store's active guest session.
- Recent orders opens read-only references to orders this browser participated
  in during the last 24 hours.

## Landing State Flow

```mermaid
stateDiagram-v2
  [*] --> LandingChooser

  LandingChooser --> NewOrderOptions: Choose New order
  NewOrderOptions --> ParticipantIdentity: Choose dine-in or takeaway
  ParticipantIdentity --> Menu: Create Cart
  NewOrderOptions --> LandingChooser: Cancel

  LandingChooser --> JoinCodeEntry: Choose Join a friend's order
  JoinCodeEntry --> JoinConfirmation: Submit Join Code
  JoinCodeEntry --> LandingChooser: Back
  JoinConfirmation --> MenuOrTracking: Confirm and join

  LandingChooser --> ResumeValidation: Choose Resume ordering
  ResumeValidation --> MenuOrCart: Active cart
  ResumeValidation --> Tracking: Unfinished order
  ResumeValidation --> ResumeEndedModal: Session expired or order ended
  ResumeEndedModal --> NewOrderOptions: Acknowledge

  LandingChooser --> RecentOrders: Choose Recent orders
  RecentOrders --> ReadOnlyOrder: Choose order
  RecentOrders --> LandingChooser: Back
```

## New Order

Choosing **New order** conditionally reveals the enabled order modes on the
Landing page. The order-mode controls are hidden before this action.

- Show only modes enabled by `Store.operation.orderModes`.
- Choosing dine-in or takeaway opens participant identity selection before Cart
  creation. The guest chooses an avatar and may enter a custom display name,
  then the new Cart is created and Menu opens.
- A table number from the Landing URL is carried into dine-in ordering.
- Cancel returns to the initial Landing chooser without creating a session.
- If an active session exists, confirm before abandoning it and opening the
  order-mode choices.

Even when the store enables only one order mode, the mode is shown after the
guest chooses **New order**. This avoids creating or replacing a session from a
single ambiguous button press.

## Join A Friend's Order

Choosing **Join a friend's order** navigates to a dedicated Join Code entry
page:

```txt
/s/:storeId/join
```

Keep Join Code entry on a separate route instead of conditionally rendering it
inside Landing because it has its own input, validation, error, loading, and
back-navigation states.

Submitting a manually entered code navigates to the shared Join confirmation
route without calling the Join API:

```txt
/s/:storeId/join/:joinCode
```

Opening a shared Invite link or scanning its QR Code opens that same route. Join
confirmation shows the Join Code, avatar picker, and optional custom display
name; the Join API is called only after the guest confirms. A successful active
Cart join opens Menu, while joining an open pay-later Order opens Tracking.
Before confirmation, the page loads only the public Store summary and does not
expose group participants, Cart items, table number, or Order details.

Both entry paths join the same store-scoped Cart or Order. Joining another group
must confirm before replacing an existing active session for that store.

## Resume Ordering

Landing shows **Resume ordering** from persisted active-session presence without
validating it in advance.

```mermaid
sequenceDiagram
  participant Guest
  participant Landing
  participant Backend
  participant Session as Active guest session

  Guest->>Landing: Choose Resume ordering
  Landing->>Backend: Validate active session
  alt Active cart
    Backend-->>Landing: Cart
    Landing-->>Guest: Open Menu or Cart
  else Unfinished order
    Backend-->>Landing: Order
    Landing-->>Guest: Open Tracking
  else Expired or ended
    Backend-->>Landing: Session cannot resume
    Landing->>Session: Clear active session for this store
    Landing-->>Guest: Show previous-session-ended modal
    Guest->>Landing: Acknowledge
    Landing-->>Guest: Reveal New order mode choices
  end
```

An ended Resume attempt does not automatically create a replacement session.
The guest must still choose dine-in or takeaway.

## Recent Orders

Recent orders are a browser-local convenience, not an account-backed history or
security boundary.

- Store entries separately from the active guest session.
- Partition entries by `storeId`.
- Add or update an entry when a submitted order is created or joined.
- Keep the entry when that order becomes completed/cancelled or when another
  active session replaces it.
- Keep entries for 24 hours using a frontend TTL.
- Remove expired entries lazily when history is read.
- Remove an entry when its order API returns `not-found` or `forbidden`.
- Clearing browser storage or changing devices loses the list.

Suggested local entry:

```ts
type GuestOrderHistoryEntry = {
  orderId: string;
  token: string;
  createdAt: string;
  expiresAt: string;
};
```

Suggested store-scoped key:

```txt
ordering-platform.storeFrontOrderHistory:<storeId>
```

Each history entry keeps the token that authorizes that participant to read the
order. Opening a recent order is read-only and must not replace, resume, or clear
the store's active guest session.

Recent orders may therefore contain both unfinished and ended orders. The
Landing page still uses **Resume ordering** only for the current active session;
it does not infer Resume behavior from the history list.

The 24-hour TTL controls whether the frontend offers the order in Recent orders.
It does not require the backend to reject an otherwise valid order-view request
after 24 hours.

## Route Summary

| Route                         | Responsibility                                           |
| ----------------------------- | -------------------------------------------------------- |
| `/s/:storeId`                 | Landing chooser and conditional new-order mode selection |
| `/s/:storeId/join`            | Manual Join Code entry                                   |
| `/s/:storeId/join/:joinCode`  | Shared Join confirmation for manual entry, link, and QR  |
| `/s/:storeId/invite`          | Join Code, Invite link, QR, and copy-link actions        |
| `/s/:storeId/orders`          | Recent orders list                                       |
| `/s/:storeId/orders/:orderId` | Active tracking or read-only recent-order detail         |

## Notes

- One store keeps at most one active guest session, but may keep multiple recent
  order entries.
- Different stores keep independent active sessions and recent-order histories.
- Active tracking may use live updates; a completed or cancelled recent order is
  read-only.
- The order detail page must use the token belonging to the selected history
  entry rather than assuming the current active-session token.
