# Olamov iframe integration

## Player URL
Use the player URL with embed mode enabled:

```html
<iframe
  src="https://<player-host>/?embed=1"
  title="The Eye in the Sky"
  allow="fullscreen; screen-wake-lock"
  referrerpolicy="strict-origin-when-cross-origin"
  loading="lazy"
></iframe>
```

`?embed=1` trims the player shell for iframe use while keeping the existing `/_api` proxy and cookie-session model unchanged.

## Frame policy
`player-web` sends a runtime CSP header with:

```http
Content-Security-Policy: frame-ancestors 'self' https://olamov.com https://*.olamov.com
```

Override `PLAYER_FRAME_ANCESTORS` only when a staging parent origin is required.

## Cookie policy
For iframe login on HTTPS deployments, set:

```env
COOKIE_SECURE=true
```

When enabled, the API emits auth cookies as `SameSite=None; Secure`. Without it, local/dev cookies remain `SameSite=Lax` so plain HTTP development keeps working.

## Browser risk
Chrome and Safari may block third-party cookies even when `SameSite=None; Secure` is set. If iframe login fails in those browsers, use a top-level login handoff or platform token exchange as the fallback path instead of changing the player proxy/session model.
