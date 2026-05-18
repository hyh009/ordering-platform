# Ordering Flow Diagrams

Mermaid diagrams for the current agreed ordering behavior.

MVP does not integrate online payment. Staff manually confirms payment.

## Overview

```mermaid
flowchart TD
  Start([Guest starts ordering])
  Type{Order type}
  DineIn[Dine-in]
  Takeaway[Takeaway]
  DineMode{Store dine-in checkout mode}
  PayFirst[Pay first]
  PayLater[Pay later]

  Start --> Type
  Type -->|dine_in| DineIn
  Type -->|takeaway| Takeaway
  Takeaway --> PayFirst
  DineIn --> DineMode
  DineMode -->|pay_first| PayFirst
  DineMode -->|pay_later| PayLater

  PayFirst -.-> PFData[(Cart.checkoutMode = pay_first\nsubmitted cart creates one-batch Order\nadd-ons create a new Order)]
  PayLater -.-> PLData[(Cart.checkoutMode = pay_later\nsubmitted cart creates an open unpaid Order\nadd-ons append new batches until payment)]

  classDef action fill:#fff7ed,stroke:#f97316,color:#0f172a
  classDef decision fill:#dcfce7,stroke:#16a34a,color:#0f172a
  classDef data fill:#f8fafc,stroke:#64748b,color:#0f172a
  class Start,DineIn,Takeaway,PayFirst,PayLater action
  class Type,DineMode decision
  class PFData,PLData data
```

## Pay First

Pay-first applies to takeaway and may also apply to dine-in. Dine-in pay-first
can use `tableNumber` or rely on `displayNumber` for pickup.

```mermaid
sequenceDiagram
  participant Guest
  participant System
  participant Staff
  participant Kitchen

  Guest->>System: Start pay-first order
  Note over System: Cart.status = active<br/>checkoutMode = pay_first

  Guest->>System: Add items to cart
  Note over System: Cart.items updated<br/>cart totals recalculated

  Guest->>System: Submit cart
  Note over System: Cart.status = checked_out<br/>Order created<br/>paymentStatus = unpaid<br/>Order.status = pending_confirmation<br/>one Batch.status = pending_confirmation

  Staff->>System: Confirm order content and payment
  Note over System: paymentStatus = paid<br/>paidAt = now<br/>Batch.status = preparing<br/>Order.status = preparing

  Kitchen->>System: Prepare order
  Note over System: No required status change<br/>staff edits may recalculate totals

  Kitchen->>System: Mark order ready
  Note over System: Batch.status = ready<br/>Order.status = ready

  Guest->>Staff: Receive order
  Staff->>System: Mark order served
  Note over System: Order.status = served<br/>servedAt = now

  Staff->>System: Complete order
  Note over System: Order.status = completed<br/>completedAt = now

  opt Guest wants more
    Guest->>System: Start a separate new order
    Note over System: Pay-first add-ons always create a new Cart/Order<br/>They do not wait for the previous order to complete
  end
```

## Pay Later

Pay-later currently applies to dine-in. Guests may add more before payment.
Payment locks guest add-ons but does not complete the order; existing batches
continue until staff marks the service complete.

```mermaid
sequenceDiagram
  participant Guest
  participant System
  participant Staff
  participant Kitchen

  Guest->>System: Start dine-in pay-later order
  Note over System: Cart.status = active<br/>checkoutMode = pay_later<br/>joinCode generated<br/>tableNumber optional

  Guest->>System: Add items to cart
  Note over System: Cart.participants/items updated<br/>cart totals recalculated

  Guest->>System: Submit first batch
  Note over System: Cart.status = checked_out<br/>Order created<br/>paymentStatus = unpaid<br/>Order.status = pending_confirmation<br/>first Batch.status = pending_confirmation<br/>joinCode routes to order

  opt Guest adds more while unpaid
    Guest->>System: Submit add-on items
    Note over System: May happen before or after ready/served<br/>if not paid/completed/cancelled<br/>append pending batch<br/>append Order.items<br/>recalculate totals<br/>Order.status may return to pending_confirmation
  end

  opt Staff takes payment before service
    Staff->>System: Confirm payment
    Note over System: paymentStatus = paid<br/>paidAt = now<br/>joinCode invalid<br/>no more guest add-ons
  end

  loop While order has active pending/preparing batches
    Staff->>System: Confirm a pending batch
    Note over System: Batch.status = preparing<br/>confirmedAt = now<br/>Order.status = preparing unless another batch is pending

    Kitchen->>System: Prepare batch
    Note over System: No required status change<br/>staff edits may recalculate totals

    Kitchen->>System: Mark batch ready
    Note over System: Batch.status = ready<br/>readyAt = now<br/>Order.status = ready when all active batches are ready
  end

  Staff->>System: Mark order served
  Note over System: Order.status = served<br/>servedAt = now

  alt paymentStatus = unpaid after service
    Staff->>System: Confirm payment
    Note over System: paymentStatus = paid<br/>paidAt = now<br/>joinCode invalid<br/>no more guest add-ons
  else payment already confirmed
    Note over System: Continue with paymentStatus = paid
  end

  Staff->>System: Complete order
  Note over System: Order.status = completed<br/>completedAt = now
```
