# Home Assistant Dashboard

A modern, mobile-first PWA dashboard for Home Assistant with a glassmorphic dark theme.

## Features

- **Home View** - AI-powered insights, quick access to pinned entities
- **Rooms** - Devices organized by area with climate info
- **Cameras** - Live streams with Frigate integration
- **Weather** - Current conditions and forecast
- **Calendar** - Upcoming events
- **Cars** - Vehicle tracking (Mercedes, Ford, etc.)
- **Camper** - Victron power system monitoring
- **House Mode** - Scene/mode control

## Tech Stack

- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- PWA with service worker (installable on mobile)

## Prerequisites

- Node.js 18+ (recommended: 20+)
- Home Assistant instance with REST API access
- Long-lived access token from Home Assistant

## Quick Start

### 1. Clone and install dependencies

```bash
git clone <your-repo-url>
cd homeAssistantApp
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Required
VITE_HA_URL=http://your-home-assistant:8123
VITE_HA_TOKEN=your_long_lived_access_token

# Optional
VITE_FRIGATE_URL=http://your-frigate:5000
VITE_CLAUDE_API_KEY=your_claude_api_key
```

### 3. Get your Home Assistant token

1. In Home Assistant, go to **Profile** (click your username)
2. Scroll to **Long-Lived Access Tokens**
3. Click **Create Token**, give it a name
4. Copy the token (you won't see it again!)

### 4. Run development server

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

### 5. Build for production

```bash
npm run build
```

The built files will be in the `dist/` folder.

---

## Deployment Options

### Option 1: Vercel (Recommended for beginners)

Vercel is the easiest way to deploy React/Vite apps.

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and sign up with GitHub
3. Click **New Project** → Import your repository
4. Add environment variables:
   - `VITE_HA_URL` = your Home Assistant URL
   - `VITE_HA_TOKEN` = your access token
   - `VITE_FRIGATE_URL` = (optional) Frigate URL
   - `VITE_CLAUDE_API_KEY` = (optional) Claude API key
5. Click **Deploy**

**Important**: Your Home Assistant must be accessible from the internet (e.g., via Nabu Casa, DuckDNS, or Cloudflare Tunnel) for Vercel-hosted app to work.

### Option 2: Netlify

Similar to Vercel:

1. Push code to GitHub
2. Go to [netlify.com](https://netlify.com) → **Add new site** → **Import an existing project**
3. Select your repository
4. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Add environment variables in **Site settings** → **Environment variables**
6. Deploy

### Option 3: Self-hosted (Same server as Home Assistant)

Best for local network use without exposing HA to the internet.

#### Using nginx

1. Build the app:
   ```bash
   npm run build
   ```

2. Copy `dist/` to your server:
   ```bash
   scp -r dist/ user@server:/var/www/ha-dashboard/
   ```

3. Create nginx config (`/etc/nginx/sites-available/ha-dashboard`):
   ```nginx
   server {
       listen 80;
       server_name dashboard.local;  # or your domain
       root /var/www/ha-dashboard;
       index index.html;
       
       # Handle SPA routing
       location / {
           try_files $uri $uri/ /index.html;
       }
       
       # Cache static assets
       location /assets/ {
           expires 1y;
           add_header Cache-Control "public, immutable";
       }
   }
   ```

4. Enable the site:
   ```bash
   sudo ln -s /etc/nginx/sites-available/ha-dashboard /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

#### Using Docker

1. Create `Dockerfile`:
   ```dockerfile
   FROM node:20-alpine AS builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   ARG VITE_HA_URL
   ARG VITE_HA_TOKEN
   ARG VITE_FRIGATE_URL
   ARG VITE_CLAUDE_API_KEY
   RUN npm run build

   FROM nginx:alpine
   COPY --from=builder /app/dist /usr/share/nginx/html
   COPY nginx.conf /etc/nginx/conf.d/default.conf
   EXPOSE 80
   CMD ["nginx", "-g", "daemon off;"]
   ```

2. Create `nginx.conf`:
   ```nginx
   server {
       listen 80;
       root /usr/share/nginx/html;
       index index.html;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
       
       location /assets/ {
           expires 1y;
           add_header Cache-Control "public, immutable";
       }
   }
   ```

3. Build and run:
   ```bash
   docker build \
     --build-arg VITE_HA_URL=http://homeassistant:8123 \
     --build-arg VITE_HA_TOKEN=your_token \
     -t ha-dashboard .
   
   docker run -d -p 3000:80 ha-dashboard
   ```

### Option 4: Home Assistant Add-on / Ingress

You can serve this as a panel in Home Assistant:

1. Build the app
2. Copy to `/config/www/dashboard/` in Home Assistant
3. Add to `configuration.yaml`:
   ```yaml
   panel_iframe:
     dashboard:
       title: "Dashboard"
       icon: mdi:view-dashboard
       url: "/local/dashboard/index.html"
   ```

---

## Network Considerations

### Local Network Only
If your Home Assistant is only on your local network:
- Deploy the dashboard on the same network (self-hosted option)
- Access via local IP or hostname

### Remote Access
If you need to access from outside your home:
- Use [Nabu Casa](https://www.nabucasa.com/) (easiest, supports HA)
- Set up a reverse proxy with SSL (nginx + Let's Encrypt)
- Use Cloudflare Tunnel (free, no port forwarding)

---

## PWA Installation

This app is a Progressive Web App and can be installed on mobile devices:

### iOS (Safari)
1. Open the dashboard URL in Safari
2. Tap the Share button
3. Tap "Add to Home Screen"

### Android (Chrome)
1. Open the dashboard URL in Chrome
2. Tap the menu (three dots)
3. Tap "Add to Home Screen" or "Install App"

---

## Troubleshooting

### "Home Assistant is not configured"
- Check that `VITE_HA_URL` and `VITE_HA_TOKEN` are set
- Ensure the URL is accessible from where the app is running

### CORS errors
- If running locally, the Vite dev server proxies requests automatically
- In production, ensure your HA instance allows requests from your domain

### Camera streams not working
- Frigate: Set `VITE_FRIGATE_URL` 
- HA cameras: The app uses the built-in camera proxy

### PWA not updating
- Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
- Clear service worker: DevTools → Application → Service Workers → Unregister

---

## Development

```bash
# Start dev server
npm run dev

# Type check
npx tsc --noEmit

# Build for production
npm run build

# Preview production build
npm run preview
```

## License

MIT
