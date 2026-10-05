# Core Domain & Reservation Engine Overview

## 1. Project Purpose

`yoyaku-kit` is a lightweight Japanese restaurant reservation and table management system designed for a single restaurant.

### Scope

- **Single-restaurant domain**: one restaurant is the business root. Multi-tenancy and complex organization hierarchies are intentionally out of scope.
- **Concurrency-safe reservations**: application-level idempotency and PostgreSQL constraints work together to prevent duplicate bookings and double-booking.
- **Overnight business hours**: reservations use an explicit business date (`serviceDate`) so late-night sessions can cross midnight safely.
- **Guest booking**: customers can make and manage reservations without creating an account.
- **Explicit state rules**: reservation transitions are controlled by both allowed state transitions and time-based business rules.

### Roles

| Role         | Purpose                                                                                               |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| **Customer** | Checks availability, makes a reservation, views reservation details, and cancels with a private token |
| **Staff**    | Handles day-to-day reservation operations such as check-in, cancellation, and no-show handling        |
| **Manager**  | Manages tables, announcements, staff accounts, permissions, and audit logs                            |
| **Demo**     | Read-only account for online demonstrations                                                           |

## 2. Core Domain Model

The domain is intentionally small. Most business logic revolves around three core entities.

### Restaurant

The restaurant is the main business aggregate.

Key configuration includes:

- `slug`
- `timezone` — IANA timezone such as `Asia/Tokyo`
- `defaultDurationMinutes`
- `cancellationCutoffHours`
- `closedDaysOfWeek`

A restaurant has many tables, business-hour sessions, and reservations.

### RestaurantTable

Represents a physical table and is the smallest resource unit used for allocation and concurrency control.

Key fields:

- `name`
- `type`
- `capacity`
- `active`

Database constraints ensure that capacity is always positive.

### Reservation

Represents a customer booking and its lifecycle.

Key fields:

- `reservationNumber`
- `tableId`
- `idempotencyKey`
- `cancellationTokenHash`
- `startAt`
- `endAt`
- `partySize`
- `status`

Database constraints enforce basic invariants such as:

- `startAt < endAt`
- `partySize > 0`
- `UNIQUE (reservation_number)`

Each reservation belongs to a restaurant and table and has an immutable lifecycle log.

### Supporting Entities

- **BusinessHour** — defines restaurant opening sessions such as lunch and dinner.
- **ReservationLog** — immutable audit records for reservation lifecycle changes.
- **User / Account** — internal staff accounts managed through Better Auth.
- **News** — lightweight restaurant announcements.

## 3. Reservation Lifecycle

The reservation state machine is intentionally small. There is no temporary `pending` state.

```text
Customer booking / Staff manual booking
                |
                v
           [ confirmed ]
          /      |       \
         /       |        \
        v        |         v
  [completed]    |      [no_show]
                 |        /   \
                 |       /     \
                 |      v       v
                 | [completed] [confirmed]
                 |  correction  correction only
                 |
          [cancelled]
```

### States

| State       | Table occupied? | Terminal? |
| ----------- | --------------: | --------: |
| `confirmed` |             Yes |        No |
| `completed` |              No |       Yes |
| `cancelled` |              No |       Yes |
| `no_show`   |              No |      No\* |

\* `no_show → confirmed` exists only as an operational correction for an accidental no-show mark. It is not part of the normal customer flow.

Only `confirmed` reservations participate in table occupancy. `cancelled` and `no_show` reservations are excluded from the database exclusion constraint and therefore release the table.

### Time Guards

State transitions are protected by business time rules:

- **`confirmed → completed`**  
  Normally allowed only from the reservation start time onward.

- **`confirmed → no_show`**  
  Allowed only after the configured no-show grace period. A customer should not lose their table immediately because they are a few minutes late.

- **`confirmed → cancelled` — customer**  
  Allowed only before the cancellation cutoff.

- **`confirmed → cancelled` — staff/manager**  
  Can be performed manually when required by the business.

- **`no_show → confirmed`**  
  Correction only. It must not become a normal way to reopen expired bookings.

These rules belong to the domain/service layer rather than the UI.

## 4. Table Allocation

A new reservation follows this general flow:

```text
Reservation Request
        |
        v
1. Validate request
        |
        v
2. Check idempotency key
        |
        v
3. Begin transaction
        |
        v
4. Lock candidate tables
        |
        v
5. Find the best available table
        |
        v
6. Insert reservation + audit log
        |
        v
7. Commit
        |
        +----> exclusion violation -> treat as "slot unavailable"
```

### Best-Fit Allocation

Candidate tables must satisfy:

```text
capacity >= partySize
active = true
```

Candidates are evaluated in deterministic order:

```sql
ORDER BY capacity ASC, id ASC
```

The smallest table that can accommodate the party is preferred.

For example, a party of two should normally use a two-seat table before an eight-seat table.

This improves table utilization without introducing a complex optimization engine.

### Row Locking

Candidate tables are locked with `SELECT ... FOR UPDATE` during the reservation transaction.

The design intentionally uses **table row locks** rather than Redis locks, distributed locks, or time-bucket locking.

For a single restaurant, this keeps the concurrency model easy to reason about:

- lock the resource
- check availability
- create the reservation
- commit

All code paths that lock multiple tables should use the same ordering rule to reduce deadlock risk. Database deadlock detection and transaction retry remain the final safety net.

## 5. Concurrency Protection

The system uses two layers of protection.

### Application Layer

The application handles business-level coordination.

#### Idempotency

Each client submission may include an `idempotencyKey`.

The database enforces uniqueness:

```text
UNIQUE (restaurant_id, idempotency_key)
```

If a client retries the same request because of a timeout or double-click, the existing reservation can be returned instead of creating another one.

The application also locks candidate table rows before checking availability. This provides predictable behavior and allows the system to return a normal business error such as:

> No tables are available for this time.

### Database Layer

PostgreSQL is the final authority on reservation overlap.

The core invariant is enforced with an exclusion constraint:

```sql
EXCLUDE USING gist (
  table_id WITH =,
  tstzrange(start_at, end_at) WITH &&
)
WHERE (status NOT IN ('cancelled', 'no_show'));
```

This means two active reservations cannot overlap on the same table, even if an unexpected application race occurs.

Basic data integrity is also enforced by database constraints:

```sql
CHECK (start_at < end_at)
CHECK (party_size > 0)
CHECK (capacity > 0)
```

### Responsibility Boundary

**Application code** is responsible for:

- validation
- idempotency
- table selection
- user-friendly errors
- business rules

**PostgreSQL** is responsible for:

- enforcing physical invariants
- preventing impossible overlapping reservations

An exclusion violation (`23P01`) is caught and translated into a normal "table unavailable" business result instead of exposing a raw database error.

## 6. Business Hours and Service Date

Restaurant opening hours are more complicated than ordinary clock ranges because a dinner session may cross midnight.

### Service Date

`serviceDate` is the calendar date on which a business session starts.

Example:

```text
Friday dinner
18:00 -> 02:00 Saturday
```

Both:

```text
Friday 19:00
Saturday 01:30
```

belong to the same `serviceDate`:

```text
Friday
```

This prevents Saturday's closed-day rule from incorrectly disabling the final part of Friday's dinner session.

### Overnight Sessions

A session is considered overnight when:

```text
closeTime < openTime
```

For example:

```text
18:00 -> 02:00
```

means the closing timestamp is on the following calendar day.

### Slot Generation

Available start times are generated from:

- `slotIntervalMinutes`
- `defaultDurationMinutes`
- session opening time
- session closing time

The latest possible start time is:

```text
lastPossibleStart =
  sessionEnd - defaultDurationMinutes
```

This ensures the final reservation still receives the configured default dining duration.

### Timezone Strategy

Business calculations use the restaurant's configured IANA timezone.

Stored reservation timestamps use PostgreSQL `timestamptz` and represent absolute instants.

Conceptually:

```text
Local restaurant time
        |
        v
Business rule calculation
        |
        v
UTC / timestamptz storage
        |
        v
Restaurant timezone for display
```

The system therefore does not depend on the server's operating-system timezone.

## 7. RBAC

The application has three real permission levels plus a read-only demo role:

```text
manager
staff
demo
```

### Manager

Can manage:

- restaurant tables
- table activation and configuration
- reservation audit logs
- announcements
- staff accounts
- staff roles and permissions

### Staff

Can perform normal front-desk operations:

- view the reservation dashboard
- check in customers
- cancel reservations
- mark no-shows after the grace period
- create reservations on behalf of customers
- manage their own account credentials

### Demo

The demo account is designed for portfolio deployment.

It can view manager-level screens but cannot perform write operations.

The write restriction is enforced in the service layer, not only by hiding buttons in the UI.

### Server-Side Guards

Authorization is enforced on the server:

- protected pages verify the current role
- sensitive server actions require the appropriate permission
- Manager-only operations use explicit authorization checks such as `assertManager()`

Additional safety rules include:

- a user cannot delete their own currently active account
- the last manager cannot be removed or demoted
- the demo account cannot be modified or deleted

When an employee account is deleted, its reference in audit logs is set to `NULL` so historical records remain valid.

## 8. Anonymous Reservation Access

Customers do not need an account or password.

Each reservation receives a high-entropy private token.

### Token Design

The customer-facing token is generated once and stored in the database only as:

```text
sha256(rawToken)
```

With a 21-character NanoID, the token provides roughly 126 bits of entropy.

The raw token is used only when it must be delivered to the customer, for example in:

```text
/reservations/[id]?token=[token]
```

A database leak therefore does not directly expose usable customer reservation tokens.

### Retry Behavior

When an idempotent retry finds an existing reservation, the server returns the reservation result but does not regenerate or expose the raw token again.

The token is intentionally treated as a bearer credential.

### Reservation Number

Each booking is assigned a human-readable reservation number (`reservationNumber`).

- 6-character Base32 string (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`).
- Excludes ambiguous characters (`I`, `O`, `0`, `1`).
- Uniqueness enforced by PostgreSQL unique index `idx_reservations_reservation_number`; insert retries handle collisions.

### Customer Operations

With the token, a customer can:

- view reservation details and their human-readable reservation number
- view relevant booking information
- export calendar information
- cancel before the cancellation cutoff

After the cutoff, self-service cancellation is disabled and the customer is instructed to contact the restaurant.

For production deployment, reservation pages should also use protections such as:

```text
Referrer-Policy: no-referrer
Cache-Control: no-store
```

to reduce the risk of token leakage through browser behavior.

## 9. Audit Logging

Reservation state changes are recorded in an immutable lifecycle log.

Each log entry includes information such as:

```text
reservationId
action
previousStatus
newStatus
operatorId
operatorRole
note
createdAt
```

Typical entries:

```text
null        -> confirmed
confirmed   -> cancelled
confirmed   -> completed
confirmed   -> no_show
no_show     -> confirmed   # correction
```

The operator role records whether the action was performed by:

```text
customer
staff
manager
```

Audit records are kept even when an employee account is later deleted.

## 10. Architectural Decisions

### PostgreSQL as the Consistency Layer

The system intentionally relies on PostgreSQL features such as:

- GiST exclusion constraints
- `tstzrange`
- row-level locking
- standard transactions

The database is treated as the final source of truth for reservation consistency.

### Vendor Agnostic

The application uses standard PostgreSQL with `postgres.js` and Drizzle ORM.

No reservation correctness depends on a specific cloud provider.

The deployment model can therefore be adapted to services such as Neon, Supabase, or a self-hosted PostgreSQL instance.

### Simplicity over Extreme Throughput

The target is a single restaurant, not a global reservation platform.

The system deliberately avoids introducing:

- Redis distributed locks
- message queues
- multi-tenant infrastructure
- complex distributed scheduling

The goal is to keep the consistency model understandable while still handling realistic concurrent booking traffic.

### Production-Oriented Business Rules

Several seemingly small rules exist because they represent real operational problems:

- idempotency prevents duplicate submissions
- best-fit allocation improves table utilization
- deterministic lock ordering reduces deadlock risk
- no-show grace periods prevent premature table release
- service dates make overnight sessions predictable
- database exclusion constraints protect against double-booking

### Minimal CMS and UI

The CMS is intentionally limited to useful restaurant content such as basic information and announcements.

## 11. Implementation Principles

When changing reservation-related code, preserve these invariants:

1. **Never rely on UI validation for business correctness.**
2. **Never remove the database exclusion constraint as a substitute for application logic.**
3. **Never treat `cancelled` or `no_show` reservations as occupying a table.**
4. **Do not bypass time guards when changing reservation status.**
5. **Keep all reservation timestamps timezone-safe.**
6. **Use the established table lock order when locking multiple tables.**
7. **Do not return raw database errors to customers.**
8. **Do not store raw customer reservation tokens in the database.**
9. **Write an audit record for every reservation lifecycle change.**
10. **Prefer the smallest change that preserves the existing domain model.**
