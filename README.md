# DUDE BROWSER

A desktop-style browser shell with local tabs, bookmarks, history, settings, six playable arcade games, and a guarded Node.js server-side fetch relay.

## Run it

1. Install Node.js 18 or newer on a computer you control.
2. Extract this ZIP.
3. Open a terminal in the extracted `dude-browser` folder.
4. Run:

   ```bash
   npm install
   npm start
   ```

5. Open `http://localhost:3000`.

## Important limits

This is a web application, not a replacement for Chrome or a native desktop browser. A website running inside Chrome cannot take over Chrome's network stack, read the device's download folder, or make every website embeddable. Many sites block iframe embedding, and browser security rules may prevent them from loading.

The backend provides a **guarded server-side HTTP(S) fetch relay** for supported responses. It is not a general-purpose open proxy and does not implement browser-wide HTTPS CONNECT tunneling. It blocks local/private network destinations, restricts ports to 80/443, limits response size, and times out slow requests. It does not bypass school, workplace, website, or network access controls.

For deployment, host the app only on infrastructure you control. Set `PROXY_ALLOWED_HOSTS` to a comma-separated list of domains the relay may fetch, for example:

```bash
PROXY_ALLOWED_HOSTS=example.com,developer.mozilla.org npm start
```

If no allowlist is set, the relay can fetch public hosts but still blocks private/local destinations. For a school-managed device, use only services and websites your school permits. Do not expose the relay publicly without adding authentication, rate limits, logging, and a strict allowlist.

## Features

- Multiple app tabs, back/forward, reload, home, Google search
- Bookmarks and browsing history stored in local browser storage
- Dark/light theme and settings
- Snake, 2048, Tetris, Pong, Breakout, Memory Match
- Backend health/status endpoint and guarded URL fetch endpoint at `/api/proxy?url=https://example.com`

## Known limitations

- Tabs are app-level tabs; website content is displayed in iframes.
- Websites that send anti-embedding headers (such as `X-Frame-Options` or restrictive CSP) will not display inside the app.
- The relay currently returns supported response types but does not rewrite every HTML/CSS/JavaScript resource URL, so complex sites may not work through it.
- Downloads remain under the control of the host browser.
- The app cannot change DNS, system proxy settings, or managed-device policies.
