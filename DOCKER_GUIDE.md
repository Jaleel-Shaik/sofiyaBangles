# 🚀 Sofiya Bangles - Docker & Full Stack Deployment Guide

Complete guide for containerizing, running locally, and deploying the **Sofiya Bangles** ecosystem (Backend API + Next.js Admin Portal + Mobile App + Firebase).

---

## ⚡ 1. Port Collision Avoidance (Custom Port Strategy)

To ensure this project **never conflicts** with other applications or services running on your machine (e.g. on default ports `3000`, `5000`, `8080`, `5001`), this project uses dedicated custom ports:

| Service | Internal Container Port | Default Host Port (External) | Custom URL |
| :--- | :--- | :--- | :--- |
| **Backend API** | `5000` | **`5050`** | `http://localhost:5050/api` |
| **Admin Web Portal** | `3000` | **`3050`** | `http://localhost:3050` |
| **Health Check** | `5000` | **`5050`** | `http://localhost:5050/api/health` |

> 💡 **Need different ports?** Simply copy `.env.example` to `.env` in the root folder and change `BACKEND_PORT` or `WEB_PORT` to any available port numbers (e.g., `5055`, `3055`).

---

## 🛠️ 2. Prerequisites & Environment Setup

### A. Environment Files Setup
1. Copy the root environment file:
   ```bash
   cp .env.example .env
   ```
2. Setup Backend environment:
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env and provide your JWT_SECRET, Cloudinary credentials, etc.
   ```
3. Place your Firebase `service-account.json` in `backend/service-account.json`.

---

## 🐳 3. Running with Docker Locally

### Production Build & Run (Recommended)
Run both the Backend and Frontend together in optimized production containers:
```bash
docker compose up --build -d
```

### Check Running Containers & Health
```bash
docker compose ps
```

### View Live Logs
```bash
# All services
docker compose logs -f

# Backend only
docker compose logs -f backend

# Web portal only
docker compose logs -f web
```

### Stopping the Services
```bash
docker compose down
```

---

## 💻 4. Development Mode with Docker (Live Hot-Reloading)

To develop with live hot-reloading inside Docker without rebuilding every time:
```bash
docker compose -f docker-compose.dev.yml up --build
```

---

## 📱 5. Mobile App & Firebase Integration

The Mobile app (`mobile/`) is built with React Native and Expo. In development, Expo bundler runs on your host machine to compile and stream bundles to physical devices or emulators.

### Connecting Mobile App to Dockerized Backend:
1. **Android Emulator**:
   Configure `EXPO_PUBLIC_API_URL` or API base URL in `mobile/.env`:
   ```env
   EXPO_PUBLIC_API_URL=http://10.0.2.2:5050/api
   ```
2. **iOS Simulator**:
   ```env
   EXPO_PUBLIC_API_URL=http://localhost:5050/api
   ```
3. **Physical Android / iPhone Device (via Expo Go / WiFi)**:
   Find your computer's local IP address (e.g., `ipconfig` on Windows -> `192.168.1.X`):
   ```env
   EXPO_PUBLIC_API_URL=http://192.168.1.X:5050/api
   ```

### Firebase Setup Across Ecosystem:
- **Backend**: Uses Firebase Admin SDK (`service-account.json` mounted at `/app/service-account.json` or supplied via `FIREBASE_SERVICE_ACCOUNT_JSON` / `FIREBASE_SERVICE_ACCOUNT_BASE64` environment variable).
- **Mobile App**: Uses client Firebase config in `mobile/google-services.json` and Firebase Client SDK for user authentication.
- **Web Admin Portal**: Uses Next.js API client connected to `http://localhost:5050/api` with JWT & 2FA authentication.

---

## ☁️ 6. Cloud & Production Deployment

### Option A: Deploy with Docker Compose on VPS (DigitalOcean / AWS EC2 / Hetzner)
1. Clone the repository onto your VPS:
   ```bash
   git clone https://github.com/Jaleel-Shaik/sofiyaBangles.git
   cd sofiyaBangles
   ```
2. Configure `.env` and `backend/.env` with production domain names and credentials.
3. Launch with Docker Compose:
   ```bash
   docker compose up -d --build
   ```
4. Set up an Nginx reverse proxy with SSL (Let's Encrypt / Certbot) directing:
   - `api.yourdomain.com` → `http://localhost:5050`
   - `admin.yourdomain.com` → `http://localhost:3050`

### Option B: Cloud Native Container Platforms (GCP Cloud Run / Render / Railway)
- **Backend Service**:
  - Build context: `./backend`
  - Dockerfile: `backend/Dockerfile`
  - Environment: Set `FIREBASE_SERVICE_ACCOUNT_BASE64` or `FIREBASE_SERVICE_ACCOUNT_JSON` directly in your cloud platform secrets manager.
- **Web Service**:
  - Build context: `./web`
  - Dockerfile: `web/Dockerfile`
  - Build Arg: `NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api`
