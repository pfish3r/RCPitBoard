# RCPitBoard

A standalone LiveRC race-day display for Debian 12/13. Keeps the exported board interface, race order, driver highlighting, live results, estimated positions, themes, scrolling and browser audio announcements. Uses Node.js 24 and Docker Compose. No Base44 account, SDK or backend is required.

## Install on Debian

Install Docker Engine and its Compose plugin using the official Debian instructions:
https://docs.docker.com/engine/install/debian/

Install Git, then clone this public repository using HTTPS. No GitHub key or token is needed.

```bash
sudo apt update
sudo apt install -y git
git clone https://github.com/pfish3r/RCPitBoard.git
cd RCPitBoard
bash scripts/setup.sh
```

Run these scripts as the checkout owner. They use sudo for Docker only when needed, so Git keeps using your account. Setup creates an untracked .env with the port and bind address. No email or password is requested. Setup builds the image, tests the server and starts the app on port 8080. It restarts after a server reboot.

Open http://SERVER-IP:8080. Open /admin directly to set the track URLs, scrolling speed and refresh interval. The board and track settings need no account. Anyone who can reach the app can change settings. Defaults are the original export's Larry's Performance RC Offroad URLs; configure your preferred track before use. Use HTTPS URLs belonging to the same TRACK.liverc.com hostname.

## Update from GitHub

```bash
cd RCPitBoard
bash scripts/update.sh
```

The script fetches origin/main and fast-forwards your checkout, builds an image tagged with the commit SHA, then deploys and checks container health. It refuses local code changes or divergent history. A build failure leaves the old container running. A failed deployment attempts to restore the previously running image. Settings and .env are preserved. The source checkout remains at the fetched commit after a failure so you can diagnose and retry. This is a manual update script, not a scheduled updater.

Run Git operations as the checkout owner. If sudo reports a Git ownership warning, give your login user Docker access through the normal server administration process, then run the scripts without sudo; do not disable Git ownership checks globally.

## Administration

```bash
sudo docker compose ps
sudo docker compose logs --tail=100 app
sudo docker compose restart app
sudo docker compose down
```

To change the port, edit HTTP_PORT in .env and run docker compose up -d. The server listens on container port 3000. Default host port 8080 avoids existing services on 443. Existing .env files remain valid. ADMIN_EMAIL, ADMIN_PASSWORD and COOKIE_SECURE from older installations are ignored and can be removed.

For access outside your LAN, put an HTTPS reverse proxy or Cloudflare Tunnel in front. Settings are open to everyone who can access the app; use access controls at your proxy if you need to restrict who can change them. When the proxy runs on this same host, set BIND_ADDRESS=127.0.0.1 to restrict the published port to loopback. If the proxy is a separate container, connect it to the Compose network and use app:3000, or configure host access deliberately.

Track settings are stored in the Docker volume rcpitboard_rcpitboard-data. docker compose down keeps it; docker compose down -v deletes it. Back up the settings volume and .env before moving servers. No Base44 user accounts or saved settings are included in the source export.

## Development without Docker

Requires Node.js 24 or later and npm.

```bash
npm ci
npm test
npm run build
cp .env.example .env
npm start
```

For frontend development run npm start and npm run dev in separate terminals. Vite proxies /api to localhost:3000. The production server serves only dist and the API, never source files or .env.

## Validation and limitations

Automated tests cover startup and settings changes without credentials, persistence across restart, shared snapshot caching, URL validation and static-file isolation, plus the retained heat-sheet and results parsers. GitHub Actions runs tests and the frontend build on Linux. The Docker build also runs the tests before producing its runtime image.

The development session could not download npm packages or open network connections. Backend handler tests run locally; GitHub Actions verifies the frontend build and Docker startup. The actual LiveRC feed and browser playback still need verification on the Debian server. LiveRC parsing and legacy Socket.IO polling are retained from the supplied export. Upstream HTML/feed changes can require parser updates. External track requests time out and failed reads surface on the board. LiveRC access is still required; this is not an offline timing system. Audio voices and autoplay behaviour depend on the browser.
