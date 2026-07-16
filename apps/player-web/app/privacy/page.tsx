/*
Purpose: Privacy Policy for the fake-money demonstration game. Registration
requires explicit acceptance (checkbox, timestamp persisted).
Layer: frontend (player-web), static server component.
*/

import type { Metadata } from "next";
import Link from "next/link";
import "../legal.css";

export const metadata: Metadata = {
  title: "Privacy Policy — The Eye in the Sky",
  description: "Privacy Policy for The Eye in the Sky demonstration game."
};

const CONTACT_EMAIL = "dimos.is.dev@gmail.com";

export default function PrivacyPage() {
  return (
    <div className="legalShell">
      <main className="legalDoc">
        <span className="legalKicker">The Eye in the Sky</span>
        <h1>Privacy Policy</h1>
        <p className="legalMeta">Version 1.0 — effective July 16, 2026</p>

        <p className="legalNotice">
          <strong>Summary:</strong> the game stores the minimum needed to run a demo
          account — email, display name, a password hash and your game history. No payment
          data, no advertising, no tracking cookies, no selling of data. Guest play stores
          no personal identity at all. You can ask for deletion at any time.
        </p>

        <h2>1. Who is responsible</h2>
        <p>
          The data controller for the Service &quot;The Eye in the Sky&quot; is its operator
          (the &quot;Operator&quot;), contact:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. The Service is a free,
          fake-money software demonstration — see the{" "}
          <Link href="/terms">Terms of Use</Link>.
        </p>

        <h2>2. What we collect</h2>
        <ul>
          <li>
            <strong>Account data</strong> (registered players only): email address, display
            name, and your password stored <strong>only as a cryptographic hash</strong> —
            the actual password is never stored.
          </li>
          <li>
            <strong>Gameplay data</strong>: virtual wallet balance and ledger, game rounds
            and outcomes, session state, fairness seeds (when enabled) and responsible-play
            settings (when enabled). For guests this data lives in your browser or is
            recorded without any personal identity.
          </li>
          <li>
            <strong>Technical data</strong>: server request logs (IP address, request path,
            status, timestamps, a request id) kept for security, rate limiting and abuse
            prevention; consent timestamp for these terms.
          </li>
          <li>
            <strong>Anonymous analytics</strong>: aggregate gameplay statistics (spins,
            wins, RTP trends) used to validate the game mathematics. These are not linked
            to marketing profiles.
          </li>
        </ul>

        <h2>3. What we do not collect</h2>
        <ul>
          <li>No payment or banking data — the Service accepts no money.</li>
          <li>No advertising identifiers, no tracking or marketing cookies.</li>
          <li>No sale or rental of personal data to anyone, ever.</li>
          <li>No profiling and no automated decisions with legal effect.</li>
        </ul>

        <h2>4. Why we process data (legal bases)</h2>
        <ul>
          <li>
            <strong>To provide the Service</strong> (account, wallet, game state) —
            performance of a contract (GDPR art. 6(1)(b)).
          </li>
          <li>
            <strong>Security and abuse prevention</strong> (logs, rate limiting, bot
            challenges) — legitimate interest (art. 6(1)(f)).
          </li>
          <li>
            <strong>Demonstrating and validating the game mathematics</strong> (aggregate
            statistics) — legitimate interest (art. 6(1)(f)).
          </li>
        </ul>

        <h2>5. Cookies</h2>
        <p>
          The Service sets a single <strong>strictly necessary</strong> session cookie
          (<code>eye_auth_session</code>, HTTP-only) used exclusively to keep registered
          players signed in. It is not used for tracking or advertising and expires after at
          most 14 days or on logout. Because it is strictly necessary, no cookie consent
          banner is required. Guest play without an account sets no identity cookie.
        </p>

        <h2>6. Who else processes data</h2>
        <p>
          The Service is self-hosted by the Operator and delivered through{" "}
          <strong>Cloudflare</strong> (network routing, TLS, and — when enabled — the
          Turnstile anti-bot challenge on registration). Cloudflare processes connection
          metadata (such as IP addresses) as an infrastructure provider under its own
          privacy terms. No other third parties receive personal data. Data may transit
          Cloudflare&apos;s global network; Cloudflare participates in standard EU transfer
          safeguards.
        </p>

        <h2>7. Retention</h2>
        <ul>
          <li>Account and gameplay data: for as long as the account exists.</li>
          <li>Server logs: short-lived, rotated automatically with the container runtime.</li>
          <li>
            The Service is a demonstration — data may also be deleted at any time as part
            of resets (see Terms, section 7), which acts as a natural retention limit.
          </li>
        </ul>

        <h2>8. Security</h2>
        <p>
          Passwords are stored only as cryptographic hashes; sessions use HTTP-only cookies
          revocable server-side; transport is encrypted (TLS via Cloudflare); the backend
          applies rate limiting, input validation and security headers. No system is
          perfectly secure — do not reuse a password from another service.
        </p>

        <h2>9. Your rights</h2>
        <p>Under the GDPR you may, at any time and free of charge:</p>
        <ul>
          <li>request access to, or a copy of, your personal data;</li>
          <li>request correction or deletion of your account and data;</li>
          <li>object to or request restriction of processing;</li>
          <li>receive your data in a portable format;</li>
          <li>
            lodge a complaint with a supervisory authority — in Greece, the Hellenic Data
            Protection Authority (<a href="https://www.dpa.gr" rel="noopener noreferrer" target="_blank">dpa.gr</a>).
          </li>
        </ul>
        <p>
          To exercise any right, email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the address linked to
          your account. Account deletion removes your email, display name, password hash and
          personal game history.
        </p>

        <h2>10. Children</h2>
        <p>
          The Service is not directed at persons under 18. Accounts reasonably believed to
          belong to minors will be removed.
        </p>

        <h2>11. Changes</h2>
        <p>
          Updates to this policy are published on this page with a new effective date.
          Material changes will be visible at the registration screen for new acceptances.
        </p>

        <h2>12. Contact</h2>
        <p>
          Privacy questions and requests:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>

        <nav className="legalFooterNav">
          <Link href="/terms">Terms of Use</Link>
          <Link href="/">Back to the game</Link>
        </nav>
      </main>
    </div>
  );
}
