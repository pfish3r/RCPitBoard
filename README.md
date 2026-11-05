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

Run these scripts as the checkout owner. They use sudo for Docker only when needed, so Git keeps using your account. Setup creates an untracked .env with the port and bind address. No email or password is requested. Setup builds the image, tests the server and starts HTTP on port 80 plus an HTTPS proxy on port 443. It detects the first LAN IPv4 address for the local HTTPS certificate; set HTTPS_HOST in .env if you use a different address or hostname. It restarts after a server reboot.

Open http://SERVER-IP or https://SERVER-IP. Open /admin directly to set the track URLs, scrolling speed and refresh interval. The board and track settings need no account. Anyone who can reach the app can change settings. Defaults are the original export's Larry's Performance RC Offroad URLs; configure your preferred track before use. Use HTTPS URLs belonging to the same TRACK.liverc.com hostname.

## Update from GitHub

```bash
cd RCPitBoard
git pull --ff-only origin main
bash scripts/update.sh
```

The script fetches origin/main and fast-forwards your checkout, builds an image tagged with the commit SHA, then deploys and checks container health. It refuses local code changes or divergent history. A build failure leaves the old container running. A failed deployment attempts to restore the previously running image. Settings and existing .env values are preserved; HTTPS_HOST is added only if missing. The source checkout remains at the fetched commit after a failure so you can diagnose and retry. This is a manual update script, not a scheduled updater.

Run Git operations as the checkout owner. If sudo reports a Git ownership warning, give your login user Docker access through the normal server administration process, then run the scripts without sudo; do not disable Git ownership checks globally.

## Administration

Use **Pause board** in `/admin` during a break. This freezes the shared race data and countdowns on every screen and mutes announcements. Screens pick up the change within a few seconds. **Resume board** fetches fresh timing data and continues the countdowns. Pause status and the frozen display survive a container restart. This controls the pit board only; LiveRC continues recording races.

```bash
sudo docker compose ps
sudo docker compose logs --tail=100 app
sudo docker compose restart app
sudo docker compose down
```

HTTP_PORT (default 80) and HTTPS_PORT (default 443) control the two published ports. HTTPS_HOST is the single IP address or hostname used in the certificate, without a URL scheme or port. Existing HTTP_PORT values, including 8080, are kept. Use bash scripts/update.sh after changing .env so the running image tag is preserved. The app listens on container port 3000; the Caddy HTTPS proxy listens internally on 8443. Existing .env files remain valid. ADMIN_EMAIL, ADMIN_PASSWORD and COOKIE_SECURE from older installations are ignored and can be removed.

For access outside your LAN, put an HTTPS reverse proxy or Cloudflare Tunnel in front. Settings are open to everyone who can access the app; use access controls at your proxy if you need to restrict who can change them. When the proxy runs on this same host, set BIND_ADDRESS=127.0.0.1 to restrict the published port to loopback. If the proxy is a separate container, connect it to the Compose network and use app:3000, or configure host access deliberately.

Track settings are stored in the Docker volume rcpitboard_rcpitboard-data. docker compose down keeps it; docker compose down -v deletes it. Back up the settings volume and .env before moving servers. No Base44 user accounts or saved settings are included in the source export.

## HTTPS on your LAN

Docker Compose runs one additional `https` container using Caddy. HTTP remains available and is not redirected. HTTPS uses a locally issued certificate for `HTTPS_HOST`, with automatic renewal; no public DNS or internet certificate challenge is needed. Certificates and the local CA are stored in `rcpitboard_rcpitboard-caddy-data` and survive updates/reboots. Do not delete that volume unless you intend to replace the CA. The accompanying config volume is `rcpitboard_rcpitboard-caddy-config`.

Browsers will warn until you trust this CA. Copy its **public** root certificate from your own server, then install it in the trusted root store on each viewing device using your normal administration process:

```bash
docker compose cp https:/data/caddy/pki/authorities/local/root.crt ./rcpitboard-root.crt
```

Only copy `root.crt`; keep private CA keys in the Docker volume. For a publicly trusted certificate, use your existing HTTPS reverse proxy or configure a public-domain deployment separately. If 443 is already occupied, choose another HTTPS_PORT or use the existing proxy.

Check both listeners (replace SERVER-IP with HTTPS_HOST). The HTTPS check validates the certificate against the copied CA:

```bash
curl --fail http://SERVER-IP/api/health
curl --fail --cacert ./rcpitboard-root.crt https://SERVER-IP/api/health
docker compose logs --tail=100 https
```

If the VM's address changes, update HTTPS_HOST and redeploy. HTTPS_HOST defaults to localhost when running Compose directly without the setup/update scripts; set it to the address used by your clients first. To serve multiple aliases, customize Caddy's certificate/site configuration.

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

## Race display and TV mode

Race order spans the top of the desktop board as two rows of five broadcast-style cards. Each card shows race number, full class name (up to two lines), heat, estimated start and countdown. The current race is highlighted in lime and next up in red. Smaller panels show fewer cards per page. Race pages advance every 15 seconds in TV mode. Live results is a table below on the left, showing position, driver, last lap, best lap, laps and pace. It pages through the full field every 10 seconds and snaps back to the first page. Estimated positions is below on the right during qualifying. During finals, live results spans the full bottom width. Partial race pages expand the cards to fill each row. Light mode uses pale cards with dark text and green values; dark mode uses charcoal cards with white text and yellow values. Start times are estimates, not an official timetable.

The server learns the median turnaround from up to nine adjacent race transitions in the same meeting, combining it with each published race length. Until it has a usable sample it uses a two-minute gap. Pauses, skipped heats, extended outages and gaps over ten minutes are excluded. Samples are shared by every screen, saved in the data volume, and reset when the track or meeting changes. Polling and LiveRC clock accuracy limit the precision.

The feed status shows when live timing was last received. A failed live feed, incomplete race order, stale response or a racing clock that stops advancing suspends countdown estimates and mutes announcements. Last known race data remains labelled until timing recovers. A stationary feed while staging or finished is normal and does not trigger the racing-clock warning. Intentional admin pause still freezes the display.

Use **TV mode** in the header for fewer controls and the active round. Smaller screens stack race order, live results and estimated positions vertically. If no projections are published, estimated positions shows a waiting message. The mode is remembered on that browser and can also be opened with `/?tv=1`. Use the adjacent fullscreen button to fill the display; browser permission may be required. Exit TV restores the normal controls. Fullscreen must be entered manually after a reload.

## Validation and limitations

Automated tests cover startup and settings changes without credentials, persistence across restart, shared snapshot caching, URL validation and static-file isolation, plus the retained heat-sheet and results parsers. GitHub Actions runs tests and the frontend build on Linux. The Docker build also runs the tests before producing its runtime image.

The development session could not download npm packages or open network connections. Backend handler tests run locally; GitHub Actions verifies the frontend build and Docker startup. The actual LiveRC feed and browser playback still need verification on the Debian server. LiveRC parsing and legacy Socket.IO polling are retained from the supplied export. Upstream HTML/feed changes can require parser updates. External track requests time out and failed reads surface on the board. LiveRC access is still required; this is not an offline timing system. Audio voices and autoplay behaviour depend on the browser.

The race order uses compact rows and pages sized to the available screen height. Pages advance every 15 seconds; use the arrows to look ahead or Next up to return. Hovering or focusing the list pauses page changes, and manual navigation holds the selected page for 30 seconds. In TV mode, pages always advance every 15 seconds and loop back to the beginning, even if the pointer rests over the list or a page button has focus. Outside TV mode, reduced-motion browsers use manual paging.



Estimated positions uses whole pages that advance every 10 seconds, with manual arrows, so the first and last rows remain fully visible. Projected lap/time values retain milliseconds; notes such as DNF appear below the time in a wider column. Existing text sizes are retained.

Default text is rendered at 80% of the previous font sizes, without scaling panel spacing or controls. Race-order start times and countdowns use larger base sizes so they remain more prominent after that reduction.

## Configurable display layouts

Admin includes six split-screen presets plus full-screen rotation. The split-screen views are: race order on top, bottom, left or right, three columns, and three horizontal bands. Drag the two dividers in the layout preview, use their arrow keys (Shift for larger steps), or adjust the split sliders. Each panel has an independent 50–150% font slider; 100% preserves the current default. Save settings applies the selected layout and text sizes to every board on its next refresh, including paused boards. Settings survive server/container restarts. Reset display defaults changes the form only until saved. Light/dark preview uses the existing browser theme. Narrow screens stack the panels. Very small panels allow scrolling; larger fonts reduce rows per page. Finals can optionally expand live results into the estimated-positions space.

Choose **Full-screen rotation** to cycle Live results, Estimated positions, then Race order. Set a separate 5–120 second duration for each screen in Admin and save. Each screen starts on its first page when it appears; long fields still page automatically while visible. A next-screen button advances immediately. Rotation also continues while race data is paused; the data itself stays frozen. The finals expansion option applies to split layouts, while rotation always includes all three screens.

TV mode, browser full-screen and full-screen rotation always keep a current/next race strip above the panels. It shows the active race, estimated remaining time and finish clock, plus the next race start clock and countdown. Estimates hide on stale timing and stay frozen during admin pause. The strip uses the active round even when another round is selected.

Race cards keep the class name on one compact top line with an ellipsis and the full name in its tooltip. Heat appears below the name. Estimated start and countdown occupy the main two-column card area and scale to the available card width and height.

Race order now uses full-width horizontal rectangles: race number, class and heat on the left, with estimated start and countdown side by side on the right. The number of rows per page adapts to panel height and font size. Automatic paging and all display presets remain available.
