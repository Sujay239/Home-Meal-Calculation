# Cloudflare Worker Proxy - Deployment Guide

This proxy fixes the "Network Error" that happens on most Indian mobile networks (Jio, Airtel, Vi, BSNL) because they block `*.gamer.gd` domains at the DNS level.

## How it works

```
📱 App → ☁️ Cloudflare Worker (workers.dev) → 🖥️ InfinityFree (gamer.gd)
```

The app talks to `your-worker.workers.dev` (never blocked by ISPs) instead of `kolkata-room.gamer.gd` (blocked). The Worker transparently relays all requests to your InfinityFree server.

## Deployment Steps (5 minutes, 100% free)

### Step 1: Create Cloudflare Account
1. Go to [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)
2. Sign up with email (no credit card needed)

### Step 2: Create a Worker
1. In the Cloudflare Dashboard, click **"Workers & Pages"** in the left sidebar
2. Click **"Create"** button
3. Click **"Create Worker"**
4. Give it a name like `meal-api-proxy` (your URL will be `meal-api-proxy.YOUR_SUBDOMAIN.workers.dev`)
5. Click **"Deploy"**

### Step 3: Paste the Code
1. After deploying, click **"Edit Code"**
2. Delete all the default code in the editor
3. Open the file `proxy/worker.js` from this project
4. Copy ALL the code and paste it into the Cloudflare editor
5. Click **"Deploy"** (top right)

### Step 4: Test it
1. Visit your Worker URL in a browser: `https://meal-api-proxy.YOUR_SUBDOMAIN.workers.dev`
2. You should see the InfinityFree challenge page or the API status page
3. That confirms it's working!

### Step 5: Update the App
1. Copy your full Worker URL (e.g., `https://meal-api-proxy.xpritamjoarder.workers.dev`)
2. Open `src/services/api.ts`
3. Replace the `API_BASE_URL` value with your Worker URL
4. Rebuild the APK with `eas build -p android --profile preview`

## Free Tier Limits
- **100,000 requests/day** (more than enough for a small group app)
- **10ms CPU time per request** (our proxy uses ~1ms)
- No cold starts, always fast

## Troubleshooting
- If you see `502` errors, the InfinityFree server might be down temporarily
- The challenge cookie is still handled by the app's `challengeSolver.ts`
- All your backend PHP code stays exactly the same, nothing to change server-side
