/*
Purpose: Terms of Use for the fake-money demonstration game. Registration
requires explicit acceptance of this document (checkbox, timestamp persisted).
Layer: frontend (player-web), static server component.
*/

import type { Metadata } from "next";
import Link from "next/link";
import "../legal.css";

export const metadata: Metadata = {
  title: "Terms of Use — The Eye in the Sky",
  description: "Terms of Use for The Eye in the Sky demonstration game."
};

const CONTACT_EMAIL = "dimos.is.dev@gmail.com";

export default function TermsPage() {
  return (
    <div className="legalShell">
      <main className="legalDoc">
        <span className="legalKicker">The Eye in the Sky</span>
        <h1>Terms of Use</h1>
        <p className="legalMeta">Version 1.0 — effective July 16, 2026</p>

        <p className="legalNotice">
          <strong>Summary:</strong> this is a free demonstration game. The credits are
          virtual and worth nothing. Nothing here is gambling, nothing can be won or
          cashed out, and the Service is provided as-is, without warranties, for
          entertainment and evaluation only.
        </p>

        <h2>1. Acceptance of these Terms</h2>
        <p>
          These Terms of Use (the &quot;Terms&quot;) govern access to and use of the game
          &quot;The Eye in the Sky&quot; and its related pages and interfaces (the
          &quot;Service&quot;), operated by its owner (the &quot;Operator&quot;), reachable at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. By creating an account you
          confirm that you have read, understood and accepted these Terms and the{" "}
          <Link href="/privacy">Privacy Policy</Link>; acceptance is recorded together with
          your account. If you do not agree, do not use the Service.
        </p>

        <h2>2. Nature of the Service — no gambling, no real money</h2>
        <ul>
          <li>
            The Service is a <strong>free software demonstration</strong> of a slot-game
            platform, provided for entertainment, evaluation and portfolio purposes.
          </li>
          <li>
            All balances, credits, bets, wins and bonuses are <strong>virtual</strong>. They
            have <strong>no monetary value</strong>, cannot be purchased, cannot be redeemed,
            withdrawn, transferred or exchanged for money or anything of value.
          </li>
          <li>
            The Service accepts <strong>no payments and no deposits of real money</strong>{" "}
            and pays out <strong>no winnings or prizes</strong> of any kind.
          </li>
          <li>
            The Service is <strong>not a gambling product</strong> and is not licensed as
            one. Any resemblance to real-money gambling is limited to the game mechanics
            being demonstrated.
          </li>
        </ul>

        <h2>3. Eligibility</h2>
        <p>
          The Service depicts gambling-style content and is intended for persons aged{" "}
          <strong>18 or older</strong>. By using the Service you confirm you are at least 18
          years old. The Operator may suspend accounts reasonably believed to belong to
          minors.
        </p>

        <h2>4. Accounts</h2>
        <ul>
          <li>Registration is optional — guest play is available without an account.</li>
          <li>
            You are responsible for keeping your credentials confidential and for all
            activity under your account.
          </li>
          <li>Provide accurate information; one account per person.</li>
          <li>
            You may stop using the Service at any time and may request deletion of your
            account and data (see the <Link href="/privacy">Privacy Policy</Link>).
          </li>
        </ul>

        <h2>5. Virtual credits</h2>
        <p>
          Virtual credits are a display mechanism of the demonstration. The Operator may
          grant, adjust, reset or remove virtual balances, game history or any other virtual
          item at any time, for any reason, without notice or compensation. Virtual credits
          are forfeited when an account is deleted and are not property of the user.
        </p>

        <h2>6. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>use bots, scripts or other automation against the Service;</li>
          <li>probe, overload, disrupt or attempt to gain unauthorized access to the Service or its infrastructure;</li>
          <li>exploit bugs or manipulate game outcomes, balances or other players&apos; data;</li>
          <li>resell, sublicense or commercially exploit the Service or its content;</li>
          <li>use the Service for any unlawful purpose or misrepresent it as a real-money gambling offering.</li>
        </ul>
        <p>
          The Operator may suspend or terminate access, remove data, and apply technical
          countermeasures (including rate limiting and bot challenges) at its discretion.
        </p>

        <h2>7. Availability, changes and termination</h2>
        <p>
          The Service is a demonstration running on hobby-grade infrastructure. It is
          provided <strong>without any availability commitment</strong>: it may be modified,
          interrupted, reset (including full loss of accounts and game history) or
          permanently discontinued at any time, without notice and without liability. No
          backups, data durability or continuity are promised.
        </p>

        <h2>8. Intellectual property</h2>
        <p>
          The Service — including its software, game mathematics, artwork, names and audio —
          is the property of the Operator and is protected by applicable intellectual
          property laws. Use of the Service grants you no license or ownership rights beyond
          personal, non-commercial play. Commercial use of any part of the Service requires
          a separate written license (see the repository&apos;s LICENSE and for-sale notice).
        </p>

        <h2>9. Third-party services</h2>
        <p>
          The Service is delivered through third-party infrastructure (currently Cloudflare
          for networking, TLS and optional bot protection). Their processing of technical
          data is described in the <Link href="/privacy">Privacy Policy</Link>. The Operator
          is not responsible for third-party networks, browsers or devices.
        </p>

        <h2>10. Disclaimer of warranties</h2>
        <p>
          THE SERVICE IS PROVIDED <strong>&quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;</strong>,
          WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION
          WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, ACCURACY,
          AVAILABILITY, NON-INFRINGEMENT OR ERROR-FREE OPERATION. DISPLAYED STATISTICS
          (INCLUDING RTP FIGURES) DESCRIBE THE DEMONSTRATION MATHEMATICS AND ARE NOT A
          PROMISE OF ANY OUTCOME.
        </p>

        <h2>11. Limitation of liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE OPERATOR SHALL NOT BE
          LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL OR PUNITIVE DAMAGES,
          NOR FOR ANY LOSS OF DATA, VIRTUAL ITEMS, PROFITS OR GOODWILL, ARISING FROM OR
          RELATED TO THE USE OR UNAVAILABILITY OF THE SERVICE. AS THE SERVICE IS PROVIDED
          FREE OF CHARGE, THE OPERATOR&apos;S TOTAL AGGREGATE LIABILITY FOR ANY CLAIM SHALL
          NOT EXCEED <strong>ZERO EUROS (EUR 0)</strong> OR, WHERE A CAP AT ZERO IS NOT
          PERMITTED, THE SMALLEST AMOUNT PERMITTED BY LAW. NOTHING IN THESE TERMS EXCLUDES
          LIABILITY THAT CANNOT BE EXCLUDED UNDER APPLICABLE LAW (INCLUDING LIABILITY FOR
          INTENT OR GROSS NEGLIGENCE).
        </p>

        <h2>12. Indemnification</h2>
        <p>
          You agree to indemnify and hold the Operator harmless from claims, damages and
          expenses (including reasonable legal fees) arising from your breach of these Terms
          or misuse of the Service.
        </p>

        <h2>13. Changes to these Terms</h2>
        <p>
          The Operator may update these Terms at any time by publishing a new version on
          this page with an updated effective date. Continued use of the Service after a
          change constitutes acceptance of the updated Terms.
        </p>

        <h2>14. Governing law and severability</h2>
        <p>
          These Terms are governed by the laws of Greece, without prejudice to mandatory
          consumer protections of your country of residence. If any provision is held
          invalid, the remaining provisions remain in force. The courts of Greece have
          jurisdiction, unless mandatory law provides otherwise.
        </p>

        <h2>15. Contact</h2>
        <p>
          Questions about these Terms: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>

        <nav className="legalFooterNav">
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/">Back to the game</Link>
        </nav>
      </main>
    </div>
  );
}
