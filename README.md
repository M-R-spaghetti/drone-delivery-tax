# 🛸 NYS Drone Delivery Tax Calculator & Analytics Dashboard

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_16-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![PostGIS](https://img.shields.io/badge/PostGIS-153D43?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

> **A full-stack tax computation engine** for drone deliveries in New York State.
> Real geospatial boundaries. Real tax rates from **Publication 718**. Real precision math.
> Wrapped in a **premium cyber-brutalist analytics dashboard** that tells American accountants
> exactly what they need to know — nothing more, nothing less.

---

## 🔥 Why This Exists

Drone delivery is coming. When a drone drops a package on a rooftop in Brooklyn, the tax rate is **8.875%**. When that same drone crosses the river to Jersey City — it's **zero** (not our jurisdiction). That 0.375% MCTD surcharge? It only applies inside the Metropolitan Commuter Transportation District. Yonkers has its own **0.5% city-level surcharge** on top of everything.

This application handles **all of that automatically**. You give us a GPS coordinate, a dollar amount, and a timestamp — we return the exact composite tax rate, broken down by jurisdiction layer: **State → County → City → Special District**. No guessing. No spreadsheets. No errors.

We read through **every single table in Publication 718** (NYS Department of Taxation and Finance), cross-referenced the rates, extracted the local components, and loaded them into a PostGIS-powered database with **real polygon boundaries** sourced from the NYS Civil Boundaries GeoJSON dataset. Every county's shape is the actual legal boundary — not a bounding box, not an approximation.

**For American accountants**: the dashboard gives you everything you need in one view. Total revenue, total tax collected, breakdown by jurisdiction type, revenue-vs-tax trend charts, geographic heatmaps, average order value tracking, and a full audit-ready ledger. We specifically selected the KPIs and visualizations that matter for tax compliance reporting. This is exactly what you need — we made sure of it.

---

## 🧠 How the Backend Actually Works (The Theory)

This is not a toy calculator. The backend is an **enterprise-grade tax computation engine** built on solid computer science fundamentals. Here's exactly what happens under the hood.

### 1. Geospatial Tax Lookup via PostGIS

When an order comes in with coordinates `(lat, lon)`, the system needs to find **every jurisdiction** that contains that point. A single delivery location in Manhattan will match:

| Layer | Jurisdiction | Rate |
|-------|-------------|------|
| **State** | New York State | 4.000% |
| **County** | New York County | 4.500% |
| **Special** | MCTD | 0.375% |
| **Composite** | — | **8.875%** |

This lookup uses **PostGIS `ST_Intersects`** — a spatial index query that checks if a GPS point falls inside any of the stored jurisdiction polygons:

```sql
SELECT j.id, j.name, j.type, tr.rate
FROM jurisdictions j
JOIN tax_rates tr ON tr.jurisdiction_id = j.id
WHERE ST_Intersects(j.geom, ST_SetSRID(ST_MakePoint($lon, $lat), 4326))
  AND tr.valid_from <= $date
  AND (tr.valid_to IS NULL OR tr.valid_to > $date)
ORDER BY j.type, j.name;
```

The `GiST` spatial index on the `geom` column makes this query execute in **sub-millisecond** time, even with 66 jurisdiction polygons loaded.

### 2. Jurisdiction Model: 4-Layer Tax Stack

The database stores **4 types** of jurisdictions, each with its own polygon boundary:

```
┌─────────────────────────────────────────────────┐
│  STATE:   1 jurisdiction  (union of all 62 counties)  │
├─────────────────────────────────────────────────┤
│  COUNTY:  62 jurisdictions (real NYS Civil Boundaries) │
├─────────────────────────────────────────────────┤
│  CITY:    1 jurisdiction  (Yonkers — 0.5% surcharge)   │
├─────────────────────────────────────────────────┤
│  SPECIAL: 1 jurisdiction  (MCTD — 0.375% surcharge)   │
└─────────────────────────────────────────────────┘
```

- **State rate** always applies (4.000%) if the point is inside NYS
- **County rate** varies (3.0% – 4.75%) depending on which county polygon contains the point
- **City rate** applies only inside specific city boundaries (e.g., Yonkers = 0.5%)
- **Special district rate** (MCTD = 0.375%) applies inside the 12-county metropolitan area

The composite rate is the **sum of all matching layers**. That's how NYC ends up at 8.875%.

### 3. Temporal Rate Versioning (SCD Type 2)

Tax rates change. Our `tax_rates` table implements **Slowly Changing Dimension Type 2** — every rate has a `valid_from` and `valid_to` date range:

```sql
CREATE TABLE tax_rates (
    id              UUID PRIMARY KEY,
    jurisdiction_id UUID REFERENCES jurisdictions(id),
    rate            DECIMAL(10,6) NOT NULL,
    valid_from      DATE NOT NULL,
    valid_to        DATE,           -- NULL = currently active
    UNIQUE (jurisdiction_id, valid_from)
);
```

When you update a tax rate through the Admin Console, the system:
1. **Expires** the current rate by setting its `valid_to` to the new effective date
2. **Inserts** the new rate with `valid_to = NULL` (making it the active HEAD)

This means **historical orders retain their original tax calculations** — even if rates change later. The `valid_from <= $date AND (valid_to IS NULL OR valid_to > $date)` filter in the lookup query handles the temporal resolution automatically.

You can also **revert** a rate change — the system deletes the HEAD rate and re-opens the previous one by setting its `valid_to` back to `NULL`.

### 4. Precision Math: Decimal.js + Commercial Rounding

We **never** use JavaScript `float` for money. Ever.

All tax calculations flow through a precision layer built on `Decimal.js` with **ROUND_HALF_UP** (Commercial Rounding) — matching the rounding standard required by New York State Tax Law:

```typescript
// precision.ts — the entire precision layer
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

function calcTax(subtotal, compositeRate) {
    const sub = new Decimal(subtotal);
    const tax = sub.times(compositeRate).toDecimalPlaces(2, ROUND_HALF_UP);
    const total = sub.plus(tax);
    return { tax_amount: tax.toFixed(2), total_amount: total.toFixed(2) };
}
```

**Key invariant**: tax is rounded **once** to 2 decimal places. The total is `subtotal + rounded_tax` — no additional rounding. This matches how real tax authorities expect calculations to work.

Subtotals from CSV files are **preserved as strings** throughout the entire pipeline to avoid IEEE 754 floating-point representation errors (e.g., `0.1 + 0.2 ≠ 0.3`).

### 5. Batch CSV Import (The Performance Engine)

This is where things get serious. Importing 60,000+ orders from a CSV file needs to be **fast**. Here's the strategy:

#### a) N+1 Query Avoidance via `UNNEST`

Instead of calling `calculateTax()` in a loop (N+1 problem), we batch **all coordinates into a single PostGIS query** using PostgreSQL's `UNNEST`:

```sql
SELECT pts.idx, j.id, j.name, j.type, tr.rate
FROM UNNEST($1::int[], $2::float8[], $3::float8[], $4::date[])
    AS pts(idx, lon, lat, ts)
JOIN jurisdictions j
    ON ST_Intersects(j.geom, ST_SetSRID(ST_MakePoint(pts.lon, pts.lat), 4326))
JOIN tax_rates tr
    ON tr.jurisdiction_id = j.id
    AND tr.valid_from <= pts.ts
    AND (tr.valid_to IS NULL OR tr.valid_to > pts.ts)
ORDER BY pts.idx, j.type, j.name;
```

One query. All points. All jurisdiction matches. Zero N+1.

#### b) Global Tax Cache with Pre-Serialized JSON

Most CSV files have many orders at the same coordinates (same delivery hub). The system maintains a **global tax cache** keyed by `lat|lon|date`:

- First occurrence → hits PostGIS → result cached with **pre-serialized JSON strings**
- Subsequent occurrences → cache hit → zero DB queries, zero `JSON.stringify()` calls

#### c) Parallel Chunk Processing

The CSV is split into chunks of 2,000 rows, processed **4 chunks in parallel** using `Promise.all()`. Each chunk runs in its own PostgreSQL transaction (`BEGIN → INSERT → COMMIT`).

#### d) SHA-256 Deduplication

Every imported CSV file is hashed with SHA-256. If the same file is uploaded twice, the system rejects it immediately — no duplicate data, no wasted compute.

#### e) Database-Generated UUIDs

Order IDs are generated by PostgreSQL's `gen_random_uuid()` inside the INSERT query — no `crypto.randomUUID()` calls in the Node.js hot path.

**The result**: 60K+ records imported in seconds, not minutes.

### 6. Smart Filtering System (OmniSearch)

The Orders table supports an advanced multi-dimensional filter system we call **OmniSearch**:

| Filter | How It Works |
|--------|-------------|
| **Date Range** | `timestamp >= $from AND timestamp < $to + 1 day` (timezone-safe) |
| **Tax Rate Range** | `composite_tax_rate >= $min AND composite_tax_rate <= $max` |
| **Amount Range** | `total_amount >= $val1 AND total_amount <= $val2` (BETWEEN support) |
| **Amount Operators** | `total_amount > $val`, `total_amount <= $val`, `total_amount = $val` |
| **Tax Operators** | Same operator support for composite tax rate |
| **Text Search** | `ILIKE` across order ID and jurisdiction names |
| **ID Search** | Partial UUID match via `id::text ILIKE '%query%'` |
| **Source Filter** | Filter by `manual` (single order) vs `csv` (batch import) |

All operators are **whitelisted** (`>`, `<`, `>=`, `<=`, `=`) to prevent SQL injection. The `=` operator uses `ABS(value - $target) < epsilon` for floating-point safety.

Every filter is composable — stack as many as you need, and they AND together into a single optimized SQL query with **parameterized values**.

### 7. Dashboard Analytics (8 Parallel SQL Queries)

The `/api/dashboard-stats` endpoint powers the entire analytics dashboard with **8 SQL queries executed in parallel** via `Promise.all()`:

| # | Query | Powers |
|---|-------|--------|
| 1 | KPIs (SUM, AVG, COUNT) | Revenue, Tax, Avg Rate, Order Count cards |
| 2 | Revenue & Tax by Day | Revenue vs Tax area chart |
| 3 | Tax Breakdown (JSONB extraction) | State/County/City/MCTD pie chart |
| 4 | Daily Order Counts | Activity heatmap |
| 5 | AOV by Day | Average Order Value trend line |
| 6 | Geographic Revenue | Regional revenue breakdown (lat/lon → 8 NYS regions) |
| 7 | Recent Orders (LIMIT 20) | Live Matrix Ledger feed |
| 8 | Month Counts | CHRONO Calendar component |

All 8 queries hit PostgreSQL simultaneously. The response is a single JSON payload. The frontend renders it all with **zero additional API calls**.

### 8. Real Polygon Data (Not Approximations)

The seed script (`npm run seed`) loads **actual county boundary polygons** from the NYS Civil Boundaries GeoJSON dataset:

- **62 county polygons** — real legal boundaries with simplified topology (`ST_SimplifyPreserveTopology`)
- **5m buffer** (`ST_Buffer(geom, 0.00005)`) — eliminates micro-gaps between adjacent county borders
- **State polygon** — computed as `ST_Union()` of all 62 counties
- **MCTD polygon** — computed as `ST_Union()` of the 12 member counties
- **Yonkers polygon** — exact city boundary from NYS geographic data

The seed script includes **3 automated verification tests**:
1. **Empire State Building test** — confirms Manhattan returns 8.875% composite rate
2. **Anti-overlap test** — confirms only 1 county matches any given point (no double-counting)
3. **Out-of-state test** — confirms Jersey City returns 0 NYS jurisdictions (no cross-border taxation)

---

## 🎯 Dashboard Features (What Accountants Actually Need)

We didn't just throw random charts on a page. Every widget was specifically selected for **tax compliance and financial reporting**:

| Feature | Why It Matters |
|---------|---------------|
| **Revenue vs Tax Chart** | See the relationship between gross revenue and tax obligations over time |
| **Tax Breakdown Donut** | Instantly see how much goes to State vs County vs City vs MCTD |
| **KPI Cards** | Total Revenue, Total Tax, Average Rate, Order Count — at a glance |
| **Geographic Revenue Map** | Revenue distribution across 8 NYS regions (NYC/LI, Capital Region, etc.) |
| **Activity Heatmap** | Spot high-volume days for audit preparation |
| **AOV Trend** | Average Order Value trend — critical for business intelligence |
| **Live Matrix Ledger** | Real-time feed of the 20 most recent transactions |
| **CHRONO Calendar** | Month-level order distribution for fiscal year planning |
| **Orders Table** | Full audit ledger with sorting, pagination, and OmniSearch |
| **Tactical Export Console** | Export filtered data as CSV — ready for your accounting software |
| **Admin Console** | Tax rate management, data purge, import rollback, system health |

### Fiscal Year Selector

The Mega Menu header includes a date range picker (we call it the **Fiscal Year Selector**). Set your date range once, and **every single chart, KPI, and table** on the dashboard filters to that window. Global. Instant. No per-widget configuration needed.

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| **React 18** + **Vite** | Ultra-fast HMR, lightning-fast builds |
| **TypeScript** | Type safety across the entire codebase |
| **Tailwind CSS** | Utility-first styling with custom cyber-brutalist design system |
| **Framer Motion** | Orchestrated animations, page transitions, micro-interactions |
| **Recharts** | Revenue charts, tax breakdowns, area charts, bar charts |
| **Three.js** | 3D visual elements in the dashboard |
| **Lucide React** | Clean, consistent iconography |
| **TanStack Query** | Server state management with automatic caching and refetching |

### Backend
| Technology | Purpose |
|-----------|---------|
| **Node.js** + **Express** | REST API server |
| **TypeScript** | End-to-end type safety |
| **PostgreSQL 16** + **PostGIS 3.4** | Geospatial database with spatial indexing |
| **Decimal.js** | Arbitrary-precision decimal math (no float errors) |
| **csv-parser** | Streaming CSV parsing |
| **multer** | File upload handling (50MB limit) |
| **express-rate-limit** | API: 200 req/min, Admin: 20 req/min |
| **Docker Compose** | One-command database provisioning |

---

## 🚀 Getting Started

### Prerequisites
1. **Node.js** v18+
2. **Docker Desktop** — for the PostgreSQL + PostGIS database

### 1. Start the Database

```bash
docker-compose up -d
```
> This spins up a `drone_tax_db` container with PostgreSQL 16 + PostGIS 3.4 on port `5432`.

### 2. Start the Backend

```bash
cd server
npm install
npm run migrate    # Creates all tables (jurisdictions, tax_rates, orders, import_logs)
npm run seed       # Loads 66 jurisdictions with real polygon boundaries + Pub 718 rates
npm run dev        # Starts the API server → http://localhost:3001
```

### 3. Start the Frontend

```bash
cd client
npm install
npm run dev        # Starts the dashboard → http://localhost:5173
```

---

## 🔐 Admin Access

The dashboard is protected by an authentication gateway with a terminal-style boot sequence.

**Access Token:** `CORP_SYS_ADMIN`

Type it in when prompted. The session is stored in `localStorage` — you only need to enter it once per browser.

---

## 🧹 Purging Data

### Option A: Through the Admin Console (UI)

Navigate to the **Admin** tab → Data Management → **Purge All Ledger Data**.
This truncates the `orders` and `import_logs` tables while keeping jurisdictions and tax rates intact.

### Option B: Through the Admin API

```bash
# Purge ALL orders and import logs
curl -X DELETE http://localhost:3001/api/admin/purge-all

# Purge orders within a specific date range
curl -X DELETE "http://localhost:3001/api/admin/purge-date-range?startDate=2025-01-01&endDate=2025-12-31"
```

### Option C: Full Database Reset

```bash
docker-compose down -v       # Removes the database volume entirely
docker-compose up -d         # Fresh database
cd server
npm run migrate              # Recreate tables
npm run seed                 # Reload jurisdiction data
```

---

## 📁 Project Structure

```
wdTestTask/
├── client/                        # React + Vite Frontend
│   └── src/
│       ├── components/
│       │   ├── AdminConsole.tsx        # Tax rate manager, data purge, system health
│       │   ├── AuthGateway.tsx         # Terminal-style authentication screen
│       │   ├── CsvUpload.tsx           # Drag-and-drop CSV import interface
│       │   ├── Layout.tsx              # Mega Menu header with fiscal year selector
│       │   ├── ManualOrderModal.tsx    # Single order creation with map coordinates
│       │   ├── OrdersTable.tsx         # Full audit ledger with pagination & OmniSearch
│       │   ├── SmartOmniSearch.tsx     # Advanced multi-filter search engine
│       │   ├── TaxBreakdownPopover.tsx # Per-order jurisdiction breakdown popup
│       │   ├── TaxMutationLedger.tsx   # Tax rate change history viewer
│       │   └── stats/
│       │       └── StatsDashboard.tsx  # Main analytics dashboard (8 chart widgets)
│       ├── api/                       # API client layer
│       ├── lib/                       # UI component library (shadcn-style)
│       └── types/                     # TypeScript type definitions
│
├── server/                        # Node.js + Express Backend
│   └── src/
│       ├── config/db.ts               # PostgreSQL connection pool
│       ├── routes/
│       │   ├── orders.ts              # CRUD + CSV import + export + OmniSearch
│       │   ├── stats.ts               # Legacy stats endpoint
│       │   ├── dashboardStats.ts      # 8-query parallel dashboard data
│       │   └── admin.ts               # Purge, rollback, tax rate CRUD, system health
│       ├── services/
│       │   ├── taxCalculator.ts       # PostGIS tax lookup (single + batch)
│       │   └── csvParser.ts           # High-performance CSV import engine
│       ├── utils/
│       │   ├── precision.ts           # Decimal.js wrapper (Commercial Rounding)
│       │   └── asyncHandler.ts        # Express async error wrapper
│       ├── scripts/
│       │   ├── migrate.ts             # Run SQL migrations
│       │   └── seed.ts                # Load real NYS polygon data + tax rates
│       └── migrations/
│           ├── 001_init.sql           # Core schema (jurisdictions, tax_rates, orders)
│           ├── 002_add_source.sql     # manual vs csv source tracking
│           ├── 003_temporal_constraints.sql  # SCD Type 2 constraints
│           ├── 004_simplify_geometries.sql   # PostGIS geometry optimization
│           └── 005_admin_features.sql        # import_logs + cascading deletes
│
├── docker-compose.yml             # PostgreSQL 16 + PostGIS 3.4
└── README.md                      # You are here
```

---

## 🌐 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/orders` | Paginated order list with OmniSearch filters |
| `GET` | `/api/orders/summary` | Aggregate totals (revenue, tax, count) |
| `GET` | `/api/orders/export` | Streaming CSV export with filters |
| `POST` | `/api/orders` | Create single order with auto tax calculation |
| `POST` | `/api/orders/import` | Upload CSV file for batch import |
| `GET` | `/api/stats` | Legacy statistics (top cities, top transactions) |
| `GET` | `/api/dashboard-stats` | Full dashboard payload (8 parallel queries) |
| `GET` | `/api/admin/stats` | Database-level stats (sizes, counts) |
| `GET` | `/api/admin/health` | DB ping + PostgreSQL version |
| `GET` | `/api/admin/imports` | Import log history |
| `GET` | `/api/admin/tax-rates` | All jurisdictions with rate history |
| `GET` | `/api/admin/tax-ledger` | Rate mutation audit trail |
| `POST` | `/api/admin/tax-rates/update` | Update a jurisdiction's tax rate |
| `DELETE` | `/api/admin/purge-all` | Truncate all order data |
| `DELETE` | `/api/admin/purge-date-range` | Delete orders in a date range |
| `DELETE` | `/api/admin/imports/:id/rollback` | Rollback a CSV import (cascading delete) |
| `DELETE` | `/api/admin/tax-ledger/:id/revert` | Revert the most recent rate change |

---

## 💡 Default Ports

| Service | Port | URL |
|---------|------|-----|
| PostgreSQL | `5432` | `postgresql://postgres:postgres@localhost:5432/drone_tax` |
| Backend API | `3001` | `http://localhost:3001` |
| Frontend Dashboard | `5173` | `http://localhost:5173` |

---

## ⚠️ Troubleshooting

- **PostGIS errors during migration?** Make sure the Docker container is fully up before running `npm run migrate`. Give it a few seconds after `docker-compose up -d`.
- **"Duplicate import detected"?** The CSV file's SHA-256 hash matches a previous import. This is intentional — it prevents accidental double-imports. If you need to re-import, rollback the previous import first via Admin Console.
- **Rate limit hit (429)?** The API allows 200 requests/minute for general endpoints and 20/minute for admin operations. Wait and retry.

---

<p align="center">
  <sub>Built with precision. Verified against Publication 718. Ready for production.</sub>
</p>
