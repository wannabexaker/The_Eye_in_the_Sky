# Changelog

Notable changes to The Eye in the Sky. Versions are git tags; images on GHCR
carry the same tags. Dates use the tag's commit date.

## v0.2.1 — dependency security patch

### Security
- Cleared the high/critical advisories that began failing the CI dependency
  audit (code unchanged): `next` 15.5.18 → 15.5.28 (two critical RCEs,
  SSRF/DoS), `sharp` 0.35.5, and pnpm overrides for `proxy-addr`,
  `@xmldom/xmldom`, `js-yaml`, `nanoid`, `postcss`, `source-map-js`.
  Production audit: 0 critical, 0 high.

### Added (shipped between v0.2.0 and v0.2.1)
- Terms of Use and Privacy Policy pages; acceptance required on register,
  login and guest entry, enforced server-side for accounts and recorded as
  `User.acceptedTermsAt`. Legal links in the in-game menu.

## v0.2.0 — ready-to-sell hardening

### Added
- **Test depth for flag-locked features**: ~90 new API tests (181 total) —
  provably-fair crypto vectors, Turnstile failure matrix, fairness seed
  lifecycle, RG enforcement matrix, flagged-endpoint e2e, and a
  real-engine integration suite proving server spins reproduce from revealed
  commit-reveal inputs.
- **Math audit pack**: `docs/MATH_SPEC.md` (RNG spec, audit contract,
  regression bands, change control) + reproducible PAR reports per math
  profile (`docs/par/`, generator: `pnpm par-report`).
- **Observability**: structured JSON request logs with `X-Request-Id`
  correlation, Prometheus `/metrics` (route-template labels),
  `/health/live` + `/health/ready` probes, Grafana dashboard and alert rules
  in `docs/observability/`.
- **Multi-game lobby**: `/lobby` route rendering a typed platform game
  registry (live title, Constellation variant, locked coming-soon slots).
- **Operator docs**: `docs/OPERATOR_GUIDE.md`, `docs/DEPLOYMENT.md`.

### Security
- API hardened with helmet; Swagger and `/metrics` opt-in for production.
- Security headers on both web apps (nosniff, referrer-policy,
  permissions-policy; admin denies all framing).
- Dependency posture: 0 known high/critical production advisories
  (Next 15.5.18, NestJS 11 patched line, pinned transitive overrides) with a
  CI audit job that fails on new high/critical findings.

## v0.1.15 — provably-fair player frontend
- Fairness panel in the player menu (commitment hash, client seed, rotation
  with server-seed reveal) and server-spin routing for authenticated
  sessions when `PROVABLY_FAIR_ENABLED=true`.

## v0.1.14 — guest→account, responsible gambling, provably-fair backend
- Guest sessions can convert to full accounts without losing state.
- Responsible-gambling toolkit (deposit/loss/session limits, cool-off,
  self-exclusion) behind `RG_TOOLS_ENABLED`, enforced transactionally.
- Server-authoritative provably-fair spin path (commit-reveal seeds,
  per-round commitments) behind `PROVABLY_FAIR_ENABLED`.

## v0.1.13 — registration protection
- Cloudflare Turnstile on registration (server-side siteverify), inert when
  unconfigured; visible widget errors with retry in the auth overlay.

## v0.1.12 — guest mode on live
- Public demo plays instantly as guest; API-offline guest fallback.

## v0.1.11 — ritual log & session analytics
- Round history log and one-tap session analytics (RTP trend, win
  distribution, cascade histogram, CSV export) for guests and accounts.

## v0.1.10 — tablet & responsive layouts
- Dedicated grids for phone portrait, tablet, near-square and landscape.

## v0.1.0 – v0.1.9 — core product line
- Deterministic cluster-cascade engine with locked math baseline v2.0,
  simulation harness and CI regression bands.
- PixiJS 8 presentation (win choreography, bonus flow, audio), Next.js shell.
- NestJS API: cookie-session auth, wallet + ledger, rounds, analytics,
  admin math-profile selection with audit trail.
- Multi-arch (amd64/arm64) Docker images via GitHub Actions → GHCR;
  reference deployment on Raspberry Pi 4 behind a Cloudflare tunnel.
