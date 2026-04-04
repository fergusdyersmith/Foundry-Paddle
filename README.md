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
# Install root dependencies (Express server + holding-page app)
npm install

# Holding / launch page (original single-page site)
npm run dev

# Full marketing site (same stack, in fullsite/)
cd fullsite && npm install && npm run dev
```

```sh
# Tests (root or fullsite)
npm test
cd fullsite && npm test
```

## Deployment (Railway)

The repo ships two SPAs: the **full marketing site** (`fullsite/`) at the domain root, and the **holding / launch page** (root `src/`) at **`/launch`**.

1. Point the Railway service at this repo; **Root Directory** = repo root (default).
2. **Build command:** `npm run build:railway`  
   Runs `npm ci` and `npm run build` in `fullsite/`, copies `fullsite/dist` → `dist/`, then builds the holding app with Vite `base: /launch/` into `dist/launch/`.
3. **Start command:** `npm start`  
   Serves `dist/` with Express.

**URLs**

- `https://yoursite.example/` → full marketing site  
- `https://yoursite.example/launch` → holding page (Express may redirect to `/launch/`; both work)  
- `https://yoursite.example/fullsite/...` → **301 redirect** to the same path without `/fullsite` (for old links)
