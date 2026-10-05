# yoyaku-kit

A lightweight Japanese restaurant reservation and table management system built with Next.js 16 and PostgreSQL.

Designed specifically for small, single-location restaurants in Japan, it provides localized usage experience.

[Live demo](https://yoyaku-kit-demo.vercel.app)

## Features

### Customer

![booking](./docs/images/booking.png)
![reservation](./docs/images/reservation.png)

- Book a table without creating an account
- Receive an independent, human-readable 6-character reservation number
- Check reservation status through a secure link
- Cancel reservations within the allowed time window
- Export reservations to iCalendar

### Staff & Manager

![dashboard](./docs/images/dashboard.png)

- View and manage reservations by reservation number or customer details
- Assign and manage tables
- Check in guests and handle no-shows
- Manage restaurant information and announcements
- View reservation history and audit logs
- Role-based access control for staff and managers

### Reservation

- Automatic table allocation based on party size
- Human-readable 6-character reservation number
- Support for business hours crossing midnight
- Concurrent booking protection
- Cancellation and no-show time rules

## Tech Stack

- **Framework:** Next.js 16, React 19
- **Language:** TypeScript
- **Database:** PostgreSQL 16
- **ORM:** Drizzle ORM
- **Authentication:** Better Auth
- **UI:** Tailwind CSS 4, Radix UI, Lucide
- **Testing:** Vitest
- **Tooling:** Biome, Docker Compose

## Engineering Notes

### Preventing Double Booking

Reservation creation uses a database transaction with row-level locking, while PostgreSQL exclusion constraints provide an additional database-level guarantee against overlapping reservations.

### Human-Readable Reservation Numbers

Each reservation generates a 6-character identifier from a 32-character Base32 set (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`), excluding visually ambiguous characters (`I`, `O`, `0`, `1`). Uniqueness is enforced via a PostgreSQL unique index, while internal foreign keys and token verification continue to use the primary UUID and hash.

### Time Handling

Reservations are stored as UTC timestamps and converted using the restaurant's configured IANA timezone. Business hours can cross midnight while remaining associated with the original service date.

### Guest Reservations

Guest reservations do not require an account. Each reservation has a secure token for viewing and cancelling the booking, while only its hash is stored in the database.

## Project Structure

```text
Restaurant
├── Tables
├── Business Hours
├── Reservations
├── News
└── Staff / Managers
```

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 9+
- Docker & Docker Compose

### Installation

```bash
git clone https://github.com/aaakul/yoyaku-kit.git
cd yoyaku-kit
pnpm install
```

Create `.env` from `.env.example`, then start PostgreSQL:

```bash
docker compose up -d
```

Initialize the database:

```bash
pnpm db:init
```

Start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Default Login Credentials

Open [http://localhost:3000/sign-in](http://localhost:3000/sign-in).

| Role    | Email               | Password   |
| ------- | ------------------- | ---------- |
| Manager | `admin@example.com` | `12345678` |
| Demo    | `demo@example.com`  | `12345678` |

## Scripts

| Command          | Description                       |
| ---------------- | --------------------------------- |
| `pnpm dev`       | Start development server          |
| `pnpm build`     | Build production bundle           |
| `pnpm test`      | Run tests                         |
| `pnpm typecheck` | TypeScript typecheck              |
| `pnpm check`     | Run Biome checks                  |
| `pnpm db:init`   | Initialize database and seed data |
| `pnpm db:reset`  | Reset and seed database           |

## License

MIT
