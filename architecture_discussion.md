# QRPOS — ৪টি প্রশ্নের বিস্তারিত উত্তর ও Architecture Discussion

---

## 🟢 প্রশ্ন ১: QR Code — Public Scan এ কী দেখাবে? Configurable হবে কি?

### হ্যাঁ, অবশ্যই করা যাবে! তিনটি mode রাখা হবে — Settings থেকে select করবেন।

### QR Scan Mode গুলো:

| Mode | কী হবে | কাদের জন্য |
|------|--------|-----------|
| **🔹 Mode 1: Text Only (No Web)** | QR scan করলে **কোনো webpage খুলবে না**। শুধু plain text দেখাবে — পণ্যের নাম, দাম, SKU কোড। যে phone দিয়ে scan করবে সেই phone এর QR reader app এই text দেখাবে। | যাদের website নেই, simple label চান |
| **🔹 Mode 2: App Public Page** | QR scan করলে **আমাদের system এর একটা public page** খুলবে — পণ্যের নাম, ছবি, দাম, দোকানের নাম দেখাবে (feature_discussion.md তে যেটা describe করা আছে) | যারা app ব্যবহার করছেন কিন্তু আলাদা website নেই |
| **🔹 Mode 3: Custom Website Link** | QR scan করলে **owner এর নিজের website এর page** খুলবে। owner settings এ তার website URL pattern দেবে (যেমন: `https://myshop.com/product/{sku}`) এবং সেই link QR এ encode হবে। | যাদের আলাদা e-commerce website আছে |

### Settings এ কীভাবে configure করবে:

```
Settings → QR Code Configuration
┌─────────────────────────────────────────────┐
│  QR Scan Mode:                               │
│  ○ Text Only (No web link)                   │
│  ○ App Public Page (আমাদের page)             │
│  ○ Custom Website URL                        │
│                                              │
│  [Custom URL Pattern] (Mode 3 হলে দেখাবে)   │
│  https://myshop.com/product/{product_id}     │
│                                              │
│  QR Label Content: (কী কী print হবে)        │
│  ☑ পণ্যের নাম                                │
│  ☑ দাম                                       │
│  ☑ SKU Code                                   │
│  ☐ দোকানের নাম                               │
│  ☐ Category                                  │
└─────────────────────────────────────────────┘
```

### সবচেয়ে গুরুত্বপূর্ণ কথা — POS এ scan করলে সব mode এ একই কাজ করবে!

QR code এর ভিতরে আসলে **সব সময় আমাদের product identifier (SKU/product_id) encode করা থাকবে**। পার্থক্য হলো:

- **POS app দিয়ে scan** → app নিজে product_id পড়ে, database থেকে product খুঁজে, cart এ add করে। **সব mode এই এটা হবে।**
- **বাইরের phone দিয়ে scan** → Mode অনুযায়ী আচরণ বদলাবে:

```
QR Code Content (Mode অনুযায়ী):
──────────────────────────────────────────
Mode 1 (Text):     "Lux Soap 100g | ৳50 | SKU: LUX-100"
Mode 2 (App Page): "https://qrpos.app/p/LUX-100"
Mode 3 (Custom):   "https://myshop.com/product/LUX-100"
──────────────────────────────────────────

POS app scan এর ক্ষেত্রে:
- Mode 1: app text থেকে SKU parse করবে → product detect → cart add ✅
- Mode 2: app URL থেকে product_id parse করবে → product detect → cart add ✅
- Mode 3: app URL থেকে identifier parse করবে → product detect → cart add ✅
```

> [!TIP]
> **কৌশলটা হলো** — QR code এ যা-ই encode করা থাকুক, POS app সব format বুঝবে। app এ একটা smart parser থাকবে যেটা text থেকে হোক বা URL থেকে হোক, product identifier বের করে cart এ add করতে পারবে। তাই Mode 3 তে আপনার website খুলবে বাইরের মানুষদের জন্য, কিন্তু POS app এ scan করলে ঠিকই product detect হবে।

### কীভাবে সম্ভব (Mode 3 — Custom Website + POS detect)?

**উপায়:** QR code এ owner এর website URL encode হবে, কিন্তু URL এর মধ্যে আমাদের product identifier (SKU) embedded থাকবে। POS app scan করার সময় URL parse করে SKU বের করবে, local database এ খুঁজবে, পেলে cart এ add করবে।

```
URL: https://myshop.com/product/LUX-100
                                ↑
                         POS app এটা extract করবে
                         → local DB তে "LUX-100" খুঁজবে
                         → পেলে cart এ add
```

**শর্ত:** Owner কে settings এ URL pattern দিতে হবে, যেখানে `{sku}` বা `{product_id}` placeholder থাকবে। App বুঝবে identifier টা URL এর কোথায় আছে।

---

## 🟢 প্রশ্ন ২: Product Variation (Size: M, L, XL — আলাদা stock)

### হ্যাঁ, এটা করা যাবে এবং **Optional + Toggle-based** হবে!

### ধারণাটা কী?

একটা পণ্যের যদি multiple variation থাকে (size, color, weight ইত্যাদি), তাহলে প্রতিটি variation এর আলাদা stock, আলাদা দাম থাকতে পারে।

**উদাহরণ:**

```
T-Shirt "Polo Classic" (Parent Product)
├── M  → Stock: 10, Price: ৳500
├── L  → Stock: 5,  Price: ৳500
├── XL → Stock: 0,  Price: ৳550 (বড় size, দাম বেশি)
└── XXL → Stock: 3,  Price: ৳600
```

### কীভাবে UI তে কাজ করবে (Optional + Non-Messy):

#### Step 1: Settings এ Feature Toggle

```
Settings → Advanced Features
┌─────────────────────────────────────────────┐
│  ☐ Product Variations (Size/Color/Weight)   │
│    Enable this to track different variants   │
│    of a product with separate stock levels   │
│                                              │
│  ☐ ... (অন্যান্য optional features)         │
└─────────────────────────────────────────────┘
```

- **OFF** থাকলে → Product Add form এ কোনো variation field দেখাবেই না। Normal form, clean, simple।
- **ON** করলে → Product Add form এ একটা "Add Variations" button আসবে।

#### Step 2: Product Add Form (Variation ON থাকলে)

```
Product Add Form:
┌─────────────────────────────────────────────┐
│  পণ্যের নাম: Polo Classic T-Shirt          │
│  ক্যাটেগরি: Clothing                        │
│  ছবি: [Upload]                              │
│                                              │
│  ┌─ Has Variations? ─────────────────────┐  │
│  │  [✓ Enable]                            │  │
│  │                                        │  │
│  │  Variation Type: [Size ▼]              │  │
│  │  (অথবা Custom: Color, Weight, etc.)   │  │
│  │                                        │  │
│  │  Variants:                             │  │
│  │  ┌──────┬───────┬────────┬───────┐    │  │
│  │  │ Name │ Price │ Stock  │ SKU   │    │  │
│  │  ├──────┼───────┼────────┼───────┤    │  │
│  │  │ M    │ ৳500  │ 10     │ auto  │    │  │
│  │  │ L    │ ৳500  │ 5      │ auto  │    │  │
│  │  │ XL   │ ৳550  │ 0      │ auto  │    │  │
│  │  │ XXL  │ ৳600  │ 3      │ auto  │    │  │
│  │  └──────┴───────┴────────┴───────┘    │  │
│  │  [+ Add Variant]                      │  │
│  └────────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

- Variation enable না করলে → উপরের box টাই দেখাবে না। Normal product form।
- Enable করলে → Variant table open হবে, যতগুলো variant চান যোগ করতে পারবেন।

#### Step 3: POS এ বিক্রির সময়

```
POS এ product click করলে:
┌─────────────────────────────────┐
│  Polo Classic T-Shirt           │
│                                 │
│  Select Size:                   │
│  ┌────┐ ┌────┐ ┌────┐ ┌─────┐  │
│  │ M  │ │ L  │ │ XL │ │ XXL │  │
│  │ 10 │ │  5 │ │ ❌ │ │  3  │  │
│  │৳500│ │৳500│ │ 0  │ │৳600 │  │
│  └────┘ └────┘ └────┘ └─────┘  │
│                                 │
│  XL → Out of Stock! (disable)   │
└─────────────────────────────────┘
```

- Variant select করলে → সেই variant cart এ add হবে
- Stock 0 থাকলে disable/grey out দেখাবে
- Cart এ দেখাবে: "Polo T-Shirt (L) × 1 — ৳500"

### Database Design (Variation এর জন্য):

```
products table:
├── id, name, category_id, description, image, has_variants (boolean)
├── purchase_price (variant না থাকলে)
├── selling_price (variant না থাকলে)
├── stock (variant না থাকলে)
└── sku (variant না থাকলে)

product_variants table (যদি has_variants = true):
├── id
├── product_id (FK → products)
├── variant_name ("M", "L", "XL", "Red", "500g")
├── variant_type ("Size", "Color", "Weight")
├── purchase_price
├── selling_price
├── stock
├── sku (unique, auto-generated: "POLO-M", "POLO-L")
└── status (active/inactive)
```

> [!IMPORTANT]
> **মূল কথা:** `has_variants = false` হলে → product নিজের price/stock ব্যবহার করবে (simple product)। `has_variants = true` হলে → product_variants table থেকে price/stock আসবে। এভাবে simple product ও variant product দুটোই একসাথে চলবে, form messy হবে না।

---

## 🟢 প্রশ্ন ৩: Multi-Store — Database কেমন হবে?

### মূল নীতি: প্রতিটি store সম্পূর্ণ **আলাদা island** — কিন্তু একই database এ!

আপনি বলেছেন একদম সঠিক কথা — দুটো store কাউকে ছাড়াই চলতে হবে। তাই database design টা হবে **tenant-isolated (store_id based)**:

### Database Architecture:

```
                    ┌─────────────────────┐
                    │     OWNERS TABLE    │
                    │  (মালিকের তথ্য)      │
                    │  id, name, email,   │
                    │  phone, password    │
                    └──────────┬──────────┘
                               │
                               │ 1 owner → many stores
                               ▼
                    ┌─────────────────────┐
                    │     STORES TABLE    │
                    │  (দোকানের তথ্য)      │
                    │  id, owner_id (FK), │
                    │  store_name,        │
                    │  address, phone     │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
        ┌──────────┐    ┌──────────┐    ┌──────────┐
        │ Store #1 │    │ Store #2 │    │ Store #3 │
        │ products │    │ products │    │ products │
        │ sales    │    │ sales    │    │ sales    │
        │ stock    │    │ stock    │    │ stock    │
        │ customers│    │ customers│    │ customers│
        │ expenses │    │ expenses │    │ expenses │
        │ staff    │    │ staff    │    │ staff    │
        └──────────┘    └──────────┘    └──────────┘
           সব আলাদা!        সব আলাদা!       সব আলাদা!
```

### কীভাবে separate রাখা হবে?

প্রতিটি data table এ **`store_id`** column থাকবে। এটাই separation এর চাবি।

```sql
-- Products table
CREATE TABLE products (
    id          UUID PRIMARY KEY,
    store_id    UUID NOT NULL REFERENCES stores(id),  -- ← এটাই চাবি!
    name        TEXT NOT NULL,
    sku         TEXT,
    category_id UUID,
    purchase_price DECIMAL,
    selling_price  DECIMAL,
    stock       INTEGER,
    ...
);

-- Sales table
CREATE TABLE sales (
    id          UUID PRIMARY KEY,
    store_id    UUID NOT NULL REFERENCES stores(id),  -- ← প্রতিটি table এ
    invoice_no  TEXT,
    customer_id UUID,
    total       DECIMAL,
    ...
);

-- Customers table
CREATE TABLE customers (
    id          UUID PRIMARY KEY,
    store_id    UUID NOT NULL REFERENCES stores(id),  -- ← আলাদা আলাদা
    name        TEXT,
    phone       TEXT,
    ...
);

-- Staff/Users table
CREATE TABLE staff (
    id          UUID PRIMARY KEY,
    store_id    UUID NOT NULL REFERENCES stores(id),
    name        TEXT,
    role        TEXT,  -- 'admin', 'manager', 'cashier'
    ...
);
```

### এর সুবিধা:

| বিষয় | কীভাবে কাজ করবে |
|-------|----------------|
| **Data Isolation** | যেকোনো query তে `WHERE store_id = ?` দিলেই শুধু ঐ store এর data আসবে। Store #1 কখনো Store #2 এর data দেখতে পাবে না। |
| **Store Switch** | Owner login করে একটা store select করবে। App সেই `store_id` মনে রাখবে। সব API call এ সেই `store_id` পাঠাবে। Switch করলে `store_id` বদলে যাবে → সব data বদলে যাবে। |
| **আলাদা Staff** | Store #1 এর cashier Store #2 তে login করতে পারবে না (তার `store_id` আলাদা) |
| **Combined Report** | Owner চাইলে সব store এর combined report দেখতে পারবে → `WHERE store_id IN (owner's stores)` query |
| **Stock Transfer** | এক store থেকে অন্য store তে মাল পাঠালে → `stock_transfers` table এ record, source store থেকে stock কমবে, destination store তে stock বাড়বে |

### Owner এর Login Flow:

```
Owner Login
    ↓
Owner এর stores list দেখাবে
    ↓
┌─────────────────────────────┐
│  আপনার দোকানসমূহ:           │
│                             │
│  🏪 ঢাকা শাখা               │
│  🏪 চট্টগ্রাম শাখা           │
│  🏪 সিলেট শাখা              │
│                             │
│  [+ নতুন দোকান যোগ করুন]    │
└─────────────────────────────┘
    ↓
Store select করলে → ঐ store এর dashboard/POS খুলবে
    ↓
উপরে/sidebar এ store switcher থাকবে → অন্য store তে switch করা যাবে
```

---

## 🟢 প্রশ্ন ৪: SaaS Super Admin — সব কিছু কীভাবে manage হবে?

### পুরো Layer Structure:

এটা ৩ স্তরের (3-layer) hierarchy:

```
┌──────────────────────────────────────────────────────────┐
│  LAYER 3: SUPER ADMIN (আপনি — QRPOS এর মালিক)            │
│  ─────────────────────────────────────────                │
│  • সব store owner দেখতে পারবেন                           │
│  • কে কোন subscription এ আছে                             │
│  • Revenue tracking, billing                             │
│  • Subscription plan manage (create, edit, disable)      │
│  • Global settings, feature flags                        │
│  • Support ticket management                             │
│  • System health monitoring                              │
│                                                          │
│  Super Admin Panel: admin.qrpos.app                      │
├──────────────────────────────────────────────────────────┤
│  LAYER 2: STORE OWNER (আপনার customer — দোকান মালিক)     │
│  ─────────────────────────────────────────                │
│  • নিজের store(গুলো) manage করবে                         │
│  • Products, Sales, Staff, Reports — সব কিছু              │
│  • নতুন store add করতে পারবে (subscription অনুযায়ী)      │
│  • Staff add করতে পারবে                                  │
│                                                          │
│  Owner Dashboard: app.qrpos.app                          │
├──────────────────────────────────────────────────────────┤
│  LAYER 1: STORE STAFF (দোকান কর্মী)                       │
│  ─────────────────────────────────────────                │
│  • শুধু POS, basic operations                             │
│  • Owner যতটুকু permission দেবে ততটুকু access             │
│                                                          │
│  Same app: app.qrpos.app (limited view)                  │
└──────────────────────────────────────────────────────────┘
```

### Database Structure (সব layer একসাথে):

```sql
-- ═══════════════════════════════════════════
-- LAYER 3: Super Admin Level
-- ═══════════════════════════════════════════

-- Subscription Plans (Super Admin create করবে)
CREATE TABLE subscription_plans (
    id              UUID PRIMARY KEY,
    name            TEXT NOT NULL,          -- "Free", "Starter", "Business", "Enterprise"
    monthly_price   DECIMAL NOT NULL,       -- ৳0, ৳499, ৳999, ৳1999
    max_products    INTEGER,                -- 50, 500, -1 (unlimited)
    max_users       INTEGER,                -- 1, 2, 5, -1 (unlimited)
    max_stores      INTEGER,                -- 1, 1, 1, 5
    features        JSONB,                  -- কোন কোন feature enabled
    is_active       BOOLEAN DEFAULT TRUE
);

-- Super Admins (আপনি এবং আপনার team)
CREATE TABLE super_admins (
    id          UUID PRIMARY KEY,
    email       TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,
    name        TEXT,
    role        TEXT DEFAULT 'super_admin'  -- 'super_admin', 'support'
);

-- ═══════════════════════════════════════════
-- LAYER 2: Store Owner Level
-- ═══════════════════════════════════════════

-- Owners (দোকান মালিক — আপনার customers)
CREATE TABLE owners (
    id                  UUID PRIMARY KEY,
    email               TEXT UNIQUE NOT NULL,
    phone               TEXT UNIQUE NOT NULL,
    password            TEXT NOT NULL,
    name                TEXT NOT NULL,
    subscription_id     UUID REFERENCES subscription_plans(id),
    subscription_status TEXT DEFAULT 'active',   -- 'active', 'expired', 'cancelled'
    subscription_start  TIMESTAMP,
    subscription_end    TIMESTAMP,
    created_at          TIMESTAMP DEFAULT NOW()
);

-- Stores (প্রতিটি দোকান)
CREATE TABLE stores (
    id          UUID PRIMARY KEY,
    owner_id    UUID NOT NULL REFERENCES owners(id),
    name        TEXT NOT NULL,
    address     TEXT,
    phone       TEXT,
    logo        TEXT,
    settings    JSONB,                -- store-specific settings
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- LAYER 1: Store Staff Level
-- ═══════════════════════════════════════════

-- Staff (প্রতিটি store এর কর্মী)
CREATE TABLE staff (
    id          UUID PRIMARY KEY,
    store_id    UUID NOT NULL REFERENCES stores(id),
    name        TEXT NOT NULL,
    phone       TEXT,
    email       TEXT,
    password    TEXT NOT NULL,
    role        TEXT NOT NULL,      -- 'admin', 'manager', 'cashier'
    permissions JSONB,              -- custom permissions
    is_active   BOOLEAN DEFAULT TRUE
);

-- ═══════════════════════════════════════════
-- Store-Level Data (সব store_id দিয়ে separated)
-- ═══════════════════════════════════════════

-- products, categories, customers, sales, 
-- purchases, expenses, stock_adjustments
-- → সব table এ store_id column আছে
```

### পুরো Flow কীভাবে কাজ করবে:

```
1️⃣ আপনি (Super Admin) → Subscription Plan তৈরি করলেন:
   - Free: ৳0, 50 products, 1 user, 1 store
   - Business: ৳999, unlimited products, 5 users, 1 store
   - Enterprise: ৳1999, unlimited, 10 users, 5 stores

2️⃣ করিম (Store Owner) → Sign Up করলো:
   - Free plan দিয়ে শুরু করলো
   - System auto 1টি store তৈরি করে দিলো ("করিমের দোকান")
   - করিম products add করলো, বিক্রি শুরু করলো

3️⃣ করিম → Business plan এ upgrade করলো:
   - এখন 5 জন staff add করতে পারবে
   - Unlimited products
   - Advanced reports unlock হলো

4️⃣ করিম → Enterprise plan এ upgrade করলো:
   - এখন আরো stores add করতে পারবে
   - "চট্টগ্রাম শাখা" add করলো → নতুন store_id তৈরি হলো
   - এই store এর products, stock, customers সব আলাদা
   - করিম দুই store switch করে manage করতে পারবে

5️⃣ আপনি (Super Admin) → admin panel থেকে দেখছেন:
   - করিম: Enterprise plan, 2 stores, 8 staff, ৳1999/month ✅
   - রহিম: Free plan, 1 store, 1 user, ৳0/month
   - কালাম: Business plan, expired ❌ → payment reminder পাঠানো দরকার
```

### Super Admin Panel এ কী দেখা যাবে:

```
Super Admin Dashboard (admin.qrpos.app)
┌───────────────────────────────────────────────┐
│  📊 Overview                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ Total    │ │ Active   │ │ Monthly  │      │
│  │ Owners   │ │ Subs     │ │ Revenue  │      │
│  │ 156      │ │ 89       │ │ ৳78,500  │      │
│  └──────────┘ └──────────┘ └──────────┘      │
│                                               │
│  📋 Store Owners:                              │
│  ┌────────────────────────────────────────┐   │
│  │ Name    │ Plan       │ Stores │ Status │   │
│  ├─────────┼────────────┼────────┼────────┤   │
│  │ করিম    │ Enterprise │ 2      │ ✅     │   │
│  │ রহিম    │ Free       │ 1      │ ✅     │   │
│  │ কালাম   │ Business   │ 1      │ ❌     │   │
│  └────────────────────────────────────────┘   │
│                                               │
│  ⚙️ Manage Plans  |  📧 Send Notifications    │
│  📈 Revenue Chart |  🎫 Support Tickets       │
└───────────────────────────────────────────────┘
```

### Subscription-based Feature Gating (কোন plan এ কী পাবে):

```javascript
// subscription_plans.features (JSONB) উদাহরণ:
{
  "Free": {
    "max_products": 50,
    "max_users": 1,
    "max_stores": 1,
    "features": {
      "basic_pos": true,
      "qr_scan": true,
      "qr_print": false,        // ❌ Free তে নেই
      "advanced_reports": false, // ❌
      "multi_store": false,     // ❌
      "product_variants": false, // ❌
      "cloud_sync": false,      // ❌
      "export_csv": false       // ❌
    }
  },
  "Enterprise": {
    "max_products": -1,  // unlimited
    "max_users": -1,     // unlimited
    "max_stores": 5,
    "features": {
      "basic_pos": true,
      "qr_scan": true,
      "qr_print": true,         // ✅
      "advanced_reports": true,  // ✅
      "multi_store": true,       // ✅
      "product_variants": true,  // ✅
      "cloud_sync": true,        // ✅
      "export_csv": true         // ✅
    }
  }
}
```

> [!IMPORTANT]
> **সবচেয়ে গুরুত্বপূর্ণ বিষয়:** এই পুরো layer system **শুরু থেকেই database design এ থাকতে হবে**, নাহলে পরে refactor করা nightmare হবে। তবে **UI/Frontend** ধাপে ধাপে বানালে হবে:
> - **Phase 1:** Single owner, single store, no subscription check → শুধু store_id column রাখা হবে database এ কিন্তু UI তে store switch অপশন থাকবে না
> - **Phase 2:** Multi-store UI, owner dashboard
> - **Phase 3:** Super admin panel, subscription management, billing

---

## 📐 সংক্ষেপে Architecture:

```
                SUPER ADMIN (আপনি)
                    │
            ┌───────┴───────┐
            ▼               ▼
        OWNER A          OWNER B        ← subscription_plans দ্বারা নিয়ন্ত্রিত
        │                │
    ┌───┴───┐        ┌───┘
    ▼       ▼        ▼
  Store 1  Store 2  Store 3             ← প্রতিটি store সম্পূর্ণ আলাদা
  │         │        │
  ├─ Products  ├─ Products  ├─ Products  ← store_id দিয়ে separated
  ├─ Sales     ├─ Sales     ├─ Sales
  ├─ Staff     ├─ Staff     ├─ Staff
  ├─ Customers ├─ Customers ├─ Customers
  └─ Settings  └─ Settings  └─ Settings
```

> [!CAUTION]
> **এখন যেটা করতে হবে:** Implementation plan বানানোর সময় database schema তে `store_id`, `owner_id` এই column গুলো **সব table এই রাখতে হবে** — এমনকি Phase 1 এ যখন শুধু single store করবো তখনও। এতে পরে multi-store বা SaaS add করতে database restructure করতে হবে না।

---

## ❓ আপনার কাছ থেকে দরকার:

1. উপরের ৪টি উত্তর কি ঠিক আছে? কিছু বদলাতে চান?
2. QR Mode 3 (Custom Website) — এটা কি সত্যিই দরকার নাকি Mode 1 আর Mode 2 যথেষ্ট?
3. Product Variation এ Size ছাড়া আর কোন variation type দরকার? (Color, Weight, ইত্যাদি)
4. Subscription Plan গুলোর pricing ও feature limit ঠিক আছে নাকি বদলাতে চান?

এগুলো confirm হলে আমি final implementation plan বানাতে শুরু করবো! 🚀
