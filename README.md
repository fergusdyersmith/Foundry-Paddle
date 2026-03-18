# Foundry Padel

Portland's first indoor padel club — 4 courts, café, and social spaces in Portland.

## Tech Stack

- Vite
- TypeScript
- React
- shadcn/ui
- Tailwind CSS

## Development

```sh
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Deployment (Railway)

The repo contains two apps: the **landing** (root) and the **full site** (in `fullsite/`). To deploy both so the full site is previewable at `/fullsite`:

1. In Railway, point the service at this repo.
2. **Build command:** `npm run build:railway`  
   (Builds the landing, then the fullsite with base `/fullsite/`, then copies fullsite into `dist/fullsite`.)
3. **Start command:** `npm start`  
   (Serves `dist/`: `/` = landing, `/fullsite` = full site.)
4. Set **Root Directory** to the repo root (default).

Result:

- **https://yoursite.up.railway.app/** → landing page  
- **https://yoursite.up.railway.app/fullsite** → full site preview  

When you’re ready to **make the full site the main site** (remove the landing):

- In `server.js`, serve the fullsite app at `/` instead of the landing (e.g. serve `dist/fullsite` for `/` and use the landing only at `/landing` or remove it).
- In the fullsite app, set Vite `base` to `'/'` and update routes/links from `/fullsite/...` to `/...` (or use a single basename and switch it for the new root).
- Redeploy.
