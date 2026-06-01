# Olamov Embed Integration

## Preferred approach
Use iframe embedding from the existing Eye deployment:

```html
<iframe
  src="https://eye.olamov.com/?embed=1"
  title="The Eye in the Sky"
  allow="fullscreen; screen-wake-lock"
  style="width: 100%; aspect-ratio: 16 / 9; border: 0;"
></iframe>
```

## Runtime contract
- `eye.olamov.com` remains the canonical game build.
- `?embed=1` marks the player shell with `data-embed="1"` and hides the right branding rail so olamov.com chrome does not duplicate game branding.
- Player-web sends `Content-Security-Policy: frame-ancestors 'self' https://*.olamov.com https://olamov.com`.
- API CORS allows `https://olamov.com` and `https://eye.olamov.com`.
- Auth cookies use `SameSite=None; Secure` when `COOKIE_SECURE=true`; this is required for cross-site iframe login.
- Player API calls already use `credentials: "include"`.

## Test page
Use this on olamov.com for deployment verification:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Eye Embed Test</title>
  </head>
  <body style="margin: 0; background: #050507;">
    <iframe
      src="https://eye.olamov.com/?embed=1"
      title="The Eye in the Sky"
      allow="fullscreen; screen-wake-lock"
      style="display: block; width: 100vw; height: 100dvh; border: 0;"
    ></iframe>
  </body>
</html>
```

## Fallback
Reverse proxying under `https://olamov.com/play/eye` is the fallback only if iframe embedding is rejected by product or hosting constraints. Do not implement that path without a separate decision.
