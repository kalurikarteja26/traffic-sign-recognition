# 🚀 AeroVision Cloud Deployment Guide
## Split Cloud Architecture: Vercel / Netlify (Frontend) + Render / Railway (Backend API)

This guide walks you through deploying the complete AeroVision Full-Stack Road Safety Platform to production using modern cloud platforms.

```
                           +----------------------------+
                           |       End Users            |
                           +--------------+-------------+
                                          |
                                          v
                    +------------------------------------------+
                    |        Frontend (React 19 + Vite)        |
                    |           Deployed on VERCEL             |
                    |     (or Netlify Global Edge CDN)         |
                    +---------------------+--------------------+
                                          |
                               API Calls  | (HTTPS)
                                          v
                    +------------------------------------------+
                    |         Backend API & Perception         |
                    |          FastAPI + PyTorch Model         |
                    |          Deployed on RENDER              |
                    |     (or Railway Docker Container)        |
                    +---------------------+--------------------+
                                          |
                                          v
                              Persistent Cloud Storage
                             (SQLite / Postgres + Disks)
```

---

## 📋 Pre-Deployment Checklist

Before deploying, ensure your latest code is committed and pushed to your GitHub or GitLab repository:

```bash
git add .
git commit -m "feat: configure cloud deployment for Vercel and Render/Railway"
git push origin main
```

---

## 🛠️ Step 1: Deploy Backend API (Render or Railway)

You must deploy the backend first so you have its public HTTPS URL to connect the frontend.

### Option A: Deploy on Render (Recommended)

1. Sign in to [Render.com](https://render.com/).
2. Click **New +** -> **Web Service**.
3. Connect your Git repository (`traffic-sign-recognition`).
4. Configure the settings:
   - **Name**: `aerovision-api`
   - **Language / Runtime**: **Docker** (Render will automatically detect the root [`Dockerfile`](Dockerfile))
   - **Region**: Choose the closest region (e.g., Oregon or Frankfurt)
   - **Instance Type**: **Starter** (recommended for running PyTorch MobileNetV2 with 512MB–1GB RAM)
5. **Environment Variables**:
   Add the following variables in the **Environment** tab:
   - `ENVIRONMENT` = `production`
   - `AEROVISION_SECRET_KEY` = *(click "Generate" or provide a 32-character random string)*
   - `CORS_ORIGINS` = `["*"]`
6. *(Optional)* **Persistent Disk**:
   - In **Disks**, add a disk named `aerovision-uploads` mounted at `/app/uploads` (Size: 5 GB to 10 GB) so dashcam video uploads and database records persist across restarts.
7. Click **Create Web Service**.
8. Once the build finishes, copy your live backend URL (e.g., `https://aerovision-api.onrender.com`).

---

### Option B: Deploy on Railway

1. Sign in to [Railway.app](https://railway.app/).
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Select this repository.
4. Railway will automatically detect the [`railway.json`](railway.json) and [`Dockerfile`](Dockerfile).
5. In **Variables**, add:
   - `ENVIRONMENT` = `production`
   - `AEROVISION_SECRET_KEY` = `your_secure_secret_key`
6. In **Settings** -> **Networking**, click **Generate Domain**.
7. Copy your public Railway URL (e.g., `https://aerovision-production.up.railway.app`).

---

## 🌐 Step 2: Deploy Frontend (Vercel or Netlify)

### Option A: Deploy on Vercel (Recommended)

1. Sign in to [Vercel.com](https://vercel.com/).
2. Click **Add New...** -> **Project**.
3. Import your Git repository.
4. Configure Project Settings:
   - **Framework Preset**: **Vite**
   - **Root Directory**: Click "Edit" and select `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. **Environment Variables**:
   Expand the **Environment Variables** section and add:
   - `VITE_API_URL` = `https://your-backend-url.onrender.com/api`
     *(replace with your actual backend URL from Step 1, with `/api` at the end)*
   - *(Optional)* `VITE_GOOGLE_MAPS_API_KEY` = `your_google_maps_key`
6. Click **Deploy**.
7. Vercel will build and deploy the React 19 app to a global CDN within 30 seconds!

---

### Option B: Deploy on Netlify

1. Sign in to [Netlify.com](https://app.netlify.com/).
2. Click **Add new site** -> **Import an existing project**.
3. Connect your GitHub repository.
4. Configure Build settings:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`
5. In **Site configuration** -> **Environment variables**, add:
   - `VITE_API_URL` = `https://your-backend-url.onrender.com/api`
6. Click **Deploy site**.

---

## 🧪 Step 3: Verify the Live Deployment

Once both services are active:

1. Open your Vercel/Netlify URL (e.g., `https://aerovision.vercel.app`).
2. Log in using the pre-seeded demo credentials:
   - **Driver Account**:
     - **Email**: `driver@aerovision.ai`
     - **Password**: `password123`
   - **Admin Account**:
     - **Email**: `admin@aerovision.ai`
     - **Password**: `admin123`
3. Test key workflows:
   - **Vehicle Garage**: View the pre-loaded Tata Nexon EV and HSRP number plate.
   - **Traffic Rules Catalog**: Browse the 108 Indian RTO regulatory signs.
   - **AI Studio**: Test a sample traffic sign image or frame prediction.
   - **Navigation & Audio**: Ensure multi-language voice alerts (EN / TE / HI) synthesize properly.

---

## 🔒 Security Best Practices for Production

1. **Change Default Credentials**:
   - Change the passwords for `driver@aerovision.ai` and `admin@aerovision.ai` via Profile Settings or register new individual accounts.
2. **PostgreSQL Database**:
   - For high concurrency, provision a managed PostgreSQL database (Render Postgres or Railway Postgres) and set `DATABASE_URL=postgresql://user:password@host:5432/dbname`.
3. **Restrict CORS in Production**:
   - Once your Vercel domain is known, set `CORS_ORIGINS=["https://your-domain.vercel.app"]` in your backend environment variables to lock down API access to your frontend domain only.

