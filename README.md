# Sofiya Bangles 💍

A full-stack e-commerce platform for handcrafted and fashion bangles, featuring:
- **Backend API**: Node.js + Express 5 + TypeScript + Google Cloud Firestore + Firebase Storage + Cloudinary CDN
- **Admin Web Portal**: Next.js 15 (App Router) + React 19 + TypeScript + TailwindCSS
- **Customer Mobile App**: React Native (Expo ~54) + NativeWind + Zustand

---

## 📚 Documentation
- **[Database Architecture & Schema Documentation](DATABASE_SCHEMA_DOCUMENTATION.md)** — Complete deep-dive into the 12 Firestore collections (tables), schemas, lifecycle states, ER diagram, and security flows.
- **[Docker Setup & Deployment Guide](DOCKER_GUIDE.md)** — Docker compose and containerization setup.
- **[Branch Protection & Git Workflow](BRANCH_PROTECTION_GUIDE.md)** — Team development rules and branch protection strategies.

---

## 🚀 Quick Start

### 1. Backend (`backend/`)
```bash
cd backend
npm install
npm run dev # Starts API server on port 5000
```

### 2. Admin Web Portal (`web/`)
```bash
cd web
npm install
npm run dev # Starts Next.js app on port 3000
```

### 3. Customer Mobile App (`mobile/`)
```bash
cd mobile
npm install
npx expo run:android # Launches Android app
```
