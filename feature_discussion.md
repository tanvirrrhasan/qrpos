# QRPOS — সম্পূর্ণ Feature আলোচনা

এই document এ QRPOS app এর প্রতিটি feature বিস্তারিত আলোচনা করা হয়েছে।
প্রতিটি feature এর জন্য বলা হয়েছে: **কী**, **কেন দরকার**, এবং **কীভাবে কাজ করবে**।

---

## 📑 Feature Module সমূহ

| # | Module | সংক্ষেপে |
|---|--------|----------|
| 1 | [Dashboard](#1--dashboard-ড্যাশবোর্ড) | ব্যবসার সামগ্রিক চিত্র এক নজরে |
| 2 | [Product Management](#2--product-management-পণ্য-ব্যবস্থাপনা) | পণ্য যোগ, সম্পাদনা, মুছে ফেলা |
| 3 | [Category Management](#3--category-management-ক্যাটেগরি-ব্যবস্থাপনা) | পণ্যের শ্রেণীবিভাগ |
| 4 | [Inventory / Stock Management](#4--inventory--stock-management-স্টক-ব্যবস্থাপনা) | মজুদ ট্র্যাকিং |
| 5 | [POS / Billing System](#5--pos--billing-system-বিলিং) | বিক্রি ও বিল তৈরি |
| 6 | [QR Code System](#6--qr-code-system) | QR generate, print, scan |
| 7 | [Customer Management ও বাকির হিসাব](#7--customer-management-ও-বাকির-হিসাব) | কাস্টমার ও বাকি ব্যবস্থাপনা |
| 8 | [Supplier Management](#8--supplier-management-সরবরাহকারী) | সরবরাহকারী ব্যবস্থাপনা |
| 9 | [Sales History](#9--sales-history-বিক্রির-ইতিহাস) | বিক্রির ইতিহাস ও বিবরণ |
| 10 | [Purchase / Stock-In Management](#10--purchase--stock-in-management-ক্রয়) | পণ্য কেনা / স্টক ঢোকানো |
| 11 | [Expense Management](#11--expense-management-খরচ-ব্যবস্থাপনা) | দোকানের খরচ ট্র্যাকিং |
| 12 | [Reports & Analytics](#12--reports--analytics-রিপোর্ট) | বিস্তারিত রিপোর্ট ও বিশ্লেষণ |
| 13 | [User / Staff Management](#13--user--staff-management-কর্মী) | কর্মী ব্যবস্থাপনা ও role |
| 14 | [Settings & Configuration](#14--settings--configuration-সেটিংস) | অ্যাপের সকল সেটিংস |
| 15 | [Multi-Store Support](#15--multi-store-support-মাল্টি-স্টোর) | একাধিক দোকান ব্যবস্থাপনা |
| 16 | [SaaS Features](#16--saas-features) | SaaS হিসেবে বিক্রির জন্য বিশেষ feature |

---

## 1. 📊 Dashboard (ড্যাশবোর্ড)

### কী?
App খুললে প্রথম যে page দেখা যাবে। এটা আপনার পুরো ব্যবসার একটা snapshot — এক নজরে সব গুরুত্বপূর্ণ তথ্য দেখতে পাবেন।

### কেন দরকার?
ব্যবসায়ী হিসেবে আপনি জানতে চান — আজ কত বিক্রি হলো, কত লাভ, কোন পণ্য শেষ হয়ে যাচ্ছে, কার কত বাকি আছে। Dashboard না থাকলে এগুলো জানতে আলাদা আলাদা page এ যেতে হতো।

### কীভাবে কাজ করবে?

Dashboard এ নিচের তথ্যগুলো থাকবে:

**উপরের দিকে Summary Cards:**
| Card | দেখাবে |
|------|--------|
| আজকের বিক্রি | আজ মোট কত টাকার বিক্রি হয়েছে (৳) |
| আজকের লাভ | আজ মোট লাভ কত (selling price - purchase price) |
| মোট বাকি | সব কাস্টমারের মোট বাকি কত টাকা |
| মোট পণ্য | মোট কতটি পণ্য আছে |
| Low Stock Alert | কতটি পণ্যের স্টক কম |

**মাঝে Charts/Graphs:**
- **বিক্রির গ্রাফ**: গত ৭ দিন / ৩০ দিন / ১২ মাসের বিক্রির trend line chart
- **Top Selling Products**: সবচেয়ে বেশি বিক্রি হওয়া ৫-১০টি পণ্য (bar chart)
- **Category-wise Sale**: কোন ক্যাটেগরিতে কত বিক্রি (pie/donut chart)

**নিচের দিকে তালিকা:**
- সাম্প্রতিক ৫-১০টি বিক্রি (sale list)
- Low stock পণ্যের তালিকা (যেগুলো শেষ হয়ে যাচ্ছে)
- আজকের বাকি দেওয়া কাস্টমারদের তালিকা

**Date Filter:**
- আজ / গতকাল / এই সপ্তাহ / এই মাস / custom date range select করে সব data ফিল্টার করা যাবে

---

## 2. 📦 Product Management (পণ্য ব্যবস্থাপনা)

### কী?
দোকানের সব পণ্য যোগ করা, সম্পাদনা করা, এবং মুছে ফেলার ব্যবস্থা।

### কেন দরকার?
POS এর মূল ভিত্তি হলো পণ্য। পণ্য ছাড়া বিক্রি নেই। প্রতিটি পণ্যের নাম, দাম, স্টক, ক্যাটেগরি, ছবি — সব তথ্য সুন্দরভাবে সংরক্ষণ করা দরকার।

### কীভাবে কাজ করবে?

#### ক. পণ্য যোগ করা (Add Product)
একটি form থাকবে যেখানে এই তথ্যগুলো দিতে হবে:

| Field | বিবরণ | বাধ্যতামূলক? |
|-------|--------|-------------|
| পণ্যের নাম | যেমন: "Lux Soap 100g" | ✅ হ্যাঁ |
| SKU / কোড | পণ্যের unique কোড (auto-generate বা manual) | ঐচ্ছিক |
| ক্যাটেগরি | কোন শ্রেণীতে পড়ে (যেমন: সাবান, তেল) | ✅ হ্যাঁ |
| ক্রয়মূল্য | কত টাকায় কিনেছেন (cost price) | ✅ হ্যাঁ |
| বিক্রয়মূল্য | কত টাকায় বিক্রি করবেন (selling price) | ✅ হ্যাঁ |
| বর্তমান স্টক | কতগুলো আছে | ✅ হ্যাঁ |
| ইউনিট | পিস / কেজি / লিটার / প্যাকেট / ডজন | ✅ হ্যাঁ |
| Low Stock Alert | কতে নামলে warning দেবে (যেমন: 5 এ নামলে alert) | ঐচ্ছিক |
| ছবি | পণ্যের ছবি (camera দিয়ে তুলতে বা upload করতে পারবে) | ঐচ্ছিক |
| বিবরণ | পণ্যের অতিরিক্ত তথ্য | ঐচ্ছিক |
| ব্র্যান্ড | পণ্যের brand name | ঐচ্ছিক |
| Status | Active / Inactive (inactive করলে POS এ দেখাবে না) | Auto |

> [!NOTE]
> **SKU (Stock Keeping Unit)** — এটা প্রতিটি পণ্যের একটা unique code, যেমন: `LUX-SOAP-100G`। এটা না দিলে system নিজে generate করবে। QR code এই SKU দিয়ে তৈরি হবে।

#### খ. পণ্য তালিকা (Product List)
- সব পণ্য একটা table/grid view তে দেখা যাবে
- **Search**: নাম, SKU, বা ক্যাটেগরি দিয়ে search করা যাবে
- **Filter**: ক্যাটেগরি, স্টক status (in stock / low / out of stock), active/inactive দিয়ে filter
- **Sort**: নাম, দাম, স্টক, বিক্রির পরিমাণ অনুযায়ী sort
- **Bulk Actions**: একসাথে অনেক পণ্য select করে delete, category change, price update করা যাবে

#### গ. পণ্য সম্পাদনা (Edit Product)
- যেকোনো পণ্যে click করলে edit form আসবে
- সব তথ্য পরিবর্তন করা যাবে
- পরিবর্তনের history রাখা হবে (কে, কখন, কী বদলেছে)

#### ঘ. পণ্য মুছে ফেলা (Delete Product)
- পণ্য delete করলে সেটা soft delete হবে (মানে database থেকে পুরোপুরি মুছবে না, শুধু inactive হবে)
- কারণ: পুরানো sales record এ ওই পণ্যের reference আছে, delete করলে সেগুলো ভেঙে যাবে

---

## 3. 🏷️ Category Management (ক্যাটেগরি ব্যবস্থাপনা)

### কী?
পণ্যগুলোকে শ্রেণীবদ্ধ করার ব্যবস্থা। যেমন: "খাবার", "প্রসাধনী", "ইলেকট্রনিক্স" ইত্যাদি।

### কেন দরকার?
- ক্যাটেগরি ছাড়া ১০০০+ পণ্য manage করা কঠিন
- POS এ দ্রুত পণ্য খুঁজে পেতে ক্যাটেগরি সাহায্য করে
- Report এ ক্যাটেগরি-wise বিক্রি/লাভ দেখা যায়

### কীভাবে কাজ করবে?

| Feature | বিবরণ |
|---------|--------|
| Add Category | নতুন ক্যাটেগরি যোগ (নাম, icon/রঙ, বিবরণ) |
| Sub-Category | Parent → Child ক্যাটেগরি (যেমন: খাবার → বিস্কুট, চিপস) |
| Edit / Delete | ক্যাটেগরি edit বা delete করা যাবে |
| Product Count | প্রতি ক্যাটেগরিতে কতটি পণ্য আছে দেখাবে |
| Color/Icon | প্রতিটি ক্যাটেগরির আলাদা রঙ বা icon (POS এ দ্রুত চিনতে সাহায্য করে) |

> [!TIP]
> Sub-category feature টা SaaS হিসেবে বিক্রির সময় গুরুত্বপূর্ণ — বড় দোকানে main category + sub-category দুটোই লাগে। যেমন: Electronics → Mobile, Charger, Earphone ইত্যাদি।

---

## 4. 📊 Inventory / Stock Management (স্টক ব্যবস্থাপনা)

### কী?
দোকানের সব পণ্যের মজুদ (stock) ট্র্যাক করা — কতটা আছে, কতটা বিক্রি হয়েছে, কতটা আসবে, কতটা নষ্ট হয়েছে।

### কেন দরকার?
- পণ্য শেষ হয়ে গেলে কাস্টমার হারাবেন — তাই আগে থেকে জানা দরকার কোনটা শেষ হচ্ছে
- অতিরিক্ত স্টক রাখলে টাকা আটকে থাকে — তাই কতটা কিনতে হবে সেটা জানা দরকার
- চুরি/নষ্ট হলে ধরা পড়বে

### কীভাবে কাজ করবে?

#### ক. Stock Overview
- সব পণ্যের বর্তমান stock একটা তালিকায় দেখা যাবে
- **Color coding**: 
  - 🟢 সবুজ = পর্যাপ্ত stock
  - 🟡 হলুদ = কম stock (low stock alert level এ)
  - 🔴 লাল = stock শেষ (0)

#### খ. Stock Adjustment (ম্যানুয়াল সমন্বয়)
কখনো কখনো stock ম্যানুয়ালি adjust করতে হয়:

| কারণ | উদাহরণ |
|------|--------|
| পণ্য নষ্ট | মেয়াদ শেষ, ভেঙে গেছে |
| পণ্য হারিয়ে গেছে | চুরি বা হিসাবে গড়মিল |
| ফেরত এসেছে | কাস্টমার পণ্য ফেরত দিয়েছে |
| Physical Count | আসল গোনায় database এর সাথে মিলছে না |

- প্রতিটি adjustment এ **কারণ** লিখতে হবে এবং তারিখ+সময়+কে করেছে record থাকবে

#### গ. Stock History
- প্রতিটি পণ্যের stock কীভাবে change হয়েছে তার সম্পূর্ণ ইতিহাস:
  - Stock In (কেনা): +50
  - Sold (বিক্রি): -3
  - Adjusted (নষ্ট): -2
  - Return (ফেরত): +1

#### ঘ. Low Stock Alerts
- যেসব পণ্যের stock alert level এ বা তার নিচে নেমেছে → তালিকায় দেখাবে
- Dashboard এ warning দেখাবে
- (ভবিষ্যতে) SMS/notification পাঠানো যেতে পারে

#### ঙ. Stock Value
- সব পণ্যের বর্তমান stock × ক্রয়মূল্য = আপনার দোকানে কত টাকার মাল আছে
- এটা আপনার ব্যবসার asset বোঝাতে সাহায্য করে

---

## 5. 🛒 POS / Billing System (বিলিং)

### কী?
এটাই মূল বিক্রির screen। এখান থেকে পণ্য select করে, বিল তৈরি করে, payment নিয়ে, receipt print করবেন।

### কেন দরকার?
এটা ছাড়া POS app এর কোনো মানে নেই! এটাই সবচেয়ে বেশি ব্যবহৃত feature।

### কীভাবে কাজ করবে?

#### ক. POS Screen Layout
Screen টি দুই ভাগে বিভক্ত থাকবে:

```
┌──────────────────────────┬─────────────────────┐
│                          │                     │
│    পণ্য তালিকা /          │    Cart / বিল       │
│    QR Scanner /           │                     │
│    Search                │    Item 1    ৳100   │
│                          │    Item 2    ৳200   │
│  ┌─────┐ ┌─────┐ ┌─────┐│    Item 3    ৳150   │
│  │ সাবান │ │ তেল  │ │ চাল ││                     │
│  │ ৳50  │ │ ৳120│ │ ৳80 ││   Subtotal  ৳450   │
│  └─────┘ └─────┘ └─────┘│   Discount  ৳50    │
│                          │   ─────────────     │
│  ┌─────┐ ┌─────┐ ┌─────┐│   Total     ৳400   │
│  │ ডাল  │ │ চিনি │ │ লবণ ││                     │
│  │ ৳90  │ │ ৳100│ │ ৳30 ││ [💵 Pay & Print]   │
│  └─────┘ └─────┘ └─────┘│                     │
│                          │                     │
│  [🔍 Search] [📷 Scan]   │                     │
└──────────────────────────┴─────────────────────┘
```

- **বাম দিকে**: পণ্য browse/search/scan করার জায়গা
- **ডান দিকে**: Cart — কী কী কিনছে, দাম, মোট বিল

#### খ. পণ্য Cart এ যোগ করার উপায়গুলো

| উপায় | বিবরণ |
|-------|--------|
| **QR Scan** | 📷 ক্যামেরা দিয়ে পণ্যের QR code scan → auto add to cart |
| **Search** | 🔍 নাম বা SKU লিখে search → click করলে add |
| **Category Browse** | ক্যাটেগরি select → পণ্য দেখা → click করলে add |
| **Grid Click** | পণ্যের ছবি/card এ click করলে add |

#### গ. Cart Features

| Feature | বিবরণ |
|---------|--------|
| পরিমাণ বাড়ানো/কমানো | +/- button দিয়ে quantity change |
| পণ্য বাদ দেওয়া | ❌ click করে cart থেকে remove |
| Individual Discount | প্রতিটি item এ আলাদা discount দেওয়া যাবে |
| Overall Discount | পুরো bill এ একসাথে discount (টাকায় বা % এ) |
| Cart Clear | পুরো cart খালি করা |
| Hold Cart | বিক্রি মাঝপথে রেখে অন্য কাস্টমারের বিল করা, পরে আবার ফিরে আসা |

> [!TIP]
> **Hold Cart** feature টা অনেক গুরুত্বপূর্ণ — ধরুন এক কাস্টমারের বিল করছেন, মাঝে আরেকজন এসে বলল "ভাই শুধু একটা সাবান দেন", তখন প্রথমজনের cart hold করে দ্বিতীয়জনের বিল করে আবার ফেরত আসা যাবে।

#### ঘ. Checkout / Payment

Checkout এ এই option গুলো থাকবে:

| Payment Method | বিবরণ |
|----------------|--------|
| **Full Cash (নগদ)** | পুরো টাকা নগদে পেয়েছেন |
| **Full বাকি (Due)** | পুরো টাকা বাকি রাখছেন → কাস্টমার select করতে হবে |
| **আংশিক বাকি (Partial)** | কিছু দিচ্ছে, বাকিটা বাকি → কত দিচ্ছে input, বাকি auto calculate |
| **bKash / Nagad / Rocket** | মোবাইল banking এ পেমেন্ট (reference no. রাখা যাবে) |
| **Mixed Payment** | কিছু নগদ + কিছু bKash + বাকি → সব combine করে |

**Checkout Flow:**
```
Cart Ready → Discount (যদি থাকে) → Customer Select (বাকি হলে বাধ্যতামূলক)
→ Payment Method Select → Payment Amount Input → Confirm → Sale Saved
→ Receipt Generate → Print (ঐচ্ছিক)
```

#### ঙ. Discount System বিস্তারিত

| Discount Type | বিবরণ | উদাহরণ |
|---------------|--------|--------|
| **Item-level % Discount** | নির্দিষ্ট পণ্যে শতাংশ ছাড় | Lux Soap এ 10% off |
| **Item-level ৳ Discount** | নির্দিষ্ট পণ্যে টাকা ছাড় | Lux Soap এ ৳5 off |
| **Overall % Discount** | পুরো বিলে শতাংশ ছাড় | মোট বিলে 5% off |
| **Overall ৳ Discount** | পুরো বিলে টাকা ছাড় | মোট বিল থেকে ৳50 off |

- Discount কে দিয়েছে (staff), কেন দিয়েছে — এটাও record থাকবে (SaaS এ owner দেখতে পারবে)

#### চ. Receipt (রসিদ)

Receipt এ যা যা থাকবে:

```
╔══════════════════════════════════╗
║       [দোকানের নাম]              ║
║       [ঠিকানা]                   ║
║       [ফোন নম্বর]                ║
╠══════════════════════════════════╣
║  Receipt #: INV-2026-00142      ║
║  Date: 15/08/2026  10:30 PM     ║
║  Cashier: রহিম                   ║
║  Customer: করিম (যদি থাকে)       ║
╠══════════════════════════════════╣
║  Item         Qty  Price  Total ║
║  ─────────────────────────────  ║
║  Lux Soap      2   ৳50   ৳100  ║
║  Radhuni Oil   1   ৳120  ৳120  ║
║  Miniket Rice  1   ৳80   ৳80   ║
╠══════════════════════════════════╣
║  Subtotal:            ৳300      ║
║  Discount:            ৳20       ║
║  ═══════════════════════════     ║
║  TOTAL:               ৳280      ║
║  Paid:                ৳200      ║
║  Due:                 ৳80       ║
╠══════════════════════════════════╣
║  Payment: Cash + Due            ║
║                                 ║
║     ধন্যবাদ! আবার আসবেন।        ║
║       [QR Code of Receipt]      ║
╚══════════════════════════════════╝
```

- Receipt auto-generate হবে
- Print করা যাবে (thermal printer বা normal printer)
- PDF হিসেবে download ও করা যাবে

---

## 6. 📱 QR Code System

### কী?
প্রতিটি পণ্যের জন্য unique QR code তৈরি, print, এবং scan করার ব্যবস্থা। এটা আপনার app এর **বিশেষ feature**।

### কেন দরকার?
- পণ্যের গায়ে QR code লাগিয়ে দিলে scan করেই বিক্রি করা যায় — দ্রুত ও ভুলমুক্ত
- কাস্টমার নিজে scan করে পণ্যের তথ্য দেখতে পারে — trust বাড়ে
- বড় দোকানে ১০০০+ পণ্য থাকলে search এর চেয়ে scan অনেক দ্রুত

### কীভাবে কাজ করবে?

#### ক. QR Code Generate
- প্রতিটি পণ্য যোগ করলে automatically একটি unique QR code তৈরি হবে
- QR code এর ভেতরে encoded থাকবে: `https://yourapp.com/p/{product_id}`
- আলাদা QR Generator page ও থাকবে যেখান থেকে যেকোনো পণ্যের QR বানানো যাবে

#### খ. QR Code Print

| Print Option | বিবরণ |
|-------------|--------|
| **Single Print** | একটি পণ্যের QR code print |
| **Bulk Print** | একসাথে অনেক পণ্যের QR code print (select করে) |
| **Label Size** | ছোট (sticker), মাঝারি, বড় — size select করা যাবে |
| **Label Content** | QR code + পণ্যের নাম + দাম (কী কী থাকবে customize করা যাবে) |

QR Label দেখতে এমন হবে:

```
┌─────────────────┐
│  ┌───────────┐  │
│  │  QR CODE  │  │
│  │  ▓▓▓▓▓▓▓  │  │
│  │  ▓▓▓▓▓▓▓  │  │
│  │  ▓▓▓▓▓▓▓  │  │
│  └───────────┘  │
│  Lux Soap 100g  │
│     ৳ 50        │
│  SKU: LUX-100   │
└─────────────────┘
```

#### গ. Public QR Scan (সাধারণ মানুষ scan করলে)
- যেকেউ তাদের phone এর camera দিয়ে QR scan করলে একটা **public page** এ যাবে
- সেখানে দেখতে পাবে:
  - পণ্যের নাম
  - পণ্যের ছবি
  - বিক্রয়মূল্য
  - সংক্ষিপ্ত বিবরণ
  - দোকানের নাম ও যোগাযোগ
- ❌ ক্রয়মূল্য, স্টক, লাভ — এসব **দেখাবে না**

#### ঘ. Internal QR Scan (App দিয়ে scan করলে)
- আপনার POS app এর POS page এ একটি **Scan button** থাকবে
- সেটায় click করলে camera খুলবে → পণ্যের QR scan → **সাথে সাথে cart এ add হবে**
- একটার পর একটা scan করতে থাকলে সব cart এ জমা হতে থাকবে
- পুরো বিল তৈরি হয়ে যাবে

**Internal scan এ অতিরিক্ত যা দেখা যাবে:**
- ক্রয়মূল্য
- বর্তমান স্টক
- লাভের পরিমাণ
- বিক্রির ইতিহাস
- সব বিস্তারিত তথ্য

> [!NOTE]
> **Public vs Internal এর পার্থক্য কীভাবে বোঝা যাবে?**
> - Public scan → browser এ URL open হয় → public page দেখায়
> - Internal scan → App এর মধ্যে scanner → app logged in থাকলে full access + cart add

---

## 7. 👥 Customer Management ও বাকির হিসাব

### কী?
কাস্টমারদের তথ্য সংরক্ষণ এবং তাদের বাকির (due/credit) হিসাব রাখার ব্যবস্থা।

### কেন দরকার?
বাংলাদেশে বাকিতে কেনাবেচা অত্যন্ত সাধারণ। এই feature ছাড়া POS অসম্পূর্ণ। বাকির হিসাব খাতায় রাখলে হারিয়ে যায়, ভুল হয়, ঝগড়া হয়। App এ রাখলে নির্ভুল এবং proof হিসেবে কাজ করে।

### কীভাবে কাজ করবে?

#### ক. কাস্টমার যোগ করা (Add Customer)

| Field | বিবরণ | বাধ্যতামূলক? |
|-------|--------|-------------|
| নাম | কাস্টমারের নাম | ✅ হ্যাঁ |
| ফোন নম্বর | মোবাইল নম্বর (unique) | ✅ হ্যাঁ |
| ঠিকানা | ঠিকানা | ঐচ্ছিক |
| ইমেইল | ইমেইল | ঐচ্ছিক |
| নোট | অতিরিক্ত তথ্য ("বৃহস্পতিবার আসে", "ভালো কাস্টমার") | ঐচ্ছিক |

#### খ. কাস্টমার তালিকা
- সব কাস্টমারের তালিকা (নাম, ফোন, মোট বাকি)
- Search (নাম/ফোন দিয়ে)
- Filter: বাকি আছে / বাকি নেই
- Sort: নাম, বাকির পরিমাণ, সর্বশেষ কেনাকাটা

#### গ. কাস্টমার Profile Page
একটি কাস্টমারে click করলে তার পুরো profile দেখা যাবে:

| তথ্য | বিবরণ |
|------|--------|
| মোট বাকি | এই কাস্টমারের বর্তমান মোট বাকি কত |
| মোট কেনাকাটা | এ পর্যন্ত কত টাকার কেনাকাটা করেছে |
| সর্বশেষ কেনাকাটা | শেষ কবে কিনতে এসেছিলো |
| Transaction History | প্রতিটি কেনাকাটা ও বাকি পরিশোধের ইতিহাস |
| বাকি পরিশোধের ইতিহাস | কবে কত টাকা বাকি শোধ করেছে |

#### ঘ. 💰 বাকির হিসাব (Due/Credit System) — বিস্তারিত

এটা সবচেয়ে গুরুত্বপূর্ণ feature গুলোর একটি:

**বাকি দেওয়ার ৩টি পরিস্থিতি:**

| পরিস্থিতি | উদাহরণ | কীভাবে কাজ করবে |
|-----------|--------|-----------------|
| **পুরো বাকি** | ৳500 এর কেনাকাটা, কিছুই দিলো না | Bill ৳500, Paid ৳0, Due ৳500 |
| **আংশিক বাকি** | ৳500 এর কেনাকাটা, ৳300 দিলো | Bill ৳500, Paid ৳300, Due ৳200 |
| **পূর্ণ পরিশোধ** | ৳500 এর কেনাকাটা, পুরোটা দিলো | Bill ৳500, Paid ৳500, Due ৳0 |

**বাকি পরিশোধ (Due Payment):**
- কাস্টমার পরে এসে বাকি শোধ করতে পারবে
- আংশিক বা পুরো বাকি শোধ করা যাবে
- প্রতিটি পরিশোধ record হবে (তারিখ, পরিমাণ, payment method)

**উদাহরণ:**
```
করিম সাহেবের হিসাব:
──────────────────────────────────────────────
15/08/2026  কেনাকাটা ৳500    Paid: ৳300    Due: +৳200
17/08/2026  বাকি শোধ                       Due: -৳100
18/08/2026  কেনাকাটা ৳300    Paid: ৳0      Due: +৳300
──────────────────────────────────────────────
                              বর্তমান বাকি: ৳400
```

**বাকি সম্পর্কিত Reports:**
- মোট বাকি কত (সব কাস্টমারের)
- কার কত বাকি (তালিকা)
- কবে থেকে বাকি (পুরানো বাকি highlight)
- বাকি পরিশোধের ইতিহাস

> [!IMPORTANT]
> বাকিতে বিক্রি করতে হলে **অবশ্যই কাস্টমার select করতে হবে**। কাস্টমার ছাড়া বাকি দেওয়া যাবে না — এটা system enforce করবে। নতুন কাস্টমার হলে checkout screen থেকেই quick add করা যাবে।

---

## 8. 🏭 Supplier Management (সরবরাহকারী)

### কী?
যাদের কাছ থেকে আপনি পণ্য কিনেন (পাইকারি/হোলসেলার) তাদের তথ্য রাখা।

### কেন দরকার?
- কোন পণ্য কোন supplier থেকে কিনেছেন সেটা ট্র্যাক করা
- Supplier এর সাথে হিসাব রাখা (তাদের কাছেও বাকি থাকতে পারে)
- পণ্য reorder করার সময় সহজে supplier এর যোগাযোগ পাওয়া

### কীভাবে কাজ করবে?

| Feature | বিবরণ |
|---------|--------|
| Supplier Add | নাম, ফোন, ঠিকানা, ইমেইল, company name |
| Supplier List | সব supplier এর তালিকা, search, filter |
| Supplier Profile | তার কাছ থেকে কত কিনেছেন, কত দিয়েছেন, কত বাকি |
| Purchase Link | কোন purchase কোন supplier থেকে সেটা link থাকবে |
| Supplier Due | Supplier কে কত টাকা দিতে বাকি আছে |

---

## 9. 📋 Sales History (বিক্রির ইতিহাস)

### কী?
সব বিক্রির সম্পূর্ণ record — কবে, কাকে, কী, কত দামে বিক্রি হয়েছে।

### কেন দরকার?
- হিসাব মেলানো
- কাস্টমারের complaint হলে receipt খুঁজে বের করা
- ব্যবসার performance বোঝা

### কীভাবে কাজ করবে?

| Feature | বিবরণ |
|---------|--------|
| Sales List | সব বিক্রির তালিকা (invoice no, date, customer, total, payment status) |
| Sale Detail | একটি sale এ click করলে সব item, discount, payment details দেখা যাবে |
| Search | Invoice no, customer name, date range দিয়ে search |
| Filter | তারিখ, payment status (paid/due/partial), payment method |
| Receipt Reprint | পুরানো receipt আবার print করা যাবে |
| Sale Return | পণ্য ফেরত নেওয়ার ব্যবস্থা (stock ফেরত, টাকা ফেরত বা credit) |
| Export | Sales data CSV/Excel এ export করা যাবে |

**Sale Return (পণ্য ফেরত) কীভাবে কাজ করবে:**
1. Sale history থেকে sale select করুন
2. কোন item ফেরত নিচ্ছেন select করুন
3. ফেরতের কারণ লিখুন
4. Refund: নগদ ফেরত / due adjust / credit note
5. Stock auto update হবে (ফেরত আসা পণ্য stock এ ফিরবে)

---

## 10. 🛍️ Purchase / Stock-In Management (ক্রয়)

### কী?
আপনি supplier থেকে যখন পণ্য কেনেন (stock আনেন) সেটা record করার ব্যবস্থা।

### কেন দরকার?
- stock কোথা থেকে এলো সেটা জানা দরকার
- ক্রয়মূল্য track করা (লাভ হিসাব করতে)
- Supplier এর সাথে হিসাব মেলানো
- পণ্যের purchase history দেখা

### কীভাবে কাজ করবে?

**Purchase Entry (নতুন মাল কেনা):**
1. Supplier select করুন
2. পণ্য select করুন + quantity + ক্রয়মূল্য দিন
3. একাধিক পণ্য একসাথে add করা যাবে
4. মোট হিসাব দেখুন
5. Payment: Cash / Due / Partial দিন
6. Save করলে → stock auto update হবে

| Feature | বিবরণ |
|---------|--------|
| Purchase List | সব purchase এর তালিকা |
| Purchase Detail | কোন purchase এ কী কী কেনা হয়েছে |
| Supplier Payment | Supplier কে বাকি শোধ করার ব্যবস্থা |
| Purchase Return | Supplier কে পণ্য ফেরত দেওয়া |

---

## 11. 💸 Expense Management (খরচ ব্যবস্থাপনা)

### কী?
দোকান চালাতে বিক্রি ছাড়াও নানা খরচ হয় — ভাড়া, বিদ্যুৎ, বেতন, পরিবহন। সেগুলো record করার ব্যবস্থা।

### কেন দরকার?
- আসল লাভ বুঝতে হলে খরচ জানা দরকার
- মাস শেষে আয়-ব্যয়ের হিসাব মেলানো
- কোথায় কত খরচ হচ্ছে সেটা বোঝা

### কীভাবে কাজ করবে?

**Expense যোগ:**

| Field | বিবরণ |
|-------|--------|
| খরচের ধরন | ভাড়া / বিদ্যুৎ / বেতন / পরিবহন / অন্যান্য (category) |
| পরিমাণ | কত টাকা খরচ হয়েছে |
| তারিখ | কোন তারিখে |
| নোট | বিবরণ ("জুলাই মাসের দোকান ভাড়া") |
| Reference | রসিদ নম্বর বা reference (ঐচ্ছিক) |

**Expense Category:**
- আগে থেকে কিছু category থাকবে (ভাড়া, বিদ্যুৎ, বেতন, পরিবহন)
- নতুন category যোগ করাও যাবে

**Expense Report:**
- মাসিক/সাপ্তাহিক খরচের সারসংক্ষেপ
- Category-wise খরচের breakdown
- আয় vs খরচ তুলনা

---

## 12. 📈 Reports & Analytics (রিপোর্ট)

### কী?
ব্যবসার সব তথ্য থেকে অর্থবহ রিপোর্ট তৈরি করা — বিক্রি, লাভ, স্টক, বাকি, খরচ ইত্যাদি।

### কেন দরকার?
SaaS হিসেবে বিক্রি করতে হলে শক্তিশালী report feature দরকার। ব্যবসায়ীরা জানতে চান তাদের ব্যবসা কেমন চলছে।

### রিপোর্টের তালিকা:

| রিপোর্ট | কী দেখায় |
|---------|----------|
| **Sales Report** | নির্দিষ্ট সময়ে মোট বিক্রি, transaction সংখ্যা, average sale value |
| **Profit & Loss** | বিক্রি - ক্রয়মূল্য - খরচ = নিট লাভ/ক্ষতি |
| **Product-wise Sales** | কোন পণ্য কত বিক্রি হয়েছে, কত লাভ হয়েছে |
| **Category-wise Sales** | ক্যাটেগরি অনুযায়ী বিক্রি ও লাভ |
| **Stock Report** | বর্তমান stock, stock value, low stock items |
| **Due Report** | কার কত বাকি, পুরানো বাকি, বাকি আদায়ের হার |
| **Expense Report** | মোট খরচ, category-wise খরচ |
| **Staff Report** | কোন staff কত বিক্রি করেছে (multi-user হলে) |
| **Payment Method Report** | Cash vs bKash vs Due — কোন method এ কত বিক্রি |
| **Daily Summary** | দিন শেষে সারাদিনের summary (cash in hand, total sale, total due) |
| **Purchase Report** | কত টাকার পণ্য কেনা হয়েছে, supplier-wise |

**সব রিপোর্টে:**
- Date range filter (আজ / গতকাল / এই সপ্তাহ / এই মাস / custom)
- Chart/Graph visualization
- Print করা যাবে
- CSV/Excel export

---

## 13. 👨‍💼 User / Staff Management (কর্মী)

### কী?
দোকানে একাধিক কর্মী থাকলে তাদের আলাদা login ও permission দেওয়ার ব্যবস্থা।

### কেন দরকার?
- SaaS হিসেবে বিক্রি করতে হলে multi-user support **অবশ্যই** লাগবে
- Owner জানতে চাইবে কোন staff কত বিক্রি করেছে
- সবাইকে সব access দেওয়া ঠিক না (যেমন: দোকান কর্মী ক্রয়মূল্য দেখতে পারবে না)

### কীভাবে কাজ করবে?

**User Roles (ভূমিকা):**

| Role | কী access পাবে |
|------|----------------|
| **Owner / Admin** | সব কিছু — settings, reports, delete, user manage |
| **Manager** | বেশিরভাগ কিছু — product add/edit, reports, purchase, কিন্তু user manage নয় |
| **Cashier / Staff** | শুধু POS (বিক্রি), customer add, receipt print — report বা settings access নেই |

**Features:**
| Feature | বিবরণ |
|---------|--------|
| User Add | নতুন staff যোগ (নাম, ফোন, email, password, role) |
| Login | প্রতিটি staff আলাদা login করবে |
| Activity Log | কে কখন কী করেছে সেটা record (যেমন: "রহিম ৳500 এর বিক্রি করেছে 2:30 PM") |
| Permission | Custom permission set করা যাবে (role ভিত্তিক) |
| Staff Report | প্রতি staff এর বিক্রি, discount দেওয়ার পরিমাণ ইত্যাদি |

---

## 14. ⚙️ Settings & Configuration (সেটিংস)

### কী?
App এর সব কিছু customize করার জায়গা।

### কী কী settings থাকবে?

| Setting | বিবরণ |
|---------|--------|
| **Business Info** | দোকানের নাম, ঠিকানা, ফোন, ইমেইল, লোগো (receipt এ দেখাবে) |
| **Currency** | মুদ্রা: ৳ (BDT) — default, পরিবর্তনযোগ্য |
| **Tax / VAT** | VAT % সেট করা (যদি প্রযোজ্য হয়, ঐচ্ছিক) |
| **Receipt Template** | Receipt এ কী কী দেখাবে customize করা |
| **Receipt Footer** | receipt এর নিচে custom message ("ধন্যবাদ! আবার আসবেন।") |
| **Invoice Prefix** | Invoice number এর prefix (INV-, BILL-, বা custom) |
| **Low Stock Alert Level** | Default কত stock এ alert দেবে |
| **QR Label Size** | QR code label এর default size |
| **Payment Methods** | কোন কোন payment method active থাকবে (Cash, bKash, Nagad, Bank) |
| **Theme** | Dark / Light mode |
| **Language** | বাংলা / English (future) |
| **Backup** | Manual data backup ও restore |
| **Data Sync** | Cloud sync on/off, sync status দেখা |

---

## 15. 🏪 Multi-Store Support (মাল্টি-স্টোর)

### কী?
একাধিক দোকান/শাখা থাকলে একই account থেকে সব manage করার ব্যবস্থা।

### কেন দরকার?
SaaS হিসেবে বিক্রি করতে হলে এটা **premium feature** হিসেবে রাখা যায়। যাদের একাধিক শাখা আছে তারা বেশি দাম দিয়ে হলেও এই feature চাইবে।

### কীভাবে কাজ করবে?

| Feature | বিবরণ |
|---------|--------|
| Store Add | নতুন শাখা/দোকান যোগ |
| Store Switch | এক দোকান থেকে অন্য দোকানে switch করা |
| Separate Inventory | প্রতি দোকানের আলাদা stock |
| Combined Reports | সব দোকানের combined report ও আলাদা আলাদা report |
| Stock Transfer | এক দোকান থেকে অন্য দোকানে মাল transfer |

> [!NOTE]
> **Phase 1 এ Multi-Store না রাখলেও চলবে।** এটা পরে premium feature হিসেবে add করা যায়। তবে database design এমনভাবে করতে হবে যেন পরে এটা সহজে যোগ করা যায়।

---

## 16. 🚀 SaaS Features

### কী?
আপনি এই app অন্যদের কাছে service হিসেবে বিক্রি করতে চান। সেজন্য কিছু বিশেষ feature দরকার।

### কী কী দরকার?

#### ক. Subscription / Plan Management
| Plan | Feature | মাসিক মূল্য (উদাহরণ) |
|------|---------|---------------------|
| **Free** | 1 user, 50 products, basic POS, no cloud sync | ৳0 |
| **Starter** | 2 users, 500 products, cloud sync, basic reports | ৳499 |
| **Business** | 5 users, unlimited products, full reports, QR print | ৳999 |
| **Enterprise** | Unlimited users, multi-store, priority support | ৳1999 |

#### খ. Landing Page / Marketing Site
- App এর একটা সুন্দর landing page থাকবে যেখান থেকে মানুষ sign up করবে
- Feature showcase, pricing, testimonials, contact

#### গ. User Onboarding
- নতুন user sign up করলে guided tour / tutorial দেখাবে
- Demo data load করার option (দেখতে পাবে app কেমন কাজ করে)

#### ঘ. Admin Panel (আপনার জন্য)
- সব user/subscriber দেখা
- কে কোন plan এ আছে
- Revenue tracking
- User activity monitoring

> [!IMPORTANT]
> **SaaS feature গুলো Phase 2 বা Phase 3 তে করা উচিত।** আগে core POS টা ভালোভাবে বানানো দরকার, তারপর SaaS layer add করা হবে।

---

## 📱 Mobile vs Desktop Experience

| বিষয় | Mobile | Desktop (PC) |
|-------|--------|-------------|
| Layout | Bottom navigation bar | Left sidebar navigation |
| POS Screen | Full screen, swipe for cart | Side-by-side (products + cart) |
| QR Scan | Phone camera (smooth) | Webcam (বা external scanner) |
| Receipt Print | Bluetooth thermal printer বা share | USB printer বা PDF |
| Touch | Touch optimized, big buttons | Mouse + keyboard optimized |

---

## 🔄 Offline vs Online Behavior

| বিষয় | Offline (Internet নেই) | Online (Internet আছে) |
|-------|----------------------|---------------------|
| POS / বিক্রি | ✅ চলবে (local data থেকে) | ✅ চলবে + cloud sync |
| Product Add/Edit | ✅ চলবে (locally save) | ✅ চলবে + cloud sync |
| QR Scan | ✅ চলবে (camera local) | ✅ চলবে |
| QR Public Page | ❌ চলবে না (URL open হবে না) | ✅ চলবে |
| Reports | ✅ চলবে (local data থেকে) | ✅ চলবে |
| Receipt Print | ✅ চলবে | ✅ চলবে |
| Cloud Sync | ❌ পরে হবে | ✅ auto sync |
| Multi-device access | ❌ শুধু ওই device এ | ✅ যেকোনো device থেকে |

> [!TIP]
> **Offline এ সব data locally কাজ করবে, internet আসলে background এ automatically cloud এ sync হয়ে যাবে।** User কে কিছু করতে হবে না — সব automatic।

---

## 📋 Feature Priority (কোনটা আগে বানাব?)

| Priority | Features | কেন আগে |
|----------|----------|---------|
| **P0 — Must Have** | Product CRUD, Category, POS/Billing, Cart, Receipt, QR Generate+Scan, Customer + বাকি, Basic Dashboard | এগুলো ছাড়া app চলবেই না |
| **P1 — Essential** | Inventory/Stock, Sales History, Discount System, Offline+Sync, User Auth | ব্যবসা চালাতে দরকার |
| **P2 — Important** | Purchase Management, Expense, Reports, Staff Management, Settings, Sale Return | Professional level feature |
| **P3 — Premium** | Multi-Store, SaaS Plan, Landing Page, Admin Panel, Export, Notification | SaaS হিসেবে বিক্রির জন্য |

---

## ❓ আপনার মতামত দরকার

নিচের বিষয়গুলো নিয়ে আপনার মতামত জানান:

1. **Feature List** — উপরের feature গুলো কি ঠিক আছে? কিছু বাদ দিতে চান বা নতুন কিছু যোগ করতে চান?

2. **বাকি System** — বাকির হিসাবের flow কি ঠিক আছে? আর কিছু দরকার?

3. **Priority** — P0 features দিয়ে শুরু করব? নাকি priority বদলাতে চান?

4. **Payment Methods** — Cash, bKash, Nagad, Rocket — আর কোনো payment method লাগবে?

5. **Language** — App এর UI বাংলায় হবে নাকি English এ? নাকি দুটোই (language switch)?

6. **SaaS** — SaaS feature গুলো কি পরে করব নাকি শুরু থেকেই plan এ রাখব?

7. **কিছু বাদ পড়েছে?** — এমন কোনো feature যা আপনার মনে আছে কিন্তু এখানে নেই?
