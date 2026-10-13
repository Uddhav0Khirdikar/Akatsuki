# Akatsuki login — Crimson Hour

A responsive React/TypeScript login page with an Itachi illustration, layered foliage, a Three.js metal emblem, drifting petals, and a college ERP sign-in flow.

**Run locally**

```sh
cd frontend
npm install
npm run dev
```

Open the printed Vite URL (normally `http://localhost:5173`). Start the Rust backend separately on port 5000 to use real ERP sign-in. Vite proxies `/api` to that backend. For production, serve `/api` through the same origin using a reverse proxy.

```sh
npm run build
npm test
CHROMIUM_PATH=/path/to/chromium npm run test:browser
```

Browser checks need the dev server running. Omit `CHROMIUM_PATH` if Playwright's Chromium is installed. These checks intercept the ERP request with test responses and never submit credentials to the college portal. Browser screenshots are saved under `ui/login/crimson-hour/screenshots/`.

**Scope and behavior**

- `POST /api/auth/erp-login` uses the existing `{ username, password }` contract.
- The page handles required fields, password visibility, duplicate submission, service errors, invalid credentials, and confirmed success.
- A successful login shows the returned campus identity. The dashboard is a separate future screen, so this page does not navigate to an unimplemented destination.
- The returned session remains in React memory; credentials and tokens are not persisted to browser storage. Refreshing clears the session.
- Motion respects the system preference and can be paused from the header. The scene remains usable when WebGL is unavailable.
- Fonts and artwork are served locally. Three.js loads separately from the form.

**Art and design**

See [the selected design direction](../ui/login/crimson-hour/README.md) and [asset provenance](public/assets/README.md). The image-generation API attempt was blocked by exhausted credits. The current hero is sourced artwork, optimized and layered for the page; it is not represented as newly generated art.
