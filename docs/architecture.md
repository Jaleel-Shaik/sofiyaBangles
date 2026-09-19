# 🏗️ Sofiya Bangles — Full-Stack System Architecture

> **Document Version**: 2.0.0  
> **Target Audience**: Backend Engineers, Frontend Engineers, DevOps, System Architects  
> **Status**: Living Architecture Specification  
> **Last Updated**: September 2026  

---

## 📑 Table of Contents
1. [High-Level System Topology](#-high-level-system-topology)
2. [Clean Architecture Layering Standard](#-clean-architecture-layering-standard)
3. [Component Directory Structures](#-component-directory-structures)
   - [Backend Architecture (`backend/`)](#1-backend-architecture-backend)
   - [Web Admin Architecture (`web/`)](#2-web-admin-architecture-web)
   - [Mobile App Architecture (`mobile/`)](#3-mobile-app-architecture-mobile)
4. [Dual-Database Strategy & Data Models](#-dual-database-strategy--data-models)
5. [Security & Authentication Architecture](#-security--authentication-architecture)
   - [2FA TOTP Flow with AES-256-CBC](#2fa-totp-flow-with-aes-256-cbc)
   - [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
6. [Integration & Media Pipeline](#-integration--media-pipeline)
7. [Observability, Logging & Audit Ledger](#-observability-logging--audit-ledger)

---

## 🌐 High-Level System Topology

```mermaid
flowchart TB
    subgraph Clients[" Client Tier "]
        direction TB
        Mobile["📱 Mobile App (iOS / Android)<br/>React Native • Expo SDK 54 • NativeWind • Zustand"]
        WebAdmin["💻 Admin Web Portal<br/>Next.js 15 App Router • React 19 • TailwindCSS"]
    end

    subgraph Gateway[" API & Transport Layer "]
        direction TB
        ReverseProxy["🌐 Reverse Proxy / Ingress<br/>HTTPS • TLS 1.3 • CORS Enforcement"]
        RateLimit["🛡️ Rate Limiting & Auth Gate<br/>express-rate-limit • Helmet • Zod Validator"]
    end

    subgraph CoreBackend[" Core Application Tier (`backend/`) "]
        direction TB
        Router["Routing Layer (/api/*)"]
        Controllers["Controller Layer"]
        Services["Domain & Service Layer<br/>Auth • Products • Orders • Revenue • Janitor"]
        DataAccess["Repository & Data Access Layer"]
    end

    subgraph External[" External Cloud Services "]
        direction TB
        Cloudinary["☁️ Cloudinary CDN<br/>Image Optimization & Delivery"]
        Firebase["🔥 Firebase Auth & Storage<br/>Client Auth & Document Vault"]
        WhatsApp["💬 WhatsApp Business API<br/>Direct Order Dispatch"]
    end

    subgraph Persistence[" Distributed Persistence Tier "]
        direction TB
        Firestore[("🔥 Google Cloud Firestore<br/>12 Collections • Documents • Audit Logs")]
        Postgres[("🐘 Supabase PostgreSQL<br/>Relational Ledgers • Financial Balances")]
    end

    Mobile -->|HTTPS REST| ReverseProxy
    WebAdmin -->|HTTPS REST| ReverseProxy
    ReverseProxy --> RateLimit
    RateLimit --> Router
    Router --> Controllers
    Controllers --> Services
    Services --> DataAccess
    Services --> External
    DataAccess --> Persistence
```

---

## 🏛️ Clean Architecture Layering Standard

The backend strictly implements Clean Layered Architecture. Dependencies flow exclusively **downward**:

```
Routes  ──▶  Middleware  ──▶  Controllers  ──▶  Services  ──▶  Repositories  ──▶  Persistence
```

```mermaid
classDiagram
    class RouteLayer {
        +Define HTTP Verbs & Endpoints
        +Mount Middlewares (RateLimit, Auth, Role)
        +Attach Zod Validation Schemas
    }
    class MiddlewareLayer {
        +Verify JWT & Extract Device Info
        +Enforce RBAC (user, admin, super_admin)
        +Sanitize & Validate Request Body
    }
    class ControllerLayer {
        +Translate HTTP Request to Command
        +Extract Params, Query, Body
        +Invoke Domain Service
        +Return Uniform JSON Envelope
    }
    class ServiceLayer {
        +Enforce Business Logic & Invariants
        +Encrypt/Decrypt Sensitive Data (AES-256)
        +Calculate Sizing & Pricing
        +Coordinate Transactions & Audits
    }
    class RepositoryLayer {
        +Execute Firestore / Postgres Queries
        +Manage Pagination & Filtering
        +Isolate Persistence Mechanisms
    }

    RouteLayer --> MiddlewareLayer
    MiddlewareLayer --> ControllerLayer
    ControllerLayer --> ServiceLayer
    ServiceLayer --> RepositoryLayer
```

---

## 📁 Component Directory Structures

### 1. Backend Architecture (`backend/`)

```
backend/
├── src/
│   ├── db/                     # Direct database access functions (products, categories, users)
│   ├── features/               # Modular domain feature slices
│   │   ├── admin/              # Store admin operations
│   │   ├── auth/               # Authentication, TOTP 2FA, OTP verification
│   │   │   ├── controllers/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   └── validations/
│   │   ├── category/           # Bangles taxonomy and categorization
│   │   ├── model-type/         # Jewelry model classifications
│   │   ├── order/              # Orders, checkout, status transitions, revenue ledger
│   │   ├── product/            # Product catalog, variants, images, stock updates
│   │   ├── settings/           # Store profile & business configurations
│   │   └── super-admin/        # Super-admin commission controls, staff management
│   ├── shared/                 # Cross-cutting foundational modules
│   │   ├── config/             # Centralized environment & database configuration
│   │   ├── middlewares/        # Auth, role, validation, upload, error handlers
│   │   ├── models/             # Persistence models (identity, audit, revenue)
│   │   ├── types/              # Global TypeScript interfaces and type definitions
│   │   └── utils/              # Crypto (AES-256-CBC), TOTP, datetime, response wrappers
│   ├── scripts/                # Database migrations, seeding, maintenance CLI tools
│   └── server.ts               # Express 5 application bootstrap & graceful shutdown
├── tests/                      # Automated unit, integration, and E2E test suites
├── Dockerfile                  # Multi-stage production container definition
└── package.json
```

### 2. Web Admin Architecture (`web/`)

```
web/
├── app/                        # Next.js 15 App Router pages & server layouts
│   ├── dashboard/              # Protected admin route group
│   │   ├── activity/           # Audit logs inspection
│   │   ├── admins/             # Staff & role management
│   │   ├── customers/          # Customer directory
│   │   ├── orders/             # Order fulfillment hub
│   │   ├── products/           # Product catalogue manager
│   │   ├── revenue/            # Platform commission analytics
│   │   └── settings/           # Store & commission configuration
│   ├── layout.tsx              # Root layout with providers
│   └── page.tsx                # Public / landing redirect
├── features/                   # Feature-based presentation modules
│   ├── auth/                   # Login, 2FA QR setup, 2FA verification screens
│   ├── categories/             # Category management page & modals
│   ├── dashboard/              # Analytics charts & KPI widgets
│   ├── model-types/            # Model type configuration
│   ├── products/               # Product list, add/edit form, QuickSellModal
│   └── settings/               # Business profile settings
├── public/                     # Static icons, logos, manifests, favicons
├── src/
│   ├── components/             # Reusable UI primitives (Button, Card, Input, Modal, Table)
│   ├── constants/              # Centralized icons, strings, navigation definitions
│   ├── lib/api/                # Strongly-typed API client & endpoints
│   └── theme/                  # Design tokens, color palette, typography definitions
└── tailwind.config.ts
```

### 3. Mobile App Architecture (`mobile/`)

```
mobile/
├── app/                        # Expo Router file-based navigation
│   ├── (admin)/                # Protected admin tab group (QuickSell, Dashboard, Products)
│   ├── (tabs)/                 # Customer tab navigation (Home, Categories, Favorites, Profile)
│   ├── category/[id].tsx       # Category product listing screen
│   ├── products/[id].tsx       # Product detail & sizing customizer screen
│   └── _layout.tsx             # Root Stack navigation layout with AuthProvider
├── features/                   # Feature-specific components and sub-screens
│   ├── admin/                  # Admin mobile screens (QuickSellScreen, AdminProductCard)
│   ├── auth/                   # Mobile login form, OTP digit input, QR setup step
│   ├── categories/             # Category grid & selection screen
│   ├── home/                   # Hero banners, trending products, new arrivals
│   ├── products/               # Variant selector, image gallery, review section
│   ├── profile/                # Orders history, addresses, sizing preferences
│   └── search/                 # Instant debounced search screen
├── src/
│   ├── api/                    # Axios API client, endpoints, error bus
│   ├── components/             # Reusable native components (Button, Card, Badge, Header)
│   ├── constants/              # Mobile icons mapping, localized strings
│   ├── store/                  # Zustand state stores (authStore, favoriteStore, sizeStore)
│   ├── theme/                  # Tokens, typography ramp, 8pt spacing grid
│   └── utils/                  # Universal secureStore (Expo SecureStore + Web localStorage)
└── tsconfig.json               # Configured with "extends": "expo/tsconfig.base"
```

---

## 💾 Dual-Database Strategy & Data Models

| Database | Primary Purpose | Collections / Tables | Why Selected |
| :--- | :--- | :--- | :--- |
| **Google Cloud Firestore** | Document Vault & Real-Time Sync | `users`, `admins`, `products`, `categories`, `model_types`, `orders`, `order_items`, `login_challenges`, `audit_logs`, `security_events`, `reviews`, `favorites` | Real-time push listeners, flexible JSON documents, serverless automatic scaling, sub-collection queries. |
| **Supabase PostgreSQL** | Relational Financial Ledger | `platform_settings`, `revenue_ledgers`, `commission_records` | ACID guarantees, complex join queries, strict decimal mathematical precision for financial auditing. |

---

## 🔐 Security & Authentication Architecture

### 2FA TOTP Flow with AES-256-CBC
1. **Secret Generation**: Using `otplib`, generating standard Base32 TOTP secrets with dynamic dynamic month/year issuer metadata (`Sofiya Bangles (MM/YYYY)`).
2. **At-Rest Encryption**:
   $$\text{Ciphertext} = \text{AES-256-CBC}(\text{Secret}, \text{DerivedKey}, \text{RandomIV})$$
   Stored format: `ivHex:ciphertextHex`. No plaintext secrets ever touch the database.
3. **Clock Drift Tolerance**: Verifications utilize $\pm 60\text{ seconds}$ ($\text{epochTolerance} = 60$) to prevent user lockouts caused by device clock skew.
4. **Zero Bypass Rule**: All 2FA verification endpoints strictly mandate a valid, cryptographically signed `otp_pending_token`. Verification exceptions are never swallowed.

```mermaid
graph TD
    A[User Submits Valid Password] --> B[Generate Login Challenge doc]
    B --> C[Sign 10-minute JWT: otp_pending_token]
    C --> D[Return Token to Client]
    D --> E[Client Submits: otp_pending_token + 6-digit TOTP]
    E --> F{Verify JWT Signature}
    F -->|Invalid/Expired| G[Reject with 401]
    F -->|Valid| H{Verify Challenge Status}
    H -->|Locked/Expired| G
    H -->|Pending| I[Decrypt AES-256 Secret]
    I --> J{Verify TOTP with ±60s Window}
    J -->|Invalid| K[Increment failed_attempts & Audit Log]
    J -->|Valid| L[Issue Access & Refresh Tokens]
    K --> M{failed_attempts >= 5?}
    M -->|Yes| N[Lock Account 15 Minutes]
    M -->|No| G
```

### Role-Based Access Control (RBAC)

```mermaid
graph LR
    subgraph Roles
        User["user<br/>Customer"]
        Admin["admin<br/>Store Manager"]
        SuperAdmin["super_admin<br/>Platform Owner"]
    end

    subgraph Permissions
        P1[Browse Products & Place Orders]
        P2[Manage Sizing Preferences & Favorites]
        P3[Quick Sell Inventory POS]
        P4[Add / Edit Products & Categories]
        P5[Manage Staff Accounts & Reset 2FA]
        P6[Configure 70/30 Commission Splits]
        P7[View Immutable Audit Logs]
    end

    User --> P1
    User --> P2
    Admin --> P1
    Admin --> P3
    Admin --> P4
    SuperAdmin --> P1
    SuperAdmin --> P3
    SuperAdmin --> P4
    SuperAdmin --> P5
    SuperAdmin --> P6
    SuperAdmin --> P7
```

---

## 🖼️ Integration & Media Pipeline

```mermaid
sequenceDiagram
    participant Admin as Admin Browser
    participant API as Backend API
    participant Cloudinary as Cloudinary CDN
    participant DB as Firestore DB

    Admin->>API: Upload Product Image (multipart/form-data)
    API->>API: Validate MIME Type (image/jpeg, image/png, image/webp) & Size (<= 5MB)
    API->>Cloudinary: Stream upload with auto-compression & WebP transformation
    Cloudinary-->>API: Returns secure_url & public_id
    API->>DB: Save product document with Cloudinary CDN URL
    DB-->>API: Saved Document
    API-->>Admin: 201 Created (Product Data with CDN URL)
```

---

## 📊 Observability, Logging & Audit Ledger

1. **Structured Request Logging**:
   Every request records `x-request-id`, `timestamp`, `method`, `route`, `statusCode`, `durationMs`, and client platform.
2. **Immutable Audit Ledger** (`audit_logs` collection):
   Captures every sensitive mutation:
   * Actor ID & User Type
   * Action Code (`PRODUCT_CREATED`, `PRODUCT_SOLD`, `2FA_RESET`, `COMMISSION_UPDATED`)
   * Affected Document ID & Table
   * `old_data` vs `new_data` delta snapshot
   * IP address and User-Agent
3. **Security Incident Ledger** (`security_events` collection):
   Captures brute-force attempts, locked accounts, and unauthorized role escalations with a 365-day retention policy.
