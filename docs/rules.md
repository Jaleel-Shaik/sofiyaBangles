# 📜 Sofiya Bangles — Engineering Constitution & Coding Rules

> **Document Version**: 2.0.0  
> **Target Audience**: All Contributing Developers, Code Reviewers, AI Coding Agents  
> **Status**: Mandatory & Strictly Enforced via CI/CD  
> **Last Updated**: September 2026  

---

## 📑 Table of Contents
1. [Core Philosophy & Non-Negotiables](#-core-philosophy--non-negotiables)
2. [Folder Structure & Architectural Boundaries](#-folder-structure--architectural-boundaries)
3. [TypeScript & Type Safety Standards](#-typescript--type-safety-standards)
4. [Asynchronous Code & Error Handling](#-asynchronous-code--error-handling)
5. [React & React Native Component Standards](#-react--react-native-component-standards)
6. [State Management & Data Fetching](#-state-management--data-fetching)
7. [Security & Secrets Hygiene](#-security--secrets-hygiene)
8. [Testing & Quality Assurance Thresholds](#-testing--quality-assurance-thresholds)
9. [Git Workflow, PR Guidelines & CI/CD Checklist](#-git-workflow-pr-guidelines--cicd-checklist)

---

## 🛡️ Core Philosophy & Non-Negotiables

Every engineer and AI agent contributing to **Sofiya Bangles** MUST adhere to these non-negotiable rules:

1. **Zero Hardcoded Secrets**: Never commit or write plaintext secrets, passwords, API tokens, or fallback credential literals in source code. All secrets must derive from environment variables.
2. **Never Bypass Security Checks**: Never write fallback catch blocks that ignore cryptographic or authorization verification based on user-controlled request inputs (e.g. CWE-807).
3. **No Direct Database Calls in Controllers**: Always route through dedicated services and repositories.
4. **No Any Types in Production Code**: Strive for $100\%$ type coverage using strict TypeScript interfaces and Zod schemas.
5. **Aesthetics & Performance First**: Web and mobile interfaces must look premium, feel responsive, support 44x44pt touch targets, and load without layout shifts.

---

## 📁 Folder Structure & Architectural Boundaries

### Monorepo Structure
```
sofiya_bangles/
├── backend/                  # Express 5 / Node.js API Service
├── web/                      # Next.js 15 Admin Web Application
├── mobile/                   # Expo SDK 54 / React Native Customer App
├── docs/                     # Architectural, PRD, and Design Documentation
├── .github/workflows/        # Automated CI/CD & Security Pipelines
└── docker-compose.yml        # Multi-container orchestration
```

### ❌ Anti-Patterns to Flag & Reject
* `[ ]` Placing all components in a single flat directory with no categorization.
* `[ ]` Mixing API/database query logic directly inside UI component files.
* `[ ]` Deeply nested folder structures exceeding 4 levels of depth.
* `[ ]` Storing configuration or environment files scattered outside `src/shared/config/`.
* `[ ]` Circular dependencies between modules (verify with `madge`).

### ✅ Architectural Separation Checklist
* `[ ]` **Clear Separation**: Components, services, utilities, and models are isolated into their respective directories.
* `[ ]` **Naming Conventions**:
  * PascalCase for components (`ProductCard.tsx`, `QuickSellModal.tsx`).
  * camelCase for utilities, hooks, and services (`crypto.utils.ts`, `useAuth.ts`, `product.service.ts`).
  * kebab-case for documentation and configuration files (`seed-superadmin.ts`, `docker-compose.dev.yml`).

---

## 🔒 TypeScript & Type Safety Standards

```typescript
// ❌ ANTI-PATTERN: Liberal use of any and unsafe casting
export function processOrder(data: any) {
  const price = (data as any).price;
  return price * 1.18;
}

// ✅ RECOMMENDED: Strict typing with Zod schema validation
import { z } from "zod";

export const OrderInputSchema = z.object({
  product_id: z.string().min(1),
  quantity: z.number().int().positive(),
  unit_price: z.number().nonnegative(),
});

export type OrderInput = z.infer<typeof OrderInputSchema>;

export function calculateOrderTotal(order: OrderInput): number {
  return Number((order.unit_price * order.quantity * 1.18).toFixed(2));
}
```

### Type Safety Checklist
* `[ ]` No liberal use of `any`. When dynamic shapes are required, use `unknown` with runtime type guards.
* `[ ]` No unsafe type assertions (`as string`) without prior validation.
* `[ ]` Mandatory null/undefined checks using optional chaining (`?.`) and nullish coalescing (`??`).
* `[ ]` Strict compiler mode enabled across all `tsconfig.json` files (`"strict": true`).

---

## ⚡ Asynchronous Code & Error Handling

```typescript
// ❌ ANTI-PATTERN: Nested callback hell & unhandled promises
function fetchProduct(id, callback) {
  db.get(id, (err, product) => {
    if (err) return callback(err);
    inventory.check(product.sku, (invErr, stock) => {
      // Unhandled error branch & callback nesting
      callback(null, { ...product, stock });
    });
  });
}

// ✅ RECOMMENDED: Clean async/await with centralized error envelopes
export async function getProductWithStockService(productId: string): Promise<ProductWithStock> {
  try {
    const product = await getProductByIdDb(productId);
    if (!product) {
      throw new AppError("PRODUCT_NOT_FOUND", "Requested product does not exist.", 404);
    }
    const variants = await getVariantsByProductDb(productId);
    return { ...product, variants };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("INTERNAL_SERVER_ERROR", "Failed to retrieve product details.", 500, error);
  }
}
```

### Async Audit Checklist
* `[ ]` Zero nested callbacks; maximum 1 level of async/await indentation.
* `[ ]` Every async operation is wrapped in a `try/catch` block or caught by `asyncHandler`.
* `[ ]` Parallel operations utilize `Promise.all()` to prevent serial request waterfalls.
* `[ ]` Zero unhandled promise rejections or floating promises.

---

## 🧩 React & React Native Component Standards

### Component Design Principles
1. **Single Responsibility**: Each component must do exactly one thing well.
2. **Composable Primitives**: UI components are composed from design tokens, not ad-hoc inline styles.
3. **Props Over Hardcoding**: Text, URLs, labels, and styles must be configurable via props.
4. **No Direct State Mutation**: Always use functional state updates (`setState(prev => ...)`).

```tsx
// ❌ ANTI-PATTERN: Hardcoded, non-reusable component
export function BangleCard() {
  return (
    <div style={{ padding: 16, backgroundColor: '#fff' }}>
      <h3>Gold Plated Bangle</h3>
      <button onClick={() => alert('Added')}>Add to Bag</button>
    </div>
  );
}

// ✅ RECOMMENDED: Reusable, token-driven, fully typed component
interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  onAddToCart: (id: string) => void;
  variant?: 'compact' | 'expanded';
}

export const ProductCard: React.FC<ProductCardProps> = ({
  id,
  name,
  price,
  imageUrl,
  onAddToCart,
  variant = 'compact',
}) => {
  return (
    <Card className={variant === 'compact' ? 'p-3' : 'p-6'}>
      <img src={imageUrl} alt={name} className="w-full aspect-square object-cover rounded-md" />
      <h3 className="text-body-md font-semibold text-text-primary mt-2">{name}</h3>
      <p className="text-title-sm font-bold text-primary-500">₹{price.toLocaleString('en-IN')}</p>
      <Button variant="primary" onClick={() => onAddToCart(id)} className="w-full mt-3">
        Add to Bag
      </Button>
    </Card>
  );
};
```

---

## 🎨 Styling Standards & CSS Tokens

All components must consume centralized design tokens from `tailwind.config` or CSS variables, never hardcoded visual values:

```css
@theme {
  /* Sofiya Rose Palette */
  --color-primary-50: #FFF0F3;
  --color-primary-100: #FFD6DE;
  --color-primary-200: #FFB3C2;
  --color-primary-300: #FF8099;
  --color-primary-400: #FF4D70;
  --color-primary-500: #E8436E; /* Primary Brand Rose */
  --color-primary-600: #CC3366;
  --color-primary-700: #B3245A;

  /* Sapphire Secondary */
  --color-secondary-500: #2563EB;
  --color-secondary-600: #1D4ED8;

  /* Surfaces & Neutrals */
  --color-surface-bg: #FAFAFA;
  --color-surface-card: #FFFFFF;
  --color-surface-muted: #F8FAFC;
  --color-border-default: #E2E8F0;
  --color-border-strong: #CBD5E1;
}
```

### Styling Audit Checklist
* `[ ]` **No Inline Styles**: Avoid `style={{ ... }}` except for truly dynamic runtime values (e.g. animated offsets).
* `[ ]` **Touch Target Minima**: All buttons and tappable controls must adhere to `min-tap` ($44 \times 44\text{ pt}$ on mobile, $36\text{px}$ on desktop).
* `[ ]` **Mobile-First CSS**: Base classes define mobile layout; `sm:`, `md:`, `lg:`, `xl:` enhance for larger viewports.
* `[ ]` **No `!important` Abuse**: Specificity is managed via Tailwind utility cascades.

---

## 📊 State Management & Data Fetching

* **Local State**: Use `useState` or `useReducer` for UI-only state (modals, dropdown toggles).
* **Global Client State**: Use **Zustand** (`authStore`, `favoriteStore`, `sizeStore`). Keep stores normalized and avoid deeply nested objects.
* **Server State**: Never store raw server responses in global stores when caching layers (React Query / SWR / Axios clients) can handle revalidation.
* **Prop Drilling Limit**: Maximum 2 levels of props passing before leveraging Context or a Zustand selector.

---

## 🔐 Security & Secrets Hygiene

1. **Environment Variables**:
   * All variables declared in `.env.example`.
   * Access only through centralized modules (`src/shared/config/env.ts`).
2. **Cryptographic Protection**:
   * Derivation of AES-256 keys strictly dynamic via `crypto.createHash("sha256").update(...)`.
   * Stored values must use per-record random IVs (`ivHex:encryptedHex`).
3. **Automated Scanners**:
   * **CodeQL SAST**: Enforced on all PRs targeting `main` via `.github/workflows/security.yml`.
   * **Trivy Scanner**: Action `@v0.36.0` scanning dependencies and container images.
   * **Gitleaks**: Scans commit history for leaked tokens before merge.

---

## 🧪 Testing & Quality Assurance Thresholds

```
       /\
      /  \    E2E Tests (10%)         -> Playwright / Detox
     /____\   
    /      \  Integration Tests (20%) -> API Route & Service Lifecycle
   /________\ 
  /          \ Unit Tests (70%)       -> Utilities, Crypto, Models, Reducers
 /____________\
```

### Coverage Requirements
* **Minimum Test Coverage**: $\ge 70\%$ code coverage across all domain services and utilities.
* **Mandatory Suites**:
  * Unit tests for crypto and TOTP utilities (`totp.utils.test.ts`, `crypto.utils.test.ts`).
  * Lifecycle tests for product models and inventory deduction (`product.model.test.ts`).
  * End-to-end integration tests for SuperAdmin 2FA authentication flow (`superAdmin.test.ts`).

---

## 🚀 Git Workflow, PR Guidelines & CI/CD Checklist

### Branch Strategy
* `main`: Production release branch (protected, requires PR and passing CI).
* `feature-development`: Active integration and staging branch.
* `feat/*` or `fix/*`: Topic branches created from `feature-development`.

### Conventional Commit Standards
Every commit must use conventional prefixing:
* `feat:` A new user-facing feature.
* `fix:` A bug fix or security remediation.
* `refactor:` Code restructuring without behavioral changes.
* `test:` Adding or updating automated tests.
* `docs:` Documentation improvements.
* `ci:` Workflows, Docker, or build pipeline changes.

### PR Review Checklist
* `[ ]` Code compiles without errors (`npx tsc --noEmit` in all affected projects).
* `[ ]` All automated tests pass (`npm test` in `backend`).
* `[ ]` No secrets, API keys, or passwords committed.
* `[ ]` CodeQL and Trivy security workflows pass with zero high/critical alerts.
* `[ ]` PR size is $\le 400\text{ lines}$ of changes (excluding package-lock or generated assets).
