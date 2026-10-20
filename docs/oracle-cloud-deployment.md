# ☁️ Oracle Cloud Always Free — Backend & Custom Domain Deployment Guide

Comprehensive step-by-step guide to deploying the **Sofiya Bangles** backend API on **Oracle Cloud Infrastructure (OCI) Always Free Tier**, configuring your **custom domain** with free **Let's Encrypt SSL**, and linking it with the **Next.js Web Portal** and **Expo Mobile App**.

---

## 🏗️ Architecture Overview

```
                      ┌──────────────────────────────────────────────┐
                      │              Custom Domain DNS               │
                      │  api.yourdomain.com   → Oracle VM Public IP  │
                      │  admin.yourdomain.com → Vercel or Oracle VM  │
                      └──────────────────────┬───────────────────────┘
                                             │
                       HTTPS (Port 443) with Let's Encrypt SSL
                                             │
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │    Oracle Cloud Always Free VM (Ubuntu)      │
                      │                                              │
                      │   ┌──────────────────────────────────────┐   │
                      │   │       Nginx Reverse Proxy            │   │
                      │   │   (SSL Termination + Real IP + Gzip) │   │
                      │   └──────────────────┬───────────────────┘   │
                      │                      │ Proxy to 127.0.0.1:5000│
                      │                      ▼                       │
                      │   ┌──────────────────────────────────────┐   │
                      │   │        PM2 Process Manager           │   │
                      │   │    sofiya-backend (Node.js / Express)│   │
                      │   │    - Session cleanup worker (1 hr)   │   │
                      │   │    - Graceful shutdown handler       │   │
                      │   │    - Auto-restart on reboot / crash  │   │
                      │   └──────────────────────────────────────┘   │
                      └──────────────────────┬───────────────────────┘
                                             │
                      ┌──────────────────────┼───────────────────────┐
                      │                      │                       │
                      ▼                      ▼                       ▼
           ┌─────────────────────┐ ┌───────────────────┐ ┌───────────────────┐
           │   Supabase Postgres │ │ Cloudinary Media  │ │  Firebase Admin   │
           │      (Database)     │ │     (Images)      │ │   (Auth/Tokens)   │
           └─────────────────────┘ └───────────────────┘ └───────────────────┘
```

---

## 📋 Table of Contents
1. [Step 1: Create Oracle Cloud Always Free VM](#step-1-create-oracle-cloud-always-free-vm)
2. [Step 2: Open OCI Network Ingress Rules (Ports 80 & 443)](#step-2-open-oci-network-ingress-rules)
3. [Step 3: Fix Ubuntu Firewall Inside the VM (Critical Gotcha!)](#step-3-fix-ubuntu-firewall-inside-the-vm)
4. [Step 4: Configure Domain DNS Records](#step-4-configure-domain-dns-records)
5. [Step 5: Setup Server Environment (Node.js 22, Git, Nginx, PM2)](#step-5-setup-server-environment)
6. [Step 6: Clone Code & Configure Production Environment](#step-6-clone-code--configure-production-environment)
7. [Step 7: Launch Backend with PM2](#step-7-launch-backend-with-pm2)
8. [Step 8: Configure Nginx & Free SSL with Certbot](#step-8-configure-nginx--free-ssl-with-certbot)
9. [Step 9: Link the Web Admin Portal (Next.js)](#step-9-link-the-web-admin-portal-nextjs)
10. [Step 10: Link the Mobile App (Expo / React Native)](#step-10-link-the-mobile-app-expo--react-native)
11. [Step 11: Verification & Testing](#step-11-verification--testing)
12. [Step 12: Zero-Downtime Updates & Maintenance](#step-12-zero-downtime-updates--maintenance)

---

## Step 1: Create Oracle Cloud Always Free VM

1. Log into your **[Oracle Cloud Console](https://cloud.oracle.com/)**.
2. Go to **Compute** → **Instances** → Click **Create Instance**.
3. Configure the instance:
   - **Name**: `sofiya-backend-prod`
   - **Placement / Compartment**: Default
   - **Image**: **Canonical Ubuntu 24.04** or **Ubuntu 22.04 LTS Minimal**
   - **Shape**:
     - *Recommended (High Performance)*: **Ampere ARM (VM.Standard.A1.Flex)** with **2 to 4 OCPUs** and **12 to 24 GB RAM** (100% Always Free!).
     - *Alternative*: **AMD (VM.Standard.E2.1.Micro)** with **1 OCPU** and **1 GB RAM** (Always Free).
   - **Networking**:
     - Virtual cloud network: Create new or select existing VCN.
     - Assign a public IPv4 address: **Yes** (make sure it has a Public IP).
   - **SSH Keys**:
     - Select **Generate a key pair for me** and download both the **Private Key** (`.key`) and Public Key.
4. Click **Create** and wait for the status to show **RUNNING**.
5. Note your **Public IP Address** (e.g., `129.150.XX.XX`).

---

## Step 2: Open OCI Network Ingress Rules

By default, Oracle Cloud blocks all ports except SSH (port 22). You must allow web traffic:

1. In the Oracle Cloud Console, navigate to **Networking** → **Virtual Cloud Networks**.
2. Click on your VCN (e.g., `vcn-xxxx`).
3. Under **Resources** (left sidebar), click **Security Lists** → Click **Default Security List for vcn-xxxx**.
4. Click **Add Ingress Rules**:
   - **Rule 1 (HTTP Port 80)**:
     - Source CIDR: `0.0.0.0/0`
     - IP Protocol: `TCP`
     - Destination Port Range: `80`
     - Description: `Allow Inbound HTTP`
   - **Rule 2 (HTTPS Port 443)**:
     - Source CIDR: `0.0.0.0/0`
     - IP Protocol: `TCP`
     - Destination Port Range: `443`
     - Description: `Allow Inbound HTTPS`
5. Click **Add Ingress Rules**.

---

## Step 3: Fix Ubuntu Firewall Inside the VM

> [!CAUTION]
> **CRITICAL ORACLE CLOUD GOTCHA**: Oracle's official Ubuntu images include a restrictive `iptables` ruleset that drops incoming traffic on ports 80 and 443 **even after** you open them in the OCI Web Console!

Connect to your VM via SSH:
```bash
ssh -i /path/to/your-private-key.key ubuntu@<YOUR_ORACLE_PUBLIC_IP>
```

Run these commands inside your VM to permanently allow HTTP and HTTPS traffic:
```bash
# Allow ports 80 and 443 in Ubuntu iptables
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT

# Save the iptables rules so they persist across VM reboots
sudo apt-get update && sudo apt-get install -y iptables-persistent
sudo netfilter-persistent save
sudo netfilter-persistent reload
```

---

## Step 4: Configure Domain DNS Records

Go to where you purchased your domain (Cloudflare, GoDaddy, Namecheap, Hostinger, etc.) and add the following **DNS A Records**:

| Type | Name / Host | Value / Target | TTL | Description |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `api` | `<YOUR_ORACLE_PUBLIC_IP>` | Auto / 1 min | Backend API (`https://api.yourdomain.com`) |
| **A** | `admin` | `<YOUR_ORACLE_PUBLIC_IP>` | Auto / 1 min | Next.js Web Admin (if hosted on Oracle) |
| **CNAME** | `admin` | `cname.vercel-dns.com` | Auto | (Alternative: If Web is hosted on Vercel) |

> 💡 *Note: DNS records take 2 to 10 minutes to propagate globally.*

---

## Step 5: Setup Server Environment

Run the following commands on your Oracle Cloud VM to install **Node.js 22 LTS**, **Git**, **Nginx**, and **PM2**:

```bash
# 1. Update OS packages
sudo apt update && sudo apt upgrade -y

# 2. Install essential tools & build utilities
sudo apt install -y curl wget git build-essential nginx certbot python3-certbot-nginx

# 3. Install Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# 4. Verify Node and NPM versions
node -v    # v22.x.x
npm -v     # 10.x.x

# 5. Install PM2 globally
sudo npm install -g pm2
```

---

## Step 6: Clone Code & Configure Production Environment

```bash
# 1. Clone repository to server
cd /var/www || cd /home/ubuntu
git clone https://github.com/Jaleel-Shaik/sofiyaBangles.git
cd sofiyaBangles/backend

# 2. Create your production environment file
nano .env.production
```

Paste your production variables into `.env.production` (customize with your actual credentials):

```env
# ── SERVER & PORTS ───────────────────────────────────────────
PORT=5000
NODE_ENV=production

# ── DOMAIN & CORS CONFIGURATION ──────────────────────────────
# Replace yourdomain.com with your actual registered domain
CORS_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com,https://api.yourdomain.com,http://localhost:3000,http://localhost:3050

# Admin Web Portal URL
ADMIN_PORTAL_URL=https://admin.yourdomain.com

# Mobile App Deep Link Scheme
MOBILE_APP_SCHEME=sofiyabangles

# ── DATABASE (PostgreSQL / Supabase) ─────────────────────────
DB_HOST=db.your_supabase_project_ref.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# ── CLOUDINARY MEDIA STORAGE ─────────────────────────────────
CLOUD_NAME=your_cloudinary_cloud_name
CLOUD_API_KEY=your_cloudinary_api_key
CLOUD_API_SECRET=your_cloudinary_secret

# ── SECURITY & JWT ───────────────────────────────────────────
# Generate 64-char JWT secret: openssl rand -hex 32
JWT_SECRET=your_64_character_random_jwt_secret
JWT_EXPIRES_IN=7d
# Generate 32-byte TOTP encryption key: openssl rand -hex 32
TOTP_ENCRYPTION_KEY=your_32_byte_hex_encryption_key

# ── CLEANUP & RETENTION ──────────────────────────────────────
LOGIN_CHALLENGE_TTL_MS=300000
SESSION_EXPIRY_GRACE_MS=0
SESSION_CLEANUP_INTERVAL_MS=3600000
AUDIT_RETENTION_DAYS=90
SECURITY_EVENT_RETENTION_DAYS=365

# ── NOTIFICATIONS & INTEGRATIONS ────────────────────────────
FIREBASE_STORAGE_BUCKET=your-firebase-project.firebasestorage.app
WHATSAPP_NUMBER=your_whatsapp_phone_number

# ── FIREBASE SERVICE ACCOUNT ─────────────────────────────────
# Option A: Place service-account.json in the backend directory:
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
# Option B: Or paste base64 encoded JSON:
# FIREBASE_SERVICE_ACCOUNT_BASE64=...
```

Place your `service-account.json` file in `/backend/service-account.json`:
```bash
nano service-account.json
# Paste your Firebase service account JSON and save (Ctrl+O, Enter, Ctrl+X)
chmod 600 service-account.json
```

---

## Step 7: Launch Backend with PM2

Install dependencies, compile TypeScript, and start the service:

```bash
# 1. Install production & build dependencies
npm ci

# 2. Compile TypeScript to JavaScript (generates dist/)
npm run build

# 3. Create logs directory
mkdir -p logs

# 4. Start backend using the pre-configured ecosystem file
pm2 start ecosystem.config.js --env production

# 5. Check status
pm2 status

# 6. Configure PM2 to start automatically on system reboot
pm2 startup
# (Copy and run the sudo env PATH=... command printed by PM2)
pm2 save
```

Verify backend is responding locally:
```bash
curl http://localhost:5000/api/health
```
You should see: `{"success":true,"status":"ok","service":"sofiya-bangles-backend",...}`

---

## Step 8: Configure Nginx & Free SSL with Certbot

1. Copy the pre-configured Nginx reverse proxy configuration:
```bash
sudo cp nginx.conf.example /etc/nginx/sites-available/sofiya-backend
```

2. Edit the file to replace `api.yourdomain.com` with your real domain:
```bash
sudo nano /etc/nginx/sites-available/sofiya-backend
```

Replace `api.yourdomain.com` with your real domain (e.g. `api.sofiyabangles.com`).

3. Enable the site and restart Nginx:
```bash
# Enable site
sudo ln -sf /etc/nginx/sites-available/sofiya-backend /etc/nginx/sites-enabled/

# Remove default Nginx welcome page
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx syntax
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

4. Obtain your Free Let's Encrypt SSL Certificate:
```bash
sudo certbot --nginx -d api.yourdomain.com
```
*Enter your email address, accept the terms, and choose to redirect HTTP traffic to HTTPS.*

5. Test the public HTTPS endpoint from your computer or phone:
```bash
curl https://api.yourdomain.com/api/health
```

---

## Step 9: Link the Web Admin Portal (Next.js)

### If Hosting Web on Vercel (Recommended):
1. Go to your **Vercel Dashboard** → Select `sofiya-bangles-web`.
2. Go to **Settings** → **Environment Variables**.
3. Set:
   ```env
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
   ```
4. Click **Save** and trigger a **Redeploy**.
5. Add your custom domain (e.g., `admin.yourdomain.com`) in Vercel **Settings** → **Domains**.

### If Hosting Web on the same Oracle VM:
1. Navigate to `/web`:
   ```bash
   cd /var/www/sofiyaBangles/web
   echo "NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api" > .env.production
   npm ci
   npm run build
   pm2 start npm --name "sofiya-web" -- start
   pm2 save
   ```
2. In `/etc/nginx/sites-available/sofiya-backend`, uncomment the `admin.yourdomain.com` block and run:
   ```bash
   sudo certbot --nginx -d admin.yourdomain.com
   ```

---

## Step 10: Link the Mobile App (Expo / React Native)

1. Open `mobile/.env` in your local project:
   ```env
   EXPO_PUBLIC_API_URL=https://api.yourdomain.com/api
   ```

2. Build production APK / AAB using EAS Build:
   ```bash
   cd mobile
   eas build --platform android --profile production
   ```
   *The Expo app will compile with `EXPO_PUBLIC_API_URL=https://api.yourdomain.com/api` embedded.*

3. If running via Expo Go or local test builds:
   - The app dynamically uses `EXPO_PUBLIC_API_URL`.
   - You can also change the URL at any time inside the app under: **Profile** → **Server Connection** → Enter `https://api.yourdomain.com/api`.

---

## Step 11: Verification & Testing

Verify that all parts communicate smoothly:

1. **Backend Health Check**:
   ```bash
   curl -i https://api.yourdomain.com/api/health
   ```
   Must return HTTP 200 with `status: "ok"`.

2. **CORS Validation**:
   ```bash
   curl -H "Origin: https://admin.yourdomain.com" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: X-Requested-With" \
        -X OPTIONS https://api.yourdomain.com/api/auth/login
   ```
   Must return `Access-Control-Allow-Origin: https://admin.yourdomain.com`.

3. **Rate Limiting & Real IP Check**:
   View PM2 logs to verify real visitor IPs (not `127.0.0.1`):
   ```bash
   pm2 logs sofiya-backend --lines 50
   ```

---

## Step 12: Zero-Downtime Updates & Maintenance

Whenever you push new code to GitHub, update the Oracle VM in one command:

```bash
cd /var/www/sofiyaBangles/backend
./deploy-oracle.sh
```

Or run manually:
```bash
git pull origin main
npm ci
npm run build
pm2 reload sofiya-backend
```

### Useful PM2 Commands:
```bash
pm2 status                  # View CPU, memory, uptime
pm2 logs sofiya-backend     # Stream live backend logs
pm2 restart sofiya-backend  # Restart backend process
pm2 monit                   # Real-time terminal dashboard
```
