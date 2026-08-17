# QRPOS — সম্পূর্ণ Implementation Plan / PRD

> **Scope:** সব feature included **except** Multi-Store Management UI ও SaaS Features (Subscription, Super Admin Panel, Landing Page)।
> তবে database design এ `store_id`, `owner_id` column রাখা হবে যাতে ভবিষ্যতে সহজে যোগ করা যায়।

---

## 📑 Table of Contents

1. [Technology Stack](#1-technology-stack)
2. [Project Structure](#2-project-structure)
3. [Database Schema](#3-database-schema)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [Module 01 — Dashboard](#5-module-01--dashboard)
6. [Module 02 — Product Management](#6-module-02--product-management)
7. [Module 03 — Category Management](#7-module-03--category-management)
8. [Module 04 — Inventory / Stock Management](#8-module-04--inventory--stock-management)
9. [Module 05 — POS / Billing System](#9-module-05--pos--billing-system)
10. [Module 06 — QR Code System](#10-module-06--qr-code-system)
11. [Module 07 — Customer Management & Due System](#11-module-07--customer-management--due-system)
12. [Module 08 — Supplier Management](#12-module-08--supplier-management)
13. [Module 09 — Sales History & Returns](#13-module-09--sales-history--returns)
14. [Module 10 — Purchase / Stock-In Management](#14-module-10--purchase--stock-in-management)
15. [Module 11 — Expense Management](#15-module-11--expense-management)
16. [Module 12 — Reports & Analytics](#16-module-12--reports--analytics)
17. [Module 13 — User / Staff Management](#17-module-13--user--staff-management)
18. [Module 14 — Settings & Configuration](#18-module-14--settings--configuration)
19. [Image Handling Strategy](#19-image-handling-strategy)
20. [Offline / Online Sync Architecture](#20-offline--online-sync-architecture)
21. [Responsive Layout (Mobile + Desktop)](#21-responsive-layout-mobile--desktop)
22. [Development Phases & Roadmap](#22-development-phases--roadmap)
23. [Verification Plan](#23-verification-plan)

---

## 1. Technology Stack

### Frontend
| Technology | Purpose | কেন |
|-----------|---------|-----|
| **Next.js 15 (App Router)** | React framework, SSR/SSG | Performance, SEO (landing page future), API routes |
| **TypeScript** | Type safety | বড় project এ bug কমায় |
| **Vanilla CSS + CSS Modules** | Styling | Full control, no dependency |
| **Dexie.js** | IndexedDB wrapper | Offline local database — simple API, reactive queries |
| **html5-qrcode** | QR scanning | Camera-based QR scan (mobile + desktop webcam) |
| **qrcode** (npm) | QR generation | QR code image generate ও print |
| **Workbox** | Service Worker / PWA | Offline caching, background sync |
| **Recharts** | Charts/Graphs | Dashboard ও Reports এ chart দেখানো |
| **react-to-print** | Receipt printing | Thermal ও normal printer support |
| **date-fns** | Date handling | Date formatting, range calculation |
| **uuid** | Unique ID generation | Offline এ ID generate (server round-trip ছাড়া) |

### Backend
| Technology | Purpose | কেন |
|-----------|---------|-----|
| **Supabase** | Backend-as-a-Service | Auth, PostgreSQL DB, Storage, Realtime, Edge Functions — সব একখানে |
| **Supabase Auth** | Authentication | Email/Phone login, JWT tokens, role-based |
| **Supabase Database** | PostgreSQL | Relational DB, RLS (Row Level Security) |
| **Supabase Storage** | File/Image storage | Product images, receipts, logos — CDN সহ |
| **Supabase Edge Functions** | Serverless functions | Complex business logic, reports, cron jobs |
| **Supabase Realtime** | Live updates | Multi-device sync (ভবিষ্যতে multi-store এ কাজে আসবে) |

### DevOps / Hosting
| Technology | Purpose |
|-----------|---------|
| **Vercel** | Next.js hosting (frontend) |
| **Supabase Cloud** | Database, Auth, Storage hosting |
| **GitHub** | Source code, CI/CD |

---

## 2. Project Structure

```
QRPOS/
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service Worker (Workbox generated)
│   ├── icons/                 # App icons (192x192, 512x512)
│   └── fonts/                 # Self-hosted fonts (offline support)
│
├── src/
│   ├── app/                   # Next.js App Router pages
│   │   ├── layout.tsx         # Root layout (sidebar/nav)
│   │   ├── page.tsx           # Dashboard (home)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── pos/
│   │   │   └── page.tsx       # POS / Billing screen
│   │   ├── products/
│   │   │   ├── page.tsx       # Product list
│   │   │   ├── add/page.tsx   # Add product
│   │   │   └── [id]/page.tsx  # Edit product
│   │   ├── categories/
│   │   │   └── page.tsx
│   │   ├── inventory/
│   │   │   └── page.tsx       # Stock overview
│   │   ├── customers/
│   │   │   ├── page.tsx       # Customer list
│   │   │   └── [id]/page.tsx  # Customer profile
│   │   ├── suppliers/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── sales/
│   │   │   ├── page.tsx       # Sales history
│   │   │   └── [id]/page.tsx  # Sale detail
│   │   ├── purchases/
│   │   │   ├── page.tsx
│   │   │   └── add/page.tsx
│   │   ├── expenses/
│   │   │   └── page.tsx
│   │   ├── reports/
│   │   │   └── page.tsx       # Reports hub
│   │   ├── staff/
│   │   │   └── page.tsx
│   │   ├── settings/
│   │   │   └── page.tsx
│   │   ├── qr/
│   │   │   ├── page.tsx       # QR generator / manager
│   │   │   └── print/page.tsx # Bulk QR print
│   │   └── p/
│   │       └── [identifier]/page.tsx  # Public product page (QR scan destination)
│   │
│   ├── components/
│   │   ├── ui/                # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── BottomNav.tsx
│   │   │   ├── DateRangePicker.tsx
│   │   │   ├── SearchInput.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── ConfirmDialog.tsx
│   │   ├── layout/
│   │   │   ├── AppShell.tsx       # Main app wrapper (sidebar + content)
│   │   │   ├── DesktopSidebar.tsx
│   │   │   ├── MobileBottomNav.tsx
│   │   │   └── Header.tsx
│   │   ├── dashboard/
│   │   │   ├── SummaryCards.tsx
│   │   │   ├── SalesChart.tsx
│   │   │   ├── TopProducts.tsx
│   │   │   └── RecentSales.tsx
│   │   ├── pos/
│   │   │   ├── ProductGrid.tsx
│   │   │   ├── Cart.tsx
│   │   │   ├── CartItem.tsx
│   │   │   ├── CheckoutModal.tsx
│   │   │   ├── PaymentMethodSelector.tsx
│   │   │   ├── DiscountInput.tsx
│   │   │   ├── HeldCarts.tsx
│   │   │   ├── QRScanner.tsx
│   │   │   ├── VariantSelector.tsx  # Size/Color picker popup
│   │   │   └── Receipt.tsx
│   │   ├── products/
│   │   │   ├── ProductForm.tsx
│   │   │   ├── ProductCard.tsx
│   │   │   ├── VariantManager.tsx   # Variant add/edit table
│   │   │   ├── BulkActions.tsx
│   │   │   └── ProductFilters.tsx
│   │   ├── qr/
│   │   │   ├── QRGenerator.tsx
│   │   │   ├── QRLabel.tsx
│   │   │   ├── QRPrintSheet.tsx
│   │   │   └── QRModeConfig.tsx
│   │   ├── customers/
│   │   │   ├── CustomerForm.tsx
│   │   │   ├── DuePaymentModal.tsx
│   │   │   └── TransactionHistory.tsx
│   │   ├── reports/
│   │   │   ├── SalesReport.tsx
│   │   │   ├── ProfitLossReport.tsx
│   │   │   ├── StockReport.tsx
│   │   │   ├── DueReport.tsx
│   │   │   ├── ExpenseReport.tsx
│   │   │   └── ReportExport.tsx
│   │   └── settings/
│   │       ├── BusinessInfoForm.tsx
│   │       ├── ReceiptTemplateEditor.tsx
│   │       ├── QRSettingsForm.tsx
│   │       ├── PaymentMethodsConfig.tsx
│   │       └── FeatureToggles.tsx
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts          # Supabase browser client
│   │   │   ├── server.ts          # Supabase server client
│   │   │   └── middleware.ts      # Auth middleware
│   │   ├── db/
│   │   │   ├── local.ts           # Dexie.js local database setup
│   │   │   ├── sync.ts            # Online ↔ Offline sync engine
│   │   │   └── migrations.ts     # Local DB schema migrations
│   │   ├── utils/
│   │   │   ├── currency.ts        # Currency formatting (৳)
│   │   │   ├── date.ts            # Date helpers
│   │   │   ├── invoice.ts         # Invoice number generation
│   │   │   ├── sku.ts             # SKU auto-generation
│   │   │   ├── image.ts           # Image compression & handling
│   │   │   ├── qr-parser.ts      # Smart QR content parser (all 3 modes)
│   │   │   ├── print.ts           # Print helpers
│   │   │   ├── export.ts          # CSV/Excel export
│   │   │   └── validators.ts     # Form validation
│   │   ├── hooks/
│   │   │   ├── useProducts.ts
│   │   │   ├── useCart.ts
│   │   │   ├── useCustomers.ts
│   │   │   ├── useSales.ts
│   │   │   ├── useInventory.ts
│   │   │   ├── useAuth.ts
│   │   │   ├── useSettings.ts
│   │   │   ├── useOffline.ts      # Online/offline status
│   │   │   ├── useSync.ts         # Sync status & triggers
│   │   │   └── useReports.ts
│   │   ├── constants/
│   │   │   ├── roles.ts           # User roles & permissions
│   │   │   ├── units.ts           # Product units (pcs, kg, liter...)
│   │   │   ├── payment-methods.ts
│   │   │   └── defaults.ts        # Default settings values
│   │   └── types/
│   │       ├── product.ts
│   │       ├── category.ts
│   │       ├── customer.ts
│   │       ├── supplier.ts
│   │       ├── sale.ts
│   │       ├── purchase.ts
│   │       ├── expense.ts
│   │       ├── staff.ts
│   │       ├── settings.ts
│   │       └── common.ts         # Shared types
│   │
│   └── styles/
│       ├── globals.css            # CSS variables, reset, design tokens
│       ├── layout.module.css
│       ├── dashboard.module.css
│       ├── pos.module.css
│       ├── products.module.css
│       ├── reports.module.css
│       └── components/
│           ├── button.module.css
│           ├── card.module.css
│           ├── modal.module.css
│           ├── table.module.css
│           └── form.module.css
│
├── supabase/
│   ├── migrations/                # Database migrations (SQL)
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   └── 003_functions.sql
│   ├── seed.sql                   # Demo/test data
│   └── config.toml
│
├── next.config.js
├── tsconfig.json
├── package.json
└── README.md
```

---

## 3. Database Schema

> [!IMPORTANT]
> **Future-proofing:** প্রতিটি data table এ `store_id` column আছে। এখন Phase 1 এ single store হলেও এই column থাকবে এবং default store এর id ব্যবহার হবে। এতে ভবিষ্যতে Multi-Store যোগ করতে কোনো schema change লাগবে না।

### 3.1 Core Tables

#### `owners` — দোকান মালিক
```sql
CREATE TABLE owners (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT UNIQUE,
    phone           TEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    name            TEXT NOT NULL,
    -- Future SaaS fields (column আছে, এখন ব্যবহার হবে না)
    subscription_plan_id UUID,
    subscription_status  TEXT DEFAULT 'active',
    subscription_start   TIMESTAMPTZ,
    subscription_end     TIMESTAMPTZ,
    --
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### `stores` — দোকান
```sql
CREATE TABLE stores (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id        UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    address         TEXT,
    phone           TEXT,
    email           TEXT,
    logo_url        TEXT,
    currency        TEXT DEFAULT '৳',
    currency_code   TEXT DEFAULT 'BDT',
    timezone        TEXT DEFAULT 'Asia/Dhaka',
    is_active       BOOLEAN DEFAULT TRUE,
    settings        JSONB DEFAULT '{}',   -- store-specific settings
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### `staff` — কর্মী / User
```sql
CREATE TABLE staff (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    auth_user_id    UUID REFERENCES auth.users(id), -- Supabase Auth link
    name            TEXT NOT NULL,
    phone           TEXT,
    email           TEXT,
    role            TEXT NOT NULL DEFAULT 'cashier',
        -- 'owner' | 'admin' | 'manager' | 'cashier'
    permissions     JSONB DEFAULT '{}',
    pin_code        TEXT,               -- Quick PIN login (POS এ দ্রুত switch)
    is_active       BOOLEAN DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, phone),
    UNIQUE(store_id, email)
);
```

### 3.2 Product & Category Tables

#### `categories` — ক্যাটেগরি
```sql
CREATE TABLE categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    parent_id       UUID REFERENCES categories(id) ON DELETE SET NULL,
        -- NULL = root category, otherwise = sub-category
    name            TEXT NOT NULL,
    description     TEXT,
    color           TEXT,               -- Hex color (POS এ দ্রুত চিনতে)
    icon            TEXT,               -- Icon name/emoji
    sort_order      INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, name, parent_id)
);
```

#### `products` — পণ্য
```sql
CREATE TABLE products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
    name            TEXT NOT NULL,
    description     TEXT,
    sku             TEXT,               -- Unique per store, auto or manual
    brand           TEXT,
    unit            TEXT NOT NULL DEFAULT 'pcs',
        -- 'pcs' | 'kg' | 'g' | 'liter' | 'ml' | 'packet' | 'dozen' | 'box' | 'pair'
    -- Pricing (used when has_variants = FALSE)
    purchase_price  DECIMAL(12,2) DEFAULT 0,
    selling_price   DECIMAL(12,2) DEFAULT 0,
    -- Stock (used when has_variants = FALSE)
    stock           DECIMAL(12,3) DEFAULT 0, -- 3 decimals for kg/liter
    low_stock_alert INTEGER DEFAULT 5,
    -- Variant support
    has_variants    BOOLEAN DEFAULT FALSE,
    -- Image
    image_url       TEXT,               -- Primary image URL (Supabase Storage)
    thumbnail_url   TEXT,               -- Compressed thumbnail URL
    -- Status
    is_active       BOOLEAN DEFAULT TRUE, -- FALSE = soft deleted / hidden from POS
    -- Metadata
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    created_by      UUID REFERENCES staff(id),
    UNIQUE(store_id, sku)
);

-- Indexes
CREATE INDEX idx_products_store ON products(store_id);
CREATE INDEX idx_products_category ON products(store_id, category_id);
CREATE INDEX idx_products_sku ON products(store_id, sku);
CREATE INDEX idx_products_name ON products(store_id, name);
CREATE INDEX idx_products_active ON products(store_id, is_active);
```

#### `product_variants` — পণ্যের বৈচিত্র্য (Size/Color/Weight)
```sql
CREATE TABLE product_variants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_type    TEXT NOT NULL,       -- 'size' | 'color' | 'weight' | 'custom'
    variant_value   TEXT NOT NULL,       -- 'M', 'L', 'XL', 'Red', '500g'
    sku             TEXT,               -- Variant-specific SKU: "POLO-M"
    purchase_price  DECIMAL(12,2) DEFAULT 0,
    selling_price   DECIMAL(12,2) DEFAULT 0,
    stock           DECIMAL(12,3) DEFAULT 0,
    low_stock_alert INTEGER DEFAULT 5,
    image_url       TEXT,               -- Variant-specific image (optional)
    sort_order      INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, product_id, variant_type, variant_value),
    UNIQUE(store_id, sku)
);

CREATE INDEX idx_variants_product ON product_variants(product_id);
```

### 3.3 Customer & Supplier Tables

#### `customers` — কাস্টমার
```sql
CREATE TABLE customers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    phone           TEXT,
    email           TEXT,
    address         TEXT,
    notes           TEXT,
    total_due       DECIMAL(12,2) DEFAULT 0,     -- Cached: বর্তমান মোট বাকি
    total_purchases DECIMAL(12,2) DEFAULT 0,     -- Cached: মোট কেনাকাটার পরিমাণ
    purchase_count  INTEGER DEFAULT 0,           -- Cached: কতবার কিনেছে
    last_purchase_at TIMESTAMPTZ,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, phone)
);

CREATE INDEX idx_customers_store ON customers(store_id);
CREATE INDEX idx_customers_phone ON customers(store_id, phone);
CREATE INDEX idx_customers_due ON customers(store_id, total_due);
```

#### `suppliers` — সরবরাহকারী
```sql
CREATE TABLE suppliers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    company_name    TEXT,
    phone           TEXT,
    email           TEXT,
    address         TEXT,
    notes           TEXT,
    total_due       DECIMAL(12,2) DEFAULT 0,      -- Cached: supplier কে কত দিতে বাকি
    total_purchases DECIMAL(12,2) DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, phone)
);
```

### 3.4 Sales Tables

#### `sales` — বিক্রি (Master)
```sql
CREATE TABLE sales (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    invoice_no      TEXT NOT NULL,          -- "INV-2026-00142"
    customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
    staff_id        UUID REFERENCES staff(id) ON DELETE SET NULL,
    -- Amounts
    subtotal        DECIMAL(12,2) NOT NULL DEFAULT 0,   -- Items total before discount
    discount_type   TEXT,                   -- 'percentage' | 'fixed' | NULL
    discount_value  DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,  -- Actual discount in ৳
    tax_amount      DECIMAL(12,2) DEFAULT 0,
    total           DECIMAL(12,2) NOT NULL DEFAULT 0,   -- Final total
    -- Payment
    paid_amount     DECIMAL(12,2) DEFAULT 0,
    due_amount      DECIMAL(12,2) DEFAULT 0,
    payment_status  TEXT NOT NULL DEFAULT 'paid',
        -- 'paid' | 'partial' | 'due'
    change_amount   DECIMAL(12,2) DEFAULT 0,   -- ভাংতি (paid > total হলে)
    -- Metadata
    notes           TEXT,
    is_returned     BOOLEAN DEFAULT FALSE,  -- পুরো sale return হয়ে গেলে
    sale_date       TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    -- Sync
    is_synced       BOOLEAN DEFAULT TRUE,   -- Offline এ create হলে FALSE
    local_id        TEXT                    -- Offline local reference
);

CREATE INDEX idx_sales_store ON sales(store_id);
CREATE INDEX idx_sales_invoice ON sales(store_id, invoice_no);
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_date ON sales(store_id, sale_date);
CREATE INDEX idx_sales_status ON sales(store_id, payment_status);
```

#### `sale_items` — বিক্রির আইটেম (Detail)
```sql
CREATE TABLE sale_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    sale_id         UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES products(id),
    variant_id      UUID REFERENCES product_variants(id), -- NULL if no variant
    -- Snapshot (বিক্রির সময়ের দাম — পরে product এর দাম বদলালেও এটা ঠিক থাকবে)
    product_name    TEXT NOT NULL,
    variant_info    TEXT,                   -- "Size: L" (display purpose)
    unit_price      DECIMAL(12,2) NOT NULL, -- Per unit selling price at time of sale
    purchase_price  DECIMAL(12,2) DEFAULT 0, -- Per unit cost price (profit calculation)
    quantity        DECIMAL(12,3) NOT NULL,
    -- Discount
    discount_type   TEXT,                   -- 'percentage' | 'fixed' | NULL
    discount_value  DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    -- Total
    total           DECIMAL(12,2) NOT NULL, -- (unit_price * quantity) - discount
    -- Return tracking
    returned_qty    DECIMAL(12,3) DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);
```

#### `sale_payments` — বিক্রির পেমেন্ট (Multiple payment methods support)
```sql
CREATE TABLE sale_payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    sale_id         UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    payment_method  TEXT NOT NULL,
        -- 'cash' | 'bkash' | 'nagad' | 'rocket' | 'bank' | 'card' | 'due'
    amount          DECIMAL(12,2) NOT NULL,
    reference_no    TEXT,               -- bKash transaction ID etc.
    notes           TEXT,
    payment_date    TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.5 Due / Credit Payment Table

#### `due_payments` — বাকি পরিশোধ
```sql
CREATE TABLE due_payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    customer_id     UUID NOT NULL REFERENCES customers(id),
    sale_id         UUID REFERENCES sales(id),  -- কোন sale এর বাকি শোধ করছে (optional)
    amount          DECIMAL(12,2) NOT NULL,
    payment_method  TEXT NOT NULL DEFAULT 'cash',
    reference_no    TEXT,
    notes           TEXT,
    received_by     UUID REFERENCES staff(id), -- কে টাকা নিলো
    payment_date    TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    is_synced       BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_due_payments_customer ON due_payments(customer_id);
CREATE INDEX idx_due_payments_date ON due_payments(store_id, payment_date);
```

### 3.6 Purchase Tables

#### `purchases` — ক্রয় (Master)
```sql
CREATE TABLE purchases (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    supplier_id     UUID REFERENCES suppliers(id),
    reference_no    TEXT,                   -- Purchase order / challan number
    staff_id        UUID REFERENCES staff(id),
    -- Amounts
    subtotal        DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    tax_amount      DECIMAL(12,2) DEFAULT 0,
    total           DECIMAL(12,2) NOT NULL DEFAULT 0,
    -- Payment
    paid_amount     DECIMAL(12,2) DEFAULT 0,
    due_amount      DECIMAL(12,2) DEFAULT 0,
    payment_status  TEXT DEFAULT 'paid',    -- 'paid' | 'partial' | 'due'
    -- Metadata
    notes           TEXT,
    purchase_date   TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    is_synced       BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_purchases_store ON purchases(store_id);
CREATE INDEX idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX idx_purchases_date ON purchases(store_id, purchase_date);
```

#### `purchase_items` — ক্রয়ের আইটেম (Detail)
```sql
CREATE TABLE purchase_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    purchase_id     UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES products(id),
    variant_id      UUID REFERENCES product_variants(id),
    product_name    TEXT NOT NULL,           -- Snapshot
    variant_info    TEXT,
    unit_price      DECIMAL(12,2) NOT NULL,  -- Purchase price per unit
    quantity        DECIMAL(12,3) NOT NULL,
    total           DECIMAL(12,2) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### `supplier_payments` — সরবরাহকারীকে পেমেন্ট
```sql
CREATE TABLE supplier_payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    supplier_id     UUID NOT NULL REFERENCES suppliers(id),
    purchase_id     UUID REFERENCES purchases(id),
    amount          DECIMAL(12,2) NOT NULL,
    payment_method  TEXT NOT NULL DEFAULT 'cash',
    reference_no    TEXT,
    notes           TEXT,
    paid_by         UUID REFERENCES staff(id),
    payment_date    TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.7 Inventory / Stock Tables

#### `stock_adjustments` — স্টক সমন্বয়
```sql
CREATE TABLE stock_adjustments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES products(id),
    variant_id      UUID REFERENCES product_variants(id),
    adjustment_type TEXT NOT NULL,
        -- 'damage' | 'loss' | 'return' | 'correction' | 'opening_stock'
    quantity_change DECIMAL(12,3) NOT NULL,  -- Positive = increase, Negative = decrease
    stock_before    DECIMAL(12,3) NOT NULL,
    stock_after     DECIMAL(12,3) NOT NULL,
    reason          TEXT NOT NULL,
    adjusted_by     UUID REFERENCES staff(id),
    adjustment_date TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    is_synced       BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_stock_adj_product ON stock_adjustments(product_id);
CREATE INDEX idx_stock_adj_date ON stock_adjustments(store_id, adjustment_date);
```

#### `stock_history` — স্টক ইতিহাস (Auto-generated log)
```sql
CREATE TABLE stock_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES products(id),
    variant_id      UUID REFERENCES product_variants(id),
    action          TEXT NOT NULL,
        -- 'sale' | 'purchase' | 'adjustment' | 'return' | 'transfer'
    reference_id    UUID,               -- sale_id / purchase_id / adjustment_id
    reference_type  TEXT,               -- 'sale' | 'purchase' | 'adjustment'
    quantity_change DECIMAL(12,3) NOT NULL,
    stock_before    DECIMAL(12,3) NOT NULL,
    stock_after     DECIMAL(12,3) NOT NULL,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stock_history_product ON stock_history(product_id);
CREATE INDEX idx_stock_history_date ON stock_history(store_id, created_at);
```

### 3.8 Expense Tables

#### `expense_categories` — খরচের ধরন
```sql
CREATE TABLE expense_categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,          -- 'ভাড়া', 'বিদ্যুৎ', 'বেতন', 'পরিবহন'
    is_default      BOOLEAN DEFAULT FALSE,  -- System-provided defaults
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, name)
);
```

#### `expenses` — খরচ
```sql
CREATE TABLE expenses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    category_id     UUID REFERENCES expense_categories(id),
    amount          DECIMAL(12,2) NOT NULL,
    description     TEXT,
    reference       TEXT,               -- রসিদ নম্বর
    payment_method  TEXT DEFAULT 'cash',
    expense_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    recorded_by     UUID REFERENCES staff(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    is_synced       BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_expenses_store ON expenses(store_id);
CREATE INDEX idx_expenses_date ON expenses(store_id, expense_date);
CREATE INDEX idx_expenses_category ON expenses(category_id);
```

### 3.9 Sale Returns

#### `sale_returns` — বিক্রি ফেরত
```sql
CREATE TABLE sale_returns (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    sale_id         UUID NOT NULL REFERENCES sales(id),
    customer_id     UUID REFERENCES customers(id),
    staff_id        UUID REFERENCES staff(id),
    total_refund    DECIMAL(12,2) NOT NULL DEFAULT 0,
    refund_method   TEXT NOT NULL,
        -- 'cash' | 'due_adjust' | 'credit_note'
    reason          TEXT,
    return_date     TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sale_return_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    return_id       UUID NOT NULL REFERENCES sale_returns(id) ON DELETE CASCADE,
    sale_item_id    UUID NOT NULL REFERENCES sale_items(id),
    product_id      UUID NOT NULL REFERENCES products(id),
    variant_id      UUID REFERENCES product_variants(id),
    quantity        DECIMAL(12,3) NOT NULL,
    unit_price      DECIMAL(12,2) NOT NULL,
    refund_amount   DECIMAL(12,2) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.10 Settings & Activity Log

#### `store_settings` — দোকানের সেটিংস
```sql
CREATE TABLE store_settings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    setting_key     TEXT NOT NULL,
    setting_value   JSONB NOT NULL,
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, setting_key)
);

-- Default settings keys:
-- 'business_info'      → {name, address, phone, email, logo_url}
-- 'receipt_template'   → {show_logo, header_text, footer_text, show_customer, show_cashier}
-- 'invoice_config'     → {prefix: "INV-", auto_increment: true}
-- 'qr_config'          → {mode: "text"|"app_page"|"custom_url", custom_url_pattern: "", label_content: {...}}
-- 'payment_methods'    → {cash: true, bkash: true, nagad: true, rocket: false, bank: false, card: false}
-- 'tax_config'         → {enabled: false, tax_rate: 0, tax_name: "VAT"}
-- 'low_stock_default'  → {alert_level: 5}
-- 'feature_toggles'    → {product_variants: false, sub_categories: false, expense_tracking: true, ...}
-- 'theme'              → {mode: "dark"|"light", primary_color: "#..."}
```

#### `activity_log` — কার্যকলাপ লগ
```sql
CREATE TABLE activity_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    staff_id        UUID REFERENCES staff(id),
    action          TEXT NOT NULL,
        -- 'product_add' | 'product_edit' | 'product_delete'
        -- 'sale_create' | 'sale_return'
        -- 'stock_adjust' | 'purchase_create'
        -- 'customer_add' | 'due_payment'
        -- 'settings_change' | 'staff_add' | 'login' | 'logout'
    entity_type     TEXT,           -- 'product' | 'sale' | 'customer' | etc.
    entity_id       UUID,           -- ID of the affected record
    details         JSONB,          -- What changed: {field: "price", old: 50, new: 55}
    ip_address      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_store ON activity_log(store_id, created_at);
CREATE INDEX idx_activity_staff ON activity_log(staff_id);
```

### 3.11 Held Carts (POS)

#### `held_carts` — Hold করা Cart
```sql
CREATE TABLE held_carts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    staff_id        UUID REFERENCES staff(id),
    customer_id     UUID REFERENCES customers(id),
    cart_name       TEXT,               -- "Table 3" or "করিম ভাই"
    items           JSONB NOT NULL,     -- Cart items as JSON array
    notes           TEXT,
    held_at         TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.12 Sync Queue (Offline Support)

#### `sync_queue` — Offline sync queue (Local DB only, not in Supabase)
```
-- This table exists ONLY in local IndexedDB (Dexie.js), not in Supabase.
-- When offline, all create/update/delete operations are queued here.
-- When online, queue is processed and changes are pushed to Supabase.

sync_queue (Dexie.js local table):
    id              auto-increment
    table_name      TEXT        -- 'products', 'sales', 'customers', etc.
    operation       TEXT        -- 'create' | 'update' | 'delete'
    record_id       TEXT        -- UUID of the record
    data            OBJECT      -- Full record data
    created_at      TIMESTAMP
    retry_count     INTEGER
    last_error      TEXT
    status          TEXT        -- 'pending' | 'processing' | 'failed' | 'done'
```

---

## 4. Authentication & Authorization

### 4.1 Auth Flow

```
Sign Up (নতুন owner):
  Phone/Email + Password → Supabase Auth → Create owner record
  → Auto-create 1 default store → Auto-create owner as staff (role: 'owner')
  → Redirect to onboarding (business info setup)

Login (existing user):
  Phone/Email + Password → Supabase Auth → JWT token
  → Fetch staff record → Determine store_id + role
  → Load store settings → Redirect to Dashboard/POS

Staff Login (কর্মী):
  Email + Password → Supabase Auth → JWT token
  → Fetch staff record → Check role & permissions
  → Load store data → Redirect based on role
```

### 4.2 Role-based Access Control (RBAC)

**Current Status:** ❌ Not Implemented in UI. The `Sidebar`, `BottomNav`, and all feature pages currently hardcode full access for everyone. We need to implement an Auth Context to share the user's role and conditionally hide these elements.

**Proposed Changes:**
1. **[NEW]** `src/lib/contexts/AuthContext.tsx`: To store the current user, store_id, and role.
2. **[MODIFY]** `src/components/layout/Sidebar.tsx` & `BottomNav.tsx`: Hide tabs like Settings, Staff, etc., for Cashiers.
3. **[MODIFY]** `src/app/(dashboard)/products/page.tsx`: Hide Add/Edit/Delete buttons if role is Cashier.
4. **[MODIFY]** `src/app/(dashboard)/layout.tsx`: Wrap the app in `<AuthProvider>`.

| Page / Feature | Owner | Admin | Manager | Cashier |
|---------------|-------|-------|---------|---------|
| Dashboard | ✅ Full | ✅ Full | ✅ Full | ✅ Limited (no profit) |
| POS / Billing | ✅ | ✅ | ✅ | ✅ |
| Products — View | ✅ | ✅ | ✅ | ✅ |
| Products — Add/Edit | ✅ | ✅ | ✅ | ❌ |
| Products — Delete | ✅ | ✅ | ❌ | ❌ |
| Products — See Cost Price | ✅ | ✅ | ⚙️ Configurable | ❌ |
| Categories | ✅ | ✅ | ✅ | ❌ |
| Inventory / Stock | ✅ | ✅ | ✅ | ❌ |
| Stock Adjustment | ✅ | ✅ | ✅ | ❌ |
| Customers — View | ✅ | ✅ | ✅ | ✅ |
| Customers — Add | ✅ | ✅ | ✅ | ✅ (quick add from POS) |
| Customers — Due Payment | ✅ | ✅ | ✅ | ⚙️ Configurable |
| Suppliers | ✅ | ✅ | ✅ | ❌ |
| Sales History | ✅ | ✅ | ✅ | ✅ (own sales only) |
| Sale Return | ✅ | ✅ | ✅ | ❌ |
| Purchases | ✅ | ✅ | ✅ | ❌ |
| Expenses | ✅ | ✅ | ✅ | ❌ |
| Reports | ✅ All | ✅ All | ✅ Most | ❌ |
| Reports — Profit/Loss | ✅ | ✅ | ⚙️ | ❌ |
| Staff Management | ✅ | ✅ | ❌ | ❌ |
| Settings | ✅ All | ✅ Most | ❌ | ❌ |
| QR Management | ✅ | ✅ | ✅ | ❌ |
| Give Discount | ✅ | ✅ | ✅ | ⚙️ Configurable (max % limit) |
| Delete Sale | ✅ | ❌ | ❌ | ❌ |

> ⚙️ = Owner settings থেকে enable/disable করতে পারবে

### 4.3 Row Level Security (RLS)

**Current Status:** ✅ Implemented. The `002_rls_policies.sql` migration contains the RLS rules for the database.

Supabase এ প্রতিটি table এ RLS policy থাকবে:

```sql
-- Example: products table RLS
CREATE POLICY "Users can only access their store's products"
ON products FOR ALL
USING (
    store_id IN (
        SELECT store_id FROM staff
        WHERE auth_user_id = auth.uid()
        AND is_active = TRUE
    )
);
```

---

## 5. Module 01 — Dashboard

### 5.1 Summary Cards (উপরে)

| Card | Data Source | Calculation |
|------|-----------|-------------|
| আজকের বিক্রি | `sales` | `SUM(total) WHERE sale_date = TODAY` |
| আজকের লাভ | `sale_items` | `SUM((unit_price - purchase_price) * quantity) WHERE date = TODAY` minus item discounts |
| মোট বাকি | `customers` | `SUM(total_due) WHERE total_due > 0` |
| মোট পণ্য | `products` | `COUNT(*) WHERE is_active = TRUE` |
| Low Stock Alert | `products` + `product_variants` | `COUNT(*) WHERE stock <= low_stock_alert AND stock > 0` |
| Out of Stock | `products` + `product_variants` | `COUNT(*) WHERE stock = 0` |

### 5.2 Charts

| Chart | Type | Data |
|-------|------|------|
| বিক্রির Trend | Line chart | Last 7/30 days daily total sales |
| Top 5 Products | Horizontal bar | Most sold products by quantity/revenue |
| Category-wise Sale | Donut/Pie chart | Sales grouped by category |
| Payment Method Breakdown | Donut chart | Cash vs bKash vs Due etc. |

### 5.3 Lists (নিচে)

| List | Shows |
|------|-------|
| সাম্প্রতিক বিক্রি | Latest 10 sales (invoice, customer, total, status) |
| Low Stock Items | Products with stock ≤ alert level |
| আজকের বাকি | Today's credit sales |

### 5.4 Date Filter
- Quick options: আজ / গতকাল / এই সপ্তাহ / এই মাস / গত মাস
- Custom: Date range picker (start date → end date)
- Filter apply হলে সব card ও chart re-calculate হবে

### 5.5 Cashier Dashboard (Limited)
Cashier role হলে Dashboard এ দেখাবে:
- আজকের বিক্রি (শুধু নিজের)
- আজ কতটি transaction করেছে
- ❌ লাভ, ক্রয়মূল্য, মোট বাকি — দেখাবে না

---

## 6. Module 02 — Product Management

### 6.1 Product List Page (`/products`)

**Layout:**
- Top: Search bar + Filter buttons + "Add Product" button
- Body: Table view (desktop) / Card grid view (mobile)
- Bottom: Pagination

**Table Columns (Desktop):**
| Column | Sort | Filter |
|--------|------|--------|
| Image (thumbnail) | — | — |
| Product Name | ✅ | Search |
| SKU | ✅ | Search |
| Category | ✅ | Dropdown |
| Purchase Price | ✅ | — |
| Selling Price | ✅ | — |
| Stock | ✅ | In Stock / Low / Out |
| Status | — | Active / Inactive |
| Actions | — | Edit / Delete / QR |

**Filters:**
- Category dropdown (সব / specific)
- Stock status: সব / In Stock / Low Stock / Out of Stock
- Status: Active / Inactive
- Has Variants: Yes / No

**Bulk Actions (Checkbox select):**
- Delete selected
- Change category
- Update price (% increase/decrease)
- Print QR for selected
- Export selected

### 6.2 Add Product Form (`/products/add`)

**Form layout — 2 columns on desktop, single column on mobile:**

**Left Column (Primary Info):**

| Field | Type | Required | Validation | Default |
|-------|------|----------|------------|---------|
| পণ্যের নাম | Text input | ✅ | Min 2 chars | — |
| SKU / কোড | Text input | ❌ | Unique per store, alphanumeric | Auto-generated |
| ক্যাটেগরি | Dropdown + quick add | ✅ | Must exist | — |
| ক্রয়মূল্য | Number input | ✅ | ≥ 0 | 0 |
| বিক্রয়মূল্য | Number input | ✅ | ≥ 0, ≥ purchase_price (warning if less) | 0 |
| বর্তমান স্টক | Number input | ✅ | ≥ 0 | 0 |
| ইউনিট | Dropdown | ✅ | From predefined list | "pcs" |
| Low Stock Alert | Number input | ❌ | ≥ 0 | 5 (from settings) |

**Right Column (Optional Info):**

| Field | Type | Required |
|-------|------|----------|
| ছবি | Image upload / Camera capture | ❌ |
| ব্র্যান্ড | Text input | ❌ |
| বিবরণ | Textarea | ❌ |

**Variants Section (toggle-based, only if feature enabled in settings):**

```
┌─ Has Variations? ─────────────────────────────┐
│  Toggle: [OFF ○━━━━○ ON]                      │
│                                                │
│  (ON হলে নিচের section দেখাবে)                 │
│                                                │
│  Variation Type: [Size ▼] (or custom text)     │
│                                                │
│  ┌──────────┬──────────┬──────┬───────┬──────┐ │
│  │ Value    │ Sell ৳   │ Buy ৳│ Stock │ SKU  │ │
│  ├──────────┼──────────┼──────┼───────┼──────┤ │
│  │ M        │ 500      │ 350  │ 10    │ auto │ │
│  │ L        │ 500      │ 350  │ 5     │ auto │ │
│  │ XL       │ 550      │ 380  │ 0     │ auto │ │
│  └──────────┴──────────┴──────┴───────┴──────┘ │
│  [+ Add Variant]                               │
│                                                │
│  ⚠️ Variant ON করলে উপরের price/stock          │
│    fields disabled হবে, variant table          │
│    থেকে manage হবে।                            │
└────────────────────────────────────────────────┘
```

**SKU Auto-Generation Logic:**
```
Product: "Lux Soap 100g"
→ SKU: "LUX-SOAP-100G" (or "PRD-00142")

Variant SKU: "{parent_sku}-{variant_value}"
→ "POLO-M", "POLO-L", "POLO-XL"
```

**Save করলে কী হবে:**
1. Product record create → `products` table
2. If has_variants → variant records create → `product_variants` table
3. QR code auto-generate (based on QR mode setting)
4. Image upload to Supabase Storage (if provided)
5. Stock history entry → `stock_history` table (opening stock)
6. Activity log → `activity_log` table

### 6.3 Edit Product (`/products/[id]`)
- Same form as add, pre-filled with existing data
- Change tracking: যে fields বদলেছে সেগুলো activity_log এ record হবে
- Price change warning: "ক্রয়মূল্য বদলালে পুরানো sales report এর profit হিসাব বদলাবে না (snapshot আছে)"

### 6.4 Delete Product
- **Soft delete**: `is_active = FALSE` set করবে
- Confirmation dialog: "এই পণ্যটি নিষ্ক্রিয় করা হবে। পুরানো বিক্রির record গুলোতে এটি দেখা যাবে।"
- POS থেকে অদৃশ্য হয়ে যাবে
- Product list এ "Inactive" filter দিয়ে দেখা যাবে
- Restore করা যাবে (re-activate)

### 6.5 Product Units

```typescript
const PRODUCT_UNITS = [
    { value: 'pcs', label: 'পিস', label_en: 'Pieces' },
    { value: 'kg', label: 'কেজি', label_en: 'Kilogram' },
    { value: 'g', label: 'গ্রাম', label_en: 'Gram' },
    { value: 'liter', label: 'লিটার', label_en: 'Liter' },
    { value: 'ml', label: 'মিলিলিটার', label_en: 'Milliliter' },
    { value: 'packet', label: 'প্যাকেট', label_en: 'Packet' },
    { value: 'dozen', label: 'ডজন', label_en: 'Dozen' },
    { value: 'box', label: 'বক্স', label_en: 'Box' },
    { value: 'pair', label: 'জোড়া', label_en: 'Pair' },
    { value: 'meter', label: 'মিটার', label_en: 'Meter' },
    { value: 'feet', label: 'ফুট', label_en: 'Feet' },
    { value: 'bag', label: 'বস্তা', label_en: 'Bag' },
    { value: 'bottle', label: 'বোতল', label_en: 'Bottle' },
    { value: 'can', label: 'ক্যান', label_en: 'Can' },
    { value: 'roll', label: 'রোল', label_en: 'Roll' },
    { value: 'set', label: 'সেট', label_en: 'Set' },
];
```

---

## 7. Module 03 — Category Management

### 7.1 Category Page (`/categories`)

**Layout:** Grid of category cards + "Add Category" button

**Category Card:**
```
┌───────────────────┐
│  🛒               │ ← Icon/Emoji
│  খাবার             │ ← Category name
│  ━━━━━━━━━━━━━━━  │ ← Color bar
│  42 products      │ ← Product count
│  [Edit] [Delete]  │
│                   │
│  Sub-categories:  │
│  • বিস্কুট (12)    │
│  • চিপস (8)       │
│  • পানীয় (22)     │
└───────────────────┘
```

### 7.2 Add/Edit Category (Modal)

| Field | Type | Required |
|-------|------|----------|
| নাম | Text input | ✅ |
| Parent Category | Dropdown (none = root) | ❌ |
| রঙ | Color picker | ❌ |
| Icon/Emoji | Emoji picker | ❌ |
| বিবরণ | Textarea | ❌ |

### 7.3 Sub-Category (Optional Feature Toggle)
- Settings → Feature Toggles → Sub-Categories: ON/OFF
- OFF হলে → Category form এ "Parent Category" field থাকবে না, flat list
- ON হলে → Parent-child hierarchy support

### 7.4 Delete Category
- Warning: "এই ক্যাটেগরিতে {n} টি পণ্য আছে। Delete করলে সেগুলো 'Uncategorized' হয়ে যাবে।"
- Sub-category delete → products move to parent category
- Parent category delete → sub-categories become root categories

---

## 8. Module 04 — Inventory / Stock Management

### 8.1 Stock Overview Page (`/inventory`)

**Layout:**

**Top Section — Summary Cards:**
| Card | Value |
|------|-------|
| মোট পণ্যের সংখ্যা | Active product count |
| মোট Stock Value | SUM(stock × purchase_price) for all products |
| Low Stock Items | Products at/below alert level |
| Out of Stock Items | Products at 0 |

**Main Section — Product Stock Table:**
| Column | Description |
|--------|-------------|
| Product Name | With thumbnail |
| SKU | — |
| Category | — |
| Current Stock | 🟢🟡🔴 color coded |
| Alert Level | Low stock threshold |
| Stock Value | stock × purchase_price |
| Last Updated | When stock last changed |
| Actions | Adjust / History |

**Color Coding:**
- 🟢 Green: stock > low_stock_alert
- 🟡 Yellow: 0 < stock ≤ low_stock_alert
- 🔴 Red: stock = 0

**Variant Products:**
- Variant সহ product expand করা যাবে → variant-wise stock দেখাবে
- Total stock = SUM of all variant stocks

### 8.2 Stock Adjustment (Modal)

"Adjust" button click করলে modal:

```
┌─ Stock Adjustment ────────────────────┐
│                                       │
│  Product: Lux Soap 100g               │
│  Current Stock: 45 pcs                │
│                                       │
│  Adjustment Type:                     │
│  ○ Add Stock (+)                      │
│  ○ Remove Stock (-)                   │
│  ○ Set Stock (= exact number)         │
│                                       │
│  Quantity: [____]                      │
│  New Stock: 40 pcs  (auto calculate)  │
│                                       │
│  Reason: [dropdown ▼]                 │
│    • পণ্য নষ্ট (Damage)               │
│    • পণ্য হারিয়ে গেছে (Loss)           │
│    • কাস্টমার ফেরত (Return)            │
│    • Physical Count মেলানো             │
│    • অন্যান্য (Other)                  │
│                                       │
│  Notes: [__________________________]  │
│                                       │
│  [Cancel]              [Save Adjust]  │
└───────────────────────────────────────┘
```

**Save করলে:**
1. `products.stock` or `product_variants.stock` update
2. `stock_adjustments` table এ record
3. `stock_history` table এ entry
4. `activity_log` entry

### 8.3 Stock History (Per Product)

Product click → History tab:

```
Stock History — Lux Soap 100g
─────────────────────────────────────────────────────
Date            Action          Qty    Stock    Ref
─────────────────────────────────────────────────────
15/08  10:30   Opening Stock   +50    50       —
15/08  11:00   Sale            -3     47       INV-142
15/08  14:00   Sale            -2     45       INV-148
16/08  09:00   Purchase        +100   145      PUR-23
16/08  10:00   Damage          -5     140      ADJ-7
16/08  11:30   Sale            -1     139      INV-155
─────────────────────────────────────────────────────
```

### 8.4 Low Stock Alerts
- Dashboard এ warning card
- Inventory page এ filtered view
- (Future) Browser notification / push notification

---

## 9. Module 05 — POS / Billing System

### 9.1 POS Screen Layout

**Desktop Layout (side-by-side):**
```
┌────────────────────────────────┬──────────────────────┐
│  [🔍 Search products...]       │  🛒 Cart (3 items)   │
│  [📷 Scan QR] [Categories ▼]  │                      │
│                                │  Customer: [Select ▼]│
│ ┌──────┐ ┌──────┐ ┌──────┐   │  ─────────────────── │
│ │ 📦   │ │ 📦   │ │ 📦   │   │  Lux Soap  ×2  ৳100 │
│ │ Lux  │ │ Dettol│ │ Rice │   │   [-] 2 [+]    [❌] │
│ │ ৳50  │ │ ৳65  │ │ ৳80  │   │                      │
│ │ 45🟢 │ │ 12🟡 │ │ 0🔴  │   │  Oil       ×1  ৳120 │
│ └──────┘ └──────┘ └──────┘   │   [-] 1 [+]    [❌] │
│ ┌──────┐ ┌──────┐ ┌──────┐   │                      │
│ │ 📦   │ │ 📦   │ │ 📦   │   │  ─────────────────── │
│ │ Dal  │ │ Sugar│ │ Salt │   │  Subtotal:     ৳220 │
│ │ ৳90  │ │ ৳100│ │ ৳30  │   │  Discount:      -৳20│
│ └──────┘ └──────┘ └──────┘   │  ═══════════════════ │
│                                │  TOTAL:        ৳200 │
│  ← 1 2 3 4 →  (pagination)   │                      │
│                                │  [🗑 Clear] [⏸ Hold]│
│                                │  [💵 Checkout →]     │
└────────────────────────────────┴──────────────────────┘
```

**Mobile Layout (tabbed/swipeable):**
```
Tab 1: Products                  Tab 2: Cart
┌─────────────────────┐         ┌─────────────────────┐
│ [🔍 Search...] [📷] │         │ 🛒 Cart (3 items)   │
│                     │         │                     │
│ Categories:         │  swipe  │ [items list...]     │
│ [All][Food][Beauty] │  ←→     │                     │
│                     │         │ Total: ৳200         │
│ [product grid...]   │         │                     │
│                     │         │ [💵 Checkout →]     │
│                     │         │                     │
├─────────────────────┤         ├─────────────────────┤
│ 🏠  📦  🛒  📊  ⚙️  │         │ 🏠  📦  🛒  📊  ⚙️  │
└─────────────────────┘         └─────────────────────┘
                    Bottom Navigation Bar
```

### 9.2 Product Selection Methods

| Method | How | Detail |
|--------|-----|--------|
| **Grid Click** | Product card এ tap/click | Immediate add to cart (qty 1). Variant থাকলে variant selector popup আসবে |
| **Search** | Search bar এ নাম/SKU type | Filtered results → click to add |
| **QR Scan** | 📷 button → camera open | Scan → auto detect → add to cart |
| **Category Browse** | Category tabs/buttons → filtered grid | Quick filter by category |

### 9.3 Cart Behavior

| Action | Detail |
|--------|--------|
| Add item | Product grid/search/scan → item appears in cart with qty 1 |
| Same item again | Quantity increments (+1) instead of adding duplicate |
| Quantity change | +/- buttons, or tap quantity to type manually |
| Min quantity | 1 (can't go below, use ❌ to remove) |
| Max quantity | Can't exceed current stock (warning if tried) |
| Remove item | ❌ button → item removed from cart |
| Item discount | Each item row has small "discount" icon → opens discount input |
| Cart discount | Overall discount input below subtotal |
| Clear cart | 🗑 button → confirmation → empty cart |
| Hold cart | ⏸ button → cart saved with optional label → new empty cart starts |

### 9.4 Variant Selection (POS)

Product with variants click করলে popup:

```
┌─ Select Variant ──────────────────┐
│                                   │
│  Polo Classic T-Shirt             │
│                                   │
│  Size:                            │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐│
│  │  M  │ │  L  │ │ XL  │ │ XXL ││
│  │ ৳500│ │ ৳500│ │ ৳550│ │ ৳600││
│  │ 10🟢│ │  5🟡│ │  0🔴│ │  3🟢││
│  └─────┘ └─────┘ └─────┘ └─────┘│
│                                   │
│  XL: Out of Stock (disabled)      │
│                                   │
│  [Cancel]              [Add →]    │
└───────────────────────────────────┘
```

### 9.5 Hold Cart System

**Hold করলে:**
- Current cart → `held_carts` table এ save (locally + server)
- Optional: label/name দিতে পারবে ("করিম ভাই" বা "Table 3")
- New empty cart starts
- Multiple carts hold করা যাবে

**Resume করলে:**
- POS screen এ "Held Carts" button/icon → list of held carts দেখাবে
- Click করলে → held cart data cart এ load হবে, held cart delete হবে

```
┌─ Held Carts ──────────────────────┐
│                                   │
│  ┌───────────────────────────┐   │
│  │ করিম ভাই                  │   │
│  │ 3 items, ৳450            │   │
│  │ Held at 2:30 PM          │   │
│  │ [Resume]  [Delete]        │   │
│  └───────────────────────────┘   │
│                                   │
│  ┌───────────────────────────┐   │
│  │ Cart #2                   │   │
│  │ 1 item, ৳120             │   │
│  │ Held at 2:45 PM          │   │
│  │ [Resume]  [Delete]        │   │
│  └───────────────────────────┘   │
└───────────────────────────────────┘
```

### 9.6 Checkout Flow

```
Step 1: Cart ready (items added, quantities set)
    ↓
Step 2: Overall Discount (optional)
    - Type: % or ৳
    - Value input
    - Total recalculates
    ↓
Step 3: Customer Select (optional, mandatory if paying with due)
    - Search by name/phone
    - Quick Add new customer (inline form: name + phone)
    - "Walk-in Customer" option (no customer linked)
    ↓
Step 4: Payment
    ↓ (opens Checkout Modal)
```

### 9.7 Checkout Modal

```
┌─ Checkout ──────────────────────────────┐
│                                          │
│  Total: ৳400                             │
│                                          │
│  ── Payment Method(s) ──                │
│                                          │
│  ☑ Cash (নগদ)        ৳ [300_____]       │
│  ☐ bKash              ৳ [________]       │
│  ☐ Nagad              ৳ [________]       │
│  ☐ Rocket             ৳ [________]       │
│  ☐ Bank Transfer      ৳ [________]       │
│  ☐ Card               ৳ [________]       │
│                                          │
│  Ref No: [___________] (bKash TrxID)    │
│                                          │
│  ── Summary ──                          │
│  Paid:      ৳300                        │
│  Due:       ৳100    ← auto calculate    │
│                                          │
│  ⚠️ বাকি রাখতে কাস্টমার select করুন     │
│  Customer: করিম সাহেব ✓                  │
│                                          │
│  Notes: [_________________________]      │
│                                          │
│  [Cancel]           [✓ Complete Sale]    │
└──────────────────────────────────────────┘
```

**Payment Rules:**
- Multiple methods সমন্বয় করা যাবে (৳200 cash + ৳100 bKash + ৳100 due)
- Due > 0 হলে Customer **mandatory** (system enforce করবে)
- Paid > Total হলে → "ভাংতি (Change): ৳XX" দেখাবে
- bKash/Nagad select করলে optional "Reference No" field আসবে

### 9.8 Discount System

| Level | Type | Input |
|-------|------|-------|
| **Item-level** | Percentage (%) | 10% off on this item |
| **Item-level** | Fixed (৳) | ৳5 off on this item |
| **Overall** | Percentage (%) | 5% off on total bill |
| **Overall** | Fixed (৳) | ৳50 off on total bill |

**Discount Limits (Configurable in Settings):**
- Max discount % (e.g., Cashier can't give more than 10%)
- Max discount ৳ amount
- Only certain roles can give discount

**Calculation Order:**
1. Each item: unit_price × quantity = item_subtotal
2. Item discount applied → item_total
3. Sum all item_totals → subtotal
4. Overall discount applied → total
5. Tax (if enabled) → grand_total

### 9.9 Receipt Generation

**After sale completes:**
1. Sale record saved (`sales` + `sale_items` + `sale_payments`)
2. Stock auto-deducted (for each item)
3. Customer due updated (if applicable)
4. Receipt generated (HTML → printable format)
5. Print dialog opens (optional — can skip)
6. Receipt is saved and can be reprinted later

**Receipt Content:**
```
╔══════════════════════════════════╗
║       [দোকানের লোগো]            ║  ← (if logo uploaded)
║       [দোকানের নাম]              ║  ← from settings
║       [ঠিকানা]                   ║
║       [ফোন নম্বর]                ║
╠══════════════════════════════════╣
║  Receipt #: INV-2026-00142      ║
║  Date: 15/08/2026  10:30 PM     ║
║  Cashier: রহিম                   ║
║  Customer: করিম (if applicable) ║
╠══════════════════════════════════╣
║  Item         Qty  Price  Total ║
║  ─────────────────────────────  ║
║  Lux Soap      2   ৳50   ৳100  ║
║  Oil           1   ৳120  ৳120  ║
║  T-Shirt (L)   1   ৳500  ৳500  ║  ← variant info shown
╠══════════════════════════════════╣
║  Subtotal:            ৳720      ║
║  Discount:            ৳20       ║
║  Tax/VAT:             ৳0        ║
║  ═══════════════════════════     ║
║  TOTAL:               ৳700      ║
║  Paid (Cash):         ৳500      ║
║  Paid (bKash):        ৳100      ║
║  Due:                 ৳100      ║
╠══════════════════════════════════╣
║  Payment: Cash + bKash + Due    ║
║                                 ║
║     ধন্যবাদ! আবার আসবেন।        ║  ← from settings (customizable)
║       [QR Code]                 ║  ← QR of invoice ID (optional)
╚══════════════════════════════════╝
```

**Receipt customizable parts (Settings):**
- Logo show/hide
- Header text
- Footer text (ধন্যবাদ message)
- Show customer info: yes/no
- Show cashier name: yes/no
- Show QR code on receipt: yes/no
- Paper size: 58mm / 80mm thermal / A4

### 9.10 Invoice Number Generation

```
Pattern: {prefix}{year}-{5-digit-sequential}
Example: INV-2026-00001, INV-2026-00002, ...

- Prefix configurable in settings (default: "INV-")
- Year resets count (INV-2027-00001 starts fresh)
- Counter stored in store_settings
- Offline: local counter used, reconciled on sync
```

---

## 10. Module 06 — QR Code System

### 10.1 QR Code Modes (Settings দিয়ে configurable)

| Mode | QR Content | Public Scan Result |
|------|-----------|-------------------|
| **Mode 1: Text Only** | `QRPOS::{sku}::{product_name}::{selling_price}` | Phone এর QR reader text দেখাবে — কোনো web link নেই |
| **Mode 2: App Public Page** | `https://yourapp.com/p/{sku}` | আমাদের public product page খুলবে |
| **Mode 3: Custom URL** | `{custom_url_pattern}` with `{sku}` replaced | Owner এর website এর page খুলবে |

### 10.2 QR Smart Parser (`qr-parser.ts`)

POS app দিয়ে scan করলে parser যেকোনো format বুঝবে:

```typescript
function parseQRContent(scannedText: string, storeId: string): ParseResult {
    // Pattern 1: Text mode → "QRPOS::LUX-100::Lux Soap::50"
    if (scannedText.startsWith('QRPOS::')) {
        const sku = scannedText.split('::')[1];
        return { type: 'sku', identifier: sku };
    }

    // Pattern 2: App page URL → "https://qrpos.app/p/LUX-100"
    if (scannedText.includes('/p/')) {
        const identifier = scannedText.split('/p/')[1];
        return { type: 'sku', identifier };
    }

    // Pattern 3: Custom URL → extract SKU from URL pattern
    // Uses store's custom_url_pattern setting to find {sku} position
    const customPattern = getStoreSetting('qr_config.custom_url_pattern');
    if (customPattern) {
        const identifier = extractFromPattern(scannedText, customPattern);
        if (identifier) return { type: 'sku', identifier };
    }

    // Pattern 4: Plain SKU text
    return { type: 'sku', identifier: scannedText.trim() };
}
```

### 10.3 QR Code Generation

**Auto-generate:**
- প্রতিটি product save করলে QR code auto-generate হবে
- Variant সহ product এর প্রতিটি variant এর আলাদা QR হবে
- QR content → current mode setting অনুযায়ী

**Manual generate:**
- QR Management page (`/qr`) থেকে যেকোনো product এর QR regenerate করা যাবে

### 10.4 QR Label Design & Print

**Label Sizes:**
| Size | Dimensions | Use Case |
|------|-----------|----------|
| Small | 30mm × 20mm | Sticker on small products |
| Medium | 50mm × 30mm | Standard price tag |
| Large | 70mm × 50mm | Shelf label |

**Label Content (configurable):**
```
┌─────────────────┐
│  ┌───────────┐  │
│  │  QR CODE  │  │  ← Always present
│  │  ▓▓▓▓▓▓▓  │  │
│  │  ▓▓▓▓▓▓▓  │  │
│  └───────────┘  │
│  Lux Soap 100g  │  ← ☑ Product Name (toggle)
│     ৳ 50        │  ← ☑ Price (toggle)
│  SKU: LUX-100   │  ← ☑ SKU (toggle)
│  [দোকানের নাম]   │  ← ☐ Store Name (toggle)
└─────────────────┘
```

**Print Options:**
| Feature | Detail |
|---------|--------|
| Single Print | একটি product এর QR print |
| Bulk Print | Product list থেকে multiple select → print all |
| Copies | প্রতিটি QR এর কতটা copy চান (1-100) |
| Sheet Layout | A4 sheet এ কতগুলো label বসবে (auto calculate based on size) |
| Thermal Print | 58mm/80mm thermal printer support |

**Bulk Print Page (`/qr/print`):**
```
┌──────────────────────────────────────────────┐
│  QR Print Preview                             │
│                                              │
│  Selected: 24 products                       │
│  Label Size: Medium (50mm × 30mm)            │
│  Copies per label: 2                         │
│  Total labels: 48                            │
│  Sheet layout: 4 × 6 = 24 per A4 page       │
│  Pages: 2                                    │
│                                              │
│  ┌─────────────────────────────────────────┐ │
│  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐          │ │
│  │  │ QR │ │ QR │ │ QR │ │ QR │   ...    │ │
│  │  │Lux │ │Det │ │Oil │ │Rice│          │ │
│  │  │৳50 │ │৳65 │ │৳120│ │৳80 │          │ │
│  │  └────┘ └────┘ └────┘ └────┘          │ │
│  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐          │ │
│  │  │... │ │... │ │... │ │... │   ...    │ │
│  │  └────┘ └────┘ └────┘ └────┘          │ │
│  └─────────────────────────────────────────┘ │
│                                              │
│  [🖨 Print]                                  │
└──────────────────────────────────────────────┘
```

### 10.5 Public Product Page (`/p/[identifier]`)

**Mode 2 থাকলে public QR scan এ এই page খুলবে:**

```
┌──────────────────────────────┐
│  [দোকানের লোগো ও নাম]        │
│                              │
│  ┌────────────────────────┐  │
│  │                        │  │
│  │    [পণ্যের ছবি]         │  │
│  │                        │  │
│  └────────────────────────┘  │
│                              │
│  Lux Soap 100g               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━   │
│  মূল্য: ৳50                  │
│                              │
│  ক্যাটেগরি: প্রসাধনী          │
│                              │
│  বিবরণ:                      │
│  ত্বকের যত্নে সেরা সাবান...   │
│                              │
│  ─────────────────────────   │
│  📍 [দোকানের নাম]            │
│  📞 01XXXXXXXXX              │
│  📍 [ঠিকানা]                 │
│                              │
│  ❌ ক্রয়মূল্য দেখাবে না       │
│  ❌ স্টক দেখাবে না             │
│  ❌ লাভ দেখাবে না             │
└──────────────────────────────┘
```

- এই page public — login ছাড়া accessible
- SEO friendly (product name, description in meta tags)
- শুধু selling price, ছবি, বিবরণ, দোকানের তথ্য দেখাবে
- ক্রয়মূল্য, stock, profit — কিছুই দেখাবে না

### 10.6 Internal QR Scan (POS)

POS page এ "Scan" button:
1. Camera opens (using `html5-qrcode` library)
2. QR code detected → `qr-parser.ts` দিয়ে parse
3. Product identified → local DB তে search
4. Found → add to cart (auto close scanner, or keep open for continuous scan)
5. Not found → "পণ্য পাওয়া যায়নি" error toast
6. Variant product → variant selector popup opens first

**Continuous Scan Mode:**
- Toggle: "একটানা scan" ON/OFF
- ON হলে → scan করার পর camera open থাকবে, পরেরটা scan করা যাবে
- প্রতিটি successful scan এ beep sound + vibration
- OFF হলে → scan করলে camera বন্ধ হবে

---

## 11. Module 07 — Customer Management & Due System

### 11.1 Customer List Page (`/customers`)

**Layout:**
- Top: Search bar + "Add Customer" button + Filter (Due/All)
- Body: Table

**Table Columns:**
| Column | Sort |
|--------|------|
| নাম | ✅ |
| ফোন | ✅ |
| মোট বাকি | ✅ |
| মোট কেনাকাটা | ✅ |
| সর্বশেষ কেনাকাটা | ✅ |
| Actions | Due Payment / View / Edit |

**Filters:**
- সব কাস্টমার
- বাকি আছে (due > 0)
- বাকি নেই (due = 0)

### 11.2 Add Customer (Form / Quick Add)

**Full Form (`/customers` page):**
| Field | Type | Required |
|-------|------|----------|
| নাম | Text | ✅ |
| ফোন | Phone input | ✅ (unique per store) |
| ঠিকানা | Textarea | ❌ |
| ইমেইল | Email | ❌ |
| নোট | Textarea | ❌ |

**Quick Add (POS Checkout থেকে):**
- শুধু নাম + ফোন → inline form → save → auto-select in checkout
- ফোন দিয়ে duplicate check

### 11.3 Customer Profile Page (`/customers/[id]`)

```
┌──────────────────────────────────────────┐
│  👤 করিম সাহেব                            │
│  📞 01712345678                           │
│  📍 মিরপুর, ঢাকা                          │
│                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ মোট বাকি  │ │ মোট কেনা │ │ মোট বার  │ │
│  │ ৳400     │ │ ৳12,500  │ │ 28       │ │
│  └──────────┘ └──────────┘ └──────────┘ │
│                                          │
│  [💰 বাকি নিন]  [✏️ Edit]                │
│                                          │
│  ── Transaction History ──              │
│                                          │
│  15/08  কেনাকাটা  ৳500  Paid: ৳300      │
│         INV-142   Due: +৳200            │
│                                          │
│  17/08  বাকি শোধ   ৳100  Due: -৳100     │
│                                          │
│  18/08  কেনাকাটা  ৳300  Paid: ৳0        │
│         INV-155   Due: +৳300            │
│                                          │
│  ─────────────────────────────────       │
│  বর্তমান বাকি: ৳400                      │
└──────────────────────────────────────────┘
```

### 11.4 Due Payment (বাকি পরিশোধ)

**"বাকি নিন" button → Modal:**

```
┌─ বাকি পরিশোধ ────────────────────┐
│                                   │
│  Customer: করিম সাহেব              │
│  বর্তমান বাকি: ৳400               │
│                                   │
│  Amount: ৳ [________]             │
│                                   │
│  Quick amounts:                   │
│  [৳100] [৳200] [৳400 Full]        │
│                                   │
│  Payment Method: [Cash ▼]        │
│  Reference: [__________]         │
│  Notes: [___________________]    │
│                                   │
│  ── After Payment ──             │
│  New Balance: ৳300               │
│                                   │
│  [Cancel]     [✓ Receive Payment]│
└───────────────────────────────────┘
```

**Payment করলে:**
1. `due_payments` table এ record
2. `customers.total_due` update (decrease)
3. `activity_log` entry
4. Customer profile page auto-refresh

### 11.5 Due Reports Integration
- Dashboard → "মোট বাকি" card → click → due report page
- Reports → Due Report (details in Module 12)

---

## 12. Module 08 — Supplier Management

### 12.1 Supplier List (`/suppliers`)

**Table Columns:**
| Column | Description |
|--------|-------------|
| নাম | Supplier name |
| কোম্পানি | Company name |
| ফোন | Contact number |
| মোট বাকি | How much owed to supplier |
| মোট ক্রয় | Total purchases from supplier |
| Actions | View / Edit / Pay |

### 12.2 Add/Edit Supplier (Form)

| Field | Required |
|-------|----------|
| নাম | ✅ |
| কোম্পানি | ❌ |
| ফোন | ✅ |
| ইমেইল | ❌ |
| ঠিকানা | ❌ |
| নোট | ❌ |

### 12.3 Supplier Profile (`/suppliers/[id]`)

Like customer profile but with:
- Total purchases from this supplier
- Purchase history list
- Supplier due (money owed TO supplier)
- Payment history

### 12.4 Supplier Payment

Same concept as customer due payment — modal with amount, method, reference.

---

## 13. Module 09 — Sales History & Returns

### 13.1 Sales List Page (`/sales`)

**Table Columns:**
| Column | Sort | Filter |
|--------|------|--------|
| Invoice # | ✅ | Search |
| Date | ✅ | Date range |
| Customer | ✅ | Search |
| Items Count | — | — |
| Total | ✅ | — |
| Paid | ✅ | — |
| Due | ✅ | — |
| Status | — | Paid / Partial / Due |
| Payment Method | — | Cash / bKash / etc. |
| Cashier | — | Dropdown |
| Actions | — | View / Print / Return |

### 13.2 Sale Detail Page (`/sales/[id]`)

```
┌──────────────────────────────────────────┐
│  Invoice: INV-2026-00142                 │
│  Date: 15/08/2026  10:30 PM             │
│  Cashier: রহিম                           │
│  Customer: করিম সাহেব                     │
│                                          │
│  ── Items ──                            │
│  ┌─────────────────────────────────────┐ │
│  │ Item        Qty   Price    Total    │ │
│  │ Lux Soap     2    ৳50     ৳100     │ │
│  │ Oil          1    ৳120    ৳120     │ │
│  │ T-Shirt (L)  1    ৳500    ৳500     │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  Subtotal:  ৳720                        │
│  Discount:  ৳20 (Overall)               │
│  Total:     ৳700                        │
│                                          │
│  ── Payments ──                         │
│  Cash:    ৳500                          │
│  bKash:   ৳100  (Ref: TRX123456)       │
│  Due:     ৳100                          │
│                                          │
│  [🖨 Reprint]  [↩ Return]               │
└──────────────────────────────────────────┘
```

### 13.3 Sale Return Flow

1. Sale detail page → "Return" button click
2. Return form:
   - Select which items to return (checkbox)
   - Enter return quantity per item (can't exceed original qty)
   - Enter reason
   - Select refund method: Cash / Due Adjust / Credit Note

```
┌─ Sale Return ─────────────────────────────┐
│                                            │
│  Invoice: INV-2026-00142                   │
│                                            │
│  Select items to return:                   │
│  ☑ Lux Soap    Sold: 2   Return: [1_]     │
│  ☐ Oil         Sold: 1   Return: [__]      │
│  ☑ T-Shirt (L) Sold: 1   Return: [1_]     │
│                                            │
│  Refund Amount: ৳550                       │
│                                            │
│  Reason: [____________________________]    │
│                                            │
│  Refund Method:                            │
│  ○ Cash Refund (নগদ ফেরত)                  │
│  ○ Adjust from Due (বাকি থেকে কাটা)        │
│  ○ Credit Note (পরে ব্যবহারযোগ্য)          │
│                                            │
│  [Cancel]            [✓ Process Return]    │
└────────────────────────────────────────────┘
```

3. Return process করলে:
   - `sale_returns` + `sale_return_items` record
   - `sale_items.returned_qty` update
   - Product stock ফেরত (increase)
   - `stock_history` entry
   - If "Due Adjust" → customer due decrease
   - If "Cash Refund" → cash register decrease (just record, no cash tracking)
   - Activity log

### 13.4 Receipt Reprint
- Sale detail page → "Reprint" → same receipt format print

### 13.5 Export
- Sales list → "Export" button → CSV or Excel download
- Date range filtered

---

## 14. Module 10 — Purchase / Stock-In Management

### 14.1 Purchase List (`/purchases`)

**Table Columns:**
| Column | Sort |
|--------|------|
| Reference # | ✅ |
| Date | ✅ |
| Supplier | ✅ |
| Items Count | — |
| Total | ✅ |
| Paid | ✅ |
| Due | ✅ |
| Status | Paid/Partial/Due |
| Actions | View / Edit |

### 14.2 Add Purchase (`/purchases/add`)

**Form Flow:**
1. Select Supplier (dropdown + quick add)
2. Add items:
   - Search product → select → enter quantity + purchase price
   - Or select from product list
   - Multiple items add করা যাবে
3. Purchase summary:
   - Subtotal
   - Discount (if any)
   - Total
4. Payment:
   - Same as sale checkout — Cash / Due / Partial / Mixed
5. Save

**Purchase save করলে:**
- `purchases` + `purchase_items` record
- Product stock auto-increase (for each item)
- Product `purchase_price` update (optional — ask "update purchase price?")
- `stock_history` entry (action: 'purchase')
- Supplier due update (if applicable)
- Activity log

### 14.3 Purchase Detail
Like sale detail — shows items, amounts, payment breakdown.

---

## 15. Module 11 — Expense Management

### 15.1 Expense Page (`/expenses`)

**Layout:**
- Top: "Add Expense" button + Date filter + Category filter
- Summary cards: This month's total, today's total
- Table of expenses

**Table Columns:**
| Column | Sort |
|--------|------|
| Date | ✅ |
| Category | ✅ |
| Description | — |
| Amount | ✅ |
| Payment Method | — |
| Recorded By | — |
| Actions | Edit / Delete |

### 15.2 Add Expense (Modal)

| Field | Type | Required |
|-------|------|----------|
| Category | Dropdown + quick add | ✅ |
| Amount | Number | ✅ |
| Date | Date picker | ✅ (default: today) |
| Description | Textarea | ❌ |
| Payment Method | Dropdown | ✅ (default: Cash) |
| Reference | Text | ❌ |

### 15.3 Default Expense Categories
System auto-creates these:
- ভাড়া (Rent)
- বিদ্যুৎ (Electricity)
- বেতন (Salary)
- পরিবহন (Transportation)
- রক্ষণাবেক্ষণ (Maintenance)
- অফিস সরবরাহ (Office Supplies)
- অন্যান্য (Others)

Owner can add custom categories.

---

## 16. Module 12 — Reports & Analytics

### 16.1 Reports Hub (`/reports`)

**Report cards grid — click করলে individual report page:**

| Report | Icon | Description |
|--------|------|-------------|
| বিক্রি রিপোর্ট | 📊 | Period-wise sales summary |
| লাভ-ক্ষতি | 💰 | Revenue - Cost - Expenses = Net Profit |
| পণ্য-ভিত্তিক বিক্রি | 📦 | Which products sold most/least |
| ক্যাটেগরি-ভিত্তিক বিক্রি | 🏷️ | Sales by category |
| স্টক রিপোর্ট | 📋 | Current stock status, value |
| বাকি রিপোর্ট | 💳 | Customer dues breakdown |
| খরচ রিপোর্ট | 💸 | Expense breakdown |
| কর্মী রিপোর্ট | 👨‍💼 | Staff-wise performance |
| পেমেন্ট রিপোর্ট | 💵 | Payment method breakdown |
| দৈনিক সারসংক্ষেপ | 📝 | End-of-day summary |
| ক্রয় রিপোর্ট | 🛍️ | Purchase history summary |

### 16.2 Common Report Features

Every report has:
- **Date range picker:** আজ / গতকাল / এই সপ্তাহ / এই মাস / গত মাস / Custom range
- **Charts/Graphs:** Relevant visual representation
- **Data table:** Detailed numbers
- **Export:** CSV / Excel download button
- **Print:** Print-friendly version

### 16.3 Report Details

#### Sales Report
| Metric | Description |
|--------|-------------|
| Total Sales | মোট বিক্রি (৳) |
| Transaction Count | কতটি বিক্রি হয়েছে |
| Average Sale Value | গড় বিক্রি (total / count) |
| Daily Breakdown | দিনভিত্তিক বিক্রি |
| Top Products | সবচেয়ে বেশি বিক্রি হওয়া পণ্য |
| Sales Chart | Line chart (trend over period) |

#### Profit & Loss Report
```
Revenue (বিক্রি):           ৳1,00,000
Cost of Goods Sold (ক্রয়):  ৳70,000
─────────────────────────────
Gross Profit:               ৳30,000
Expenses:                   ৳10,000
─────────────────────────────
Net Profit:                 ৳20,000
Profit Margin:              20%
```

#### Stock Report
| Section | Shows |
|---------|-------|
| Total Stock Value | SUM(stock × purchase_price) |
| Product count by stock status | In stock / Low / Out |
| Category-wise stock value | Stock ৳ per category |
| Slow moving | Products not sold in X days |
| Fast moving | Top selling products |

#### Due Report
| Section | Shows |
|---------|-------|
| Total Receivable | সব customer এর মোট বাকি |
| Customer-wise due | Each customer's due amount |
| Aging | কবে থেকে বাকি (0-7 days, 7-30 days, 30+ days) |
| Collection this period | Period এ কত বাকি আদায় হয়েছে |

#### Daily Summary Report
```
দৈনিক সারসংক্ষেপ — 15/08/2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

বিক্রি:
  মোট বিক্রি:          ৳15,000
  নগদ বিক্রি:           ৳10,000
  bKash বিক্রি:         ৳3,000
  বাকি বিক্রি:          ৳2,000
  Transaction:          25টি
  
ক্রয়:
  আজকের ক্রয়:          ৳5,000
  
খরচ:
  আজকের খরচ:           ৳500

বাকি:
  নতুন বাকি:           ৳2,000
  বাকি আদায়:           ৳1,500
  
ক্যাশ সামারি:
  Opening:              ৳5,000
  + নগদ বিক্রি:         ৳10,000
  + bKash:             ৳3,000
  + বাকি আদায় (নগদ):    ৳1,500
  - নগদ ক্রয়:           -৳5,000
  - খরচ (নগদ):          -৳500
  ─────────────────────
  Closing Cash:         ৳14,000
```

---

## 17. Module 13 — User / Staff Management

### 17.1 Staff List (`/staff`)

**Table:**
| Column | Description |
|--------|-------------|
| নাম | Staff name |
| ফোন | Phone |
| Role | Owner / Admin / Manager / Cashier |
| Status | Active ✅ / Inactive ❌ |
| Last Login | When they last logged in |
| Actions | Edit / Deactivate / Reset Password |

### 17.2 Add Staff (Form)

| Field | Required |
|-------|----------|
| নাম | ✅ |
| ফোন | ✅ |
| ইমেইল | ❌ |
| Password | ✅ (min 6 chars) |
| Role | ✅ (dropdown) |
| PIN Code | ❌ (4-digit for quick POS switch) |

**Staff তৈরি হলে:**
1. Supabase Auth এ user create
2. `staff` table এ record (linked via `auth_user_id`)
3. Invitation email/SMS (optional, future)

### 17.3 Role Management

**Predefined Roles (described in Section 4.2):**
- Owner, Admin, Manager, Cashier

**Custom Permissions Override:**
Owner চাইলে specific staff এর permissions override করতে পারবে:

```
Staff Edit → Permissions:
┌────────────────────────────────────────┐
│  Role: Cashier                         │
│  (Default permissions applied)         │
│                                        │
│  Custom Overrides:                     │
│  ☑ Can give discount (max 10%)        │
│  ☐ Can view purchase price             │
│  ☐ Can receive due payments            │
│  ☑ Can add new customers               │
│  ☐ Can see other cashiers' sales       │
└────────────────────────────────────────┘
```

### 17.4 Activity Log View

Staff → Activity History tab:
- What this staff did (sales, adjustments, logins)
- Filtered by date

---

## 18. Module 14 — Settings & Configuration

### 18.1 Settings Page (`/settings`)

Settings page — grouped sections with save buttons:

#### Section 1: Business Information
| Setting | Type | Default |
|---------|------|---------|
| দোকানের নাম | Text | — |
| ঠিকানা | Textarea | — |
| ফোন | Text | — |
| ইমেইল | Text | — |
| লোগো | Image upload | — |

#### Section 2: Currency & Regional
| Setting | Type | Default |
|---------|------|---------|
| Currency Symbol | Text | ৳ |
| Currency Code | Text | BDT |
| Timezone | Dropdown | Asia/Dhaka |
| Date Format | Dropdown | DD/MM/YYYY |

#### Section 3: Invoice / Receipt
| Setting | Type | Default |
|---------|------|---------|
| Invoice Prefix | Text | "INV-" |
| Show Logo on Receipt | Toggle | ✅ |
| Show Customer on Receipt | Toggle | ✅ |
| Show Cashier on Receipt | Toggle | ✅ |
| Show QR on Receipt | Toggle | ❌ |
| Receipt Footer Message | Textarea | "ধন্যবাদ! আবার আসবেন।" |
| Receipt Paper Size | Dropdown | 80mm Thermal |

#### Section 4: Tax / VAT
| Setting | Type | Default |
|---------|------|---------|
| Enable Tax | Toggle | ❌ |
| Tax Name | Text | "VAT" |
| Tax Rate (%) | Number | 0 |
| Tax Inclusive/Exclusive | Dropdown | Exclusive |

#### Section 5: QR Code Configuration
| Setting | Type | Default |
|---------|------|---------|
| QR Scan Mode | Radio: Text / App Page / Custom URL | Text Only |
| Custom URL Pattern | Text (if Mode 3) | — |
| QR Label: Show Product Name | Toggle | ✅ |
| QR Label: Show Price | Toggle | ✅ |
| QR Label: Show SKU | Toggle | ✅ |
| QR Label: Show Store Name | Toggle | ❌ |
| Default Label Size | Dropdown | Medium |

#### Section 6: Payment Methods
| Setting | Type | Default |
|---------|------|---------|
| Cash (নগদ) | Toggle | ✅ (always on) |
| bKash | Toggle | ✅ |
| Nagad | Toggle | ✅ |
| Rocket | Toggle | ❌ |
| Bank Transfer | Toggle | ❌ |
| Card | Toggle | ❌ |

#### Section 7: Inventory
| Setting | Type | Default |
|---------|------|---------|
| Default Low Stock Alert | Number | 5 |
| Allow negative stock | Toggle | ❌ |
| Show stock on POS | Toggle | ✅ |

#### Section 8: Feature Toggles
| Feature | Toggle | Default |
|---------|--------|---------|
| Product Variations (Size/Color) | Toggle | ❌ |
| Sub-Categories | Toggle | ❌ |
| Expense Tracking | Toggle | ✅ |
| Supplier Management | Toggle | ✅ |
| Sale Returns | Toggle | ✅ |
| Staff Activity Log | Toggle | ✅ |
| Hold Cart | Toggle | ✅ |

#### Section 9: Appearance
| Setting | Type | Default |
|---------|------|---------|
| Theme | Toggle: Dark / Light | Dark |
| Primary Color | Color picker | — |
| Language | Dropdown: বাংলা / English | বাংলা |
| POS Product View | Toggle: Grid / List | Grid |

#### Section 10: Data Management
| Setting | Action |
|---------|--------|
| Export All Data | Download full backup (JSON/ZIP) |
| Import Data | Upload backup to restore |
| Clear All Sales | ⚠️ Dangerous — confirmation required |
| Delete Account | ⚠️ Dangerous — confirmation required |

---

## 19. Image Handling Strategy

### 19.1 Upload Flow

```
User selects/captures image
    ↓
Client-side compression (browser):
    - Max dimensions: 1200px × 1200px
    - Quality: 80%
    - Format: WebP (fallback: JPEG)
    - Max size: 500KB
    ↓
Generate thumbnail:
    - Max dimensions: 200px × 200px
    - Quality: 60%
    - Max size: 50KB
    ↓
Online?
    ├── YES → Upload to Supabase Storage
    │         → Get CDN URL
    │         → Save URL in product record
    │
    └── NO  → Save compressed image in IndexedDB (Dexie)
              → Queue for upload (sync_queue)
              → When online: upload → get URL → update record → delete local
```

### 19.2 Display Flow

```
Product image needed:
    ↓
Check Service Worker cache → Hit? → Show cached image ✅
    ↓ Miss
Online?
    ├── YES → Fetch from Supabase CDN
    │         → Cache in Service Worker
    │         → Show image ✅
    │
    └── NO  → Check IndexedDB for local copy
              ├── Found → Show local image ✅
              └── Not found → Show placeholder icon 📦
```

### 19.3 Storage Limits

| Scenario | Estimated Size |
|----------|---------------|
| 100 products × 500KB | ~50 MB |
| 500 products × 500KB | ~250 MB |
| 1000 products × 500KB | ~500 MB |
| Service Worker cache limit | ~60% of free disk (Chrome) |
| IndexedDB limit | ~80% of free disk (Chrome) |

> [!NOTE]
> **Practical limit:** 1000 products with images = ~500MB. Modern phones have 32-128GB storage। 500MB is negligible — **no crash risk.**

### 19.4 Image Optimization Details

```typescript
// src/lib/utils/image.ts

async function compressImage(file: File): Promise<{
    full: Blob;
    thumbnail: Blob;
}> {
    // 1. Read file into canvas
    // 2. Resize to max 1200x1200 (maintain aspect ratio)
    // 3. Export as WebP at 80% quality
    // 4. Create thumbnail: resize to max 200x200, 60% quality
    // 5. Check size: if > 500KB, reduce quality incrementally
    return { full, thumbnail };
}
```

---

## 20. Offline / Online Sync Architecture

### 20.1 Local Database (Dexie.js / IndexedDB)

Local DB mirrors the Supabase schema — same tables, same columns:

```typescript
// src/lib/db/local.ts

import Dexie from 'dexie';

class QRPOSLocalDB extends Dexie {
    products!: Table<Product>;
    productVariants!: Table<ProductVariant>;
    categories!: Table<Category>;
    customers!: Table<Customer>;
    suppliers!: Table<Supplier>;
    sales!: Table<Sale>;
    saleItems!: Table<SaleItem>;
    salePayments!: Table<SalePayment>;
    duePayments!: Table<DuePayment>;
    purchases!: Table<Purchase>;
    purchaseItems!: Table<PurchaseItem>;
    expenses!: Table<Expense>;
    stockAdjustments!: Table<StockAdjustment>;
    stockHistory!: Table<StockHistory>;
    heldCarts!: Table<HeldCart>;
    settings!: Table<Setting>;
    syncQueue!: Table<SyncQueueItem>;

    constructor() {
        super('qrpos');
        this.version(1).stores({
            products: 'id, store_id, sku, category_id, name, is_active',
            productVariants: 'id, product_id, sku',
            categories: 'id, store_id, parent_id',
            customers: 'id, store_id, phone, name',
            suppliers: 'id, store_id, phone',
            sales: 'id, store_id, invoice_no, customer_id, sale_date',
            saleItems: 'id, sale_id, product_id',
            salePayments: 'id, sale_id',
            duePayments: 'id, customer_id, payment_date',
            purchases: 'id, store_id, supplier_id, purchase_date',
            purchaseItems: 'id, purchase_id, product_id',
            expenses: 'id, store_id, expense_date, category_id',
            stockAdjustments: 'id, product_id',
            stockHistory: 'id, product_id, created_at',
            heldCarts: 'id, store_id',
            settings: 'id, [store_id+setting_key]',
            syncQueue: '++id, table_name, status, created_at',
        });
    }
}

export const localDB = new QRPOSLocalDB();
```

### 20.2 Sync Strategy

**Direction:** Bi-directional — local ↔ Supabase

**Priority:** Local-first (offline-capable)

```
App starts:
    ↓
Online?
    ├── YES → Full sync: Supabase → Local (initial or delta)
    │         → App works with local data (fast queries)
    │         → Background: watch for changes, sync periodically
    │
    └── NO  → App works with local data only
              → All writes go to local DB + sync_queue
              → When online: process sync_queue → push to Supabase

Real-time (online):
    → Supabase Realtime subscription
    → Server changes → auto-sync to local
    → Local changes → push to Supabase + broadcast
```

### 20.3 Sync Queue Processing

```
When online detected (navigator.onLine event):
    ↓
Get all pending items from sync_queue (status = 'pending')
    ↓
Sort by created_at (oldest first)
    ↓
For each item:
    ├── operation = 'create' → Supabase INSERT
    ├── operation = 'update' → Supabase UPDATE
    └── operation = 'delete' → Supabase DELETE
    ↓
Success → Mark as 'done', delete from queue
    ↓
Failure → Increment retry_count, set last_error
    ├── retry_count < 5 → Keep in queue, retry later
    └── retry_count >= 5 → Flag for manual review
```

### 20.4 Conflict Resolution

```
Conflict scenario: Same record edited offline on 2 devices

Strategy: Last-Write-Wins (LWW) based on updated_at timestamp

Rule: The record with the latest updated_at wins.
Exception: Sales — NEVER overwrite, always keep both (reconcile manually)

For critical data (sales, payments):
    → Always create new records (INSERT), never UPDATE existing
    → UUID generated locally ensures no ID conflicts
```

### 20.5 Initial Data Load

```
First login:
    → Fetch from Supabase:
        - All products (active)
        - All categories
        - All customers (active)
        - All suppliers (active)
        - Recent sales (last 30 days)
        - Settings
    → Store in local DB
    → App ready for offline use

Subsequent opens:
    → Delta sync: fetch only records with updated_at > last_sync_time
    → Much faster than full sync
```

### 20.6 PWA / Service Worker

```
Workbox configuration:
    ├── Pre-cache: App shell (HTML, CSS, JS, fonts, icons)
    ├── Runtime cache:
    │   ├── Images → CacheFirst (cache, fallback to network)
    │   ├── API calls → NetworkFirst (try network, fallback to cache)
    │   └── Static assets → StaleWhileRevalidate
    └── Background Sync:
        → Failed API calls queued and retried when online
```

---

## 21. Responsive Layout (Mobile + Desktop)

### 21.1 Navigation

**Desktop (≥768px):**
- Left sidebar (collapsible)
- Navigation items with icons + text
- User info at bottom
- Active page highlighted

**Mobile (<768px):**
- Bottom navigation bar (5 items max)
- Primary: 🏠 Home | 📦 Products | 🛒 POS | 📊 Reports | ⚙️ More
- "More" → drawer with remaining nav items

### 21.2 POS Screen Responsive

**Desktop:** Side-by-side layout (products left, cart right) — always visible
**Mobile:** Tabbed layout (products tab + cart tab), floating cart badge showing item count

### 21.3 Breakpoints

```css
/* Mobile first approach */
:root {
    /* Breakpoints */
    --bp-sm: 576px;   /* Small devices */
    --bp-md: 768px;   /* Tablets */
    --bp-lg: 1024px;  /* Desktop */
    --bp-xl: 1280px;  /* Large desktop */
}
```

### 21.4 Touch vs Mouse

| Interaction | Mobile | Desktop |
|-------------|--------|---------|
| Product card | Touch (larger tap targets, min 44px) | Click (can be smaller) |
| Quantity +/- | Large touch buttons | Normal buttons + keyboard input |
| QR Scan | Phone camera (native, smooth) | Webcam / USB scanner |
| Navigation | Swipe gestures + bottom nav | Sidebar clicks |
| Forms | Full-screen modals | Side panels / inline |

---

## 22. Development Phases & Roadmap

### Phase 0: Project Setup (1-2 days)
- [ ] Next.js project initialization
- [ ] TypeScript configuration
- [ ] Supabase project creation & configuration
- [ ] Database migration files (all tables)
- [ ] CSS design system (globals.css — colors, typography, spacing)
- [ ] Reusable UI components library (Button, Input, Modal, Table, Card)
- [ ] Layout components (AppShell, Sidebar, BottomNav)
- [ ] Auth setup (login/signup pages + Supabase Auth)
- [ ] Local database setup (Dexie.js)
- [ ] PWA manifest + basic Service Worker

### Phase 1: P0 — Core Features (Must Have)
- [ ] **Product Management** — Add, Edit, List, Delete (soft), Search, Filter
- [ ] **Category Management** — CRUD, product count
- [ ] **POS / Billing** — Product grid, Search, Cart, Quantity, Checkout
- [ ] **Payment Processing** — Cash, bKash, Nagad, Due, Mixed, Partial
- [ ] **Discount System** — Item-level, Overall, %, ৳
- [ ] **Receipt** — Generate, Print, PDF
- [ ] **QR Code** — Generate, Print (single + bulk), Internal Scan (POS), Public page
- [ ] **Customer Management** — Add, List, Search, Profile
- [ ] **Due/Credit System** — Due tracking, Due payment, Transaction history
- [ ] **Basic Dashboard** — Summary cards (today's sales, total due, product count, low stock)

### Phase 2: P1 — Essential Features
- [ ] **Inventory / Stock** — Overview, Adjustment, History, Low stock alerts, Color coding
- [ ] **Sales History** — List, Detail, Reprint, Search, Filter
- [ ] **Hold Cart** — Hold, Resume, Multiple held carts
- [ ] **Offline Support** — Local DB, Sync queue, Service Worker caching
- [ ] **Image Handling** — Compression, Upload, Cache, Offline images
- [ ] **QR Configurable Modes** — 3 modes (Text, App Page, Custom URL), Settings UI
- [ ] **Product Variants** — Optional toggle, Variant form, POS variant selector, Variant stock
- [ ] **Invoice Number** — Auto-generation, Prefix configuration

### Phase 3: P2 — Professional Features
- [ ] **Purchase Management** — Add purchase, List, Detail, Stock auto-update
- [ ] **Supplier Management** — CRUD, Profile, Due tracking, Payment
- [ ] **Expense Management** — Add, List, Categories, Monthly summary
- [ ] **Sale Returns** — Return flow, Refund, Stock restore
- [ ] **Reports** — All 11 reports with charts, filters, export
- [ ] **Staff Management** — Add staff, Roles, Permissions, Activity log
- [ ] **Settings** — All settings sections (Business, Receipt, QR, Tax, etc.)
- [ ] **Data Export** — CSV/Excel for sales, products, customers

### Phase 4: P3 — Polish & Enhancement
- [ ] **Advanced Dashboard** — Charts (sales trend, top products, category pie)
- [ ] **Search Optimization** — Fuzzy search, keyboard shortcuts
- [ ] **Bulk Operations** — Bulk price update, bulk delete, bulk category change
- [ ] **Print Optimization** — Thermal printer support, label printing fine-tuning
- [ ] **Keyboard Shortcuts** — POS shortcuts (F1-scan, F2-search, F5-checkout)
- [ ] **Backup & Restore** — Full data backup download/upload
- [ ] **Theme & Customization** — Dark/Light mode, Primary color
- [ ] **Performance** — Lazy loading, Virtual scrolling for large lists
- [ ] **Feature Toggles** — All optional features toggle in settings

---

## 23. Verification Plan

### 23.1 Automated Tests

```bash
# Unit tests (business logic)
npm run test

# E2E tests (critical flows)
npm run test:e2e
```

**Critical flows to test:**
- Product CRUD (with and without variants)
- POS: Add to cart → Checkout → Payment → Sale saved → Stock deducted
- Due: Sale with due → Due payment → Balance update
- QR: Generate → Scan → Cart add (all 3 modes)
- Offline: Create sale offline → Come online → Sync
- Return: Sale → Return → Stock restored → Refund processed
- Reports: Data accuracy vs raw database

### 23.2 Manual Verification

| Test | What to Check |
|------|---------------|
| POS flow | Add products, scan QR, checkout, receipt prints correctly |
| Offline | Turn off internet, make a sale, turn on, check sync |
| Receipt print | Thermal printer (58mm, 80mm) + regular printer + PDF |
| QR print | Label sizes correct, scannable, bulk print layout |
| Mobile | All pages responsive, touch targets adequate, bottom nav works |
| Variant products | Add variant product, sell specific variant, stock per variant correct |
| Due system | Multiple dues, partial payments, balance calculation correct |
| Reports | Numbers match actual sales data, date filters work |
| Staff roles | Cashier can't access admin pages, permissions enforced |

### 23.3 Build & Deploy Verification

```bash
# Build check
npm run build

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

---

> [!IMPORTANT]
> **এই plan এ Multi-Store Management UI ও SaaS Features (Subscription, Super Admin, Landing Page) বাদ দেওয়া হয়েছে।** তবে database schema তে `store_id`, `owner_id` সব table এ আছে — ভবিষ্যতে যোগ করতে কোনো database restructure লাগবে না।

> [!TIP]
> **Recommended: Phase 1 + Phase 2 একসাথে build করে প্রথম usable version release করা উচিত।** Phase 1 alone হলে inventory tracking ও sales history দেখা যাবে না যা একটা POS app এ essential।

---

# Addendum: Manual Sync Feature (Cloud <-> Local)

## Goal Description
The app currently uses an offline-first architecture (Dexie), but there is no mechanism to pull existing data from the Cloud (Supabase) to a new device, or to manually trigger a sync if data seems missing. The goal is to implement a Manual Sync button in the Settings page that will push any pending local changes to the cloud and pull all cloud data to the local database.

## User Review Required
> [!IMPORTANT]
> The manual sync will download all products, categories, variants, and settings from the cloud and overwrite the local database copies. Is this behavior acceptable?

## Proposed Changes

### Sync Module
#### [MODIFY] `src/lib/sync.ts`
- Add `pullDataFromCloud(storeId: string)` function to fetch all relevant tables (`products`, `product_variants`, `categories`, `customers`, `store_settings`, `staff`) from Supabase.
- Save fetched data into Dexie using `bulkPut()`.
- Create a `fullSync(storeId: string)` function that first calls `processSyncQueue()` (Push) and then `pullDataFromCloud()` (Pull).

### Settings UI
#### [MODIFY] `src/app/(dashboard)/settings/page.tsx`
- Add a "Cloud Sync (Push & Pull)" button in the `Data Management` tab.
- Show a loading state (e.g., "Syncing...") while the operation is in progress.
- Show an alert/toast upon success or failure.

## Verification Plan
### Manual Verification
- Go to Settings -> Data tab.
- Click "Cloud Sync".
- Verify that data from Supabase (e.g., products added from another device) appears in the local POS/Products list.

---

# Addendum 2: Top Header Enhancements

## Goal Description
Enhance the top bar (`Header.tsx`) to make all placeholder elements functional:
1. **Dynamic Store Name:** Read store name from `business_info` settings instead of hardcoded text.
2. **Global Search:** Provide a live search dropdown that searches products, customers, and invoices.
3. **Low Stock Notifications:** Dynamically count products with stock <= alert threshold, show count badge on bell icon, and open a notification popover listing low stock items on click.
4. **Header Sync Button:** Add a quick-access Cloud Sync button in the header bar.

## User Review Required
> [!IMPORTANT]
> The search bar will show quick search results (Products, Customers, Invoices) directly in a popover dropdown under the header. Clicking an item will navigate to its respective page.

## Proposed Changes

### Top Header Component
#### [MODIFY] `src/components/layout/Header.tsx`
- Convert `Header` to client component (`'use client'`).
- Query `business_info` setting from `localDB.settings` to display actual Store Name.
- Add live query for `products` low stock count (`stock <= low_stock_alert`) for the notification badge and popover list.
- Add state for search query; filter `products`, `customers`, and `sales` from `localDB`. Render search results popover.
- Add state for Notification popover and render low stock item list.
- Add `CloudSync` icon button that calls `fullSync(storeId)` from `src/lib/sync.ts`.

#### [MODIFY] `src/components/layout/layout.module.css`
- Add CSS styles for Search Results Popover (`.searchResultsModal`, `.searchItem`).
- Add CSS styles for Notification Popover (`.notificationPopover`, `.alertRow`).
- Style the header Sync icon button with spin animation during sync.

## Verification Plan
### Automated & Manual Verification
- **Store Name Test:** Change store name in Settings -> Business Info. Verify it immediately updates in the Top Bar.
- **Search Test:** Type product name or invoice number in Header search. Verify matching results pop up and link to pages.
- **Notification Test:** Add/edit a product with low stock. Verify badge count updates on Bell icon and popover lists the item.
- **Header Sync Test:** Click Sync icon in Header. Verify sync runs and alerts completion.

---

# Addendum 3: Final Core Features (Phase 2)

## Goal Description
Implement the four major missing capabilities identified from the analysis report:
1. **PWA & Offline System:** Full Progressive Web App configuration to allow app installation and offline caching.
2. **QR Code System (Label Printing):** A dedicated page to generate and print QR codes/barcodes for selected products.
3. **Sale Returns:** System to process returns, refund amounts, and restock inventory.
4. **Reports Export:** Ability to download CSV/Excel reports from the Reports page.

## User Review Required
> [!IMPORTANT]
> **PWA Setup:** We will use `@ducanh2912/next-pwa` for robust offline service worker caching in Next.js App Router.
> **QR Printing:** QR Code generation will use `qrcode.react` and `react-to-print`. Do you have a specific label size in mind, or should we use standard A4 grid / thermal printer layouts?

## Proposed Changes

### 1. PWA & Offline System
#### [NEW] `public/manifest.json`
- Define app name, icons, theme colors, and standalone display mode.
#### [MODIFY] `next.config.js`
- Wrap Next.js config with `withPWA` from `@ducanh2912/next-pwa` to auto-generate the service worker.
#### [MODIFY] `package.json`
- Install `@ducanh2912/next-pwa` and run npm install.

### 2. QR Code System (Label Printing)
#### [NEW] `src/app/(dashboard)/products/labels/page.tsx`
- UI to search and select products for label generation.
- Input fields to specify how many labels to print per product.
- Use `react-to-print` to send the generated QR code grid to the printer.

### 3. Sale Returns
#### [MODIFY] `src/lib/db/local.ts`
- Add `saleReturns` and `saleReturnItems` tables to the Dexie schema.
#### [NEW] `src/app/(dashboard)/sales/[id]/return/page.tsx`
- A dedicated return processing page for a specific sale.
- UI to input return quantities for each item in the sale.
- Logic to calculate refund, save to `sale_returns`, and adjust `stock` (increment) via `stock_history`.

### 4. Reports Export
#### [MODIFY] `src/app/(dashboard)/reports/page.tsx`
- Add a utility function to convert JSON arrays (sales data, inventory data) to CSV format.
- Add "Export to CSV" buttons on the summary cards or report tables.

## Verification Plan
### Manual Verification
- **PWA:** Open the app in Chrome, check if the "Install App" icon appears in the address bar. Go offline and refresh the page to verify it loads from cache.
- **QR Codes:** Go to `/products/labels`, select a product, generate a QR code, and click Print.
- **Sale Returns:** Open an existing sale, click "Return", select items, confirm return, and verify that product stock increased.
- **Reports Export:** Go to Reports, click "Export CSV", and verify the downloaded file opens correctly in Excel/Sheets.
