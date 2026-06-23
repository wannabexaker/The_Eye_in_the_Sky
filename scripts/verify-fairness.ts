/*
Provably-fair verifier for The Eye in the Sky.

Given a REVEALED serverSeed (from /player/fairness/rotate), the clientSeed, and a
round's nonce, this reproduces the exact deterministic engine seed and the spin
outcome — proving the server could not have altered the result after committing
to sha256(serverSeed).

Usage (tsx is provided by the api workspace):
  corepack pnpm --filter api exec tsx ../../scripts/verify-fairness.ts <serverSeed> <clientSeed> <nonce> [bet]

The derived seed and the resulting board/win must match the round stored under
that nonce (Round.seedUsed / Round.resultJson). Base-game spins reproduce from a
fresh state; bonus-continuation rounds also require the pre-spin game state.
*/

import { createHmac } from "node:crypto";
import { initialGameState, resolveSpin } from "@eye/game-engine";

const deriveSeed = (serverSeed: string, clientSeed: string, nonce: number): number =>
  createHmac("sha256", serverSeed).update(`${clientSeed}:${nonce}`).digest().readUInt32BE(0) >>> 0;

const [serverSeed, clientSeed, nonceArg, betArg] = process.argv.slice(2);

if (!serverSeed || !clientSeed || nonceArg === undefined) {
  console.error(
    "Usage: corepack pnpm --filter api exec tsx ../../scripts/verify-fairness.ts <serverSeed> <clientSeed> <nonce> [bet]"
  );
  process.exit(1);
}

const nonce = Number(nonceArg);
const bet = Number(betArg ?? 1);

if (!Number.isInteger(nonce) || nonce < 0 || !Number.isFinite(bet) || bet <= 0) {
  console.error("nonce must be a non-negative integer and bet a positive number.");
  process.exit(1);
}

const seed = deriveSeed(serverSeed, clientSeed, nonce);
const result = resolveSpin({ bet, state: initialGameState(1000), seed });

console.log(
  JSON.stringify(
    {
      derivedSeed: seed,
      seedUsed: result.seedUsed,
      roundId: result.roundSummary.roundId,
      mode: result.mode,
      totalWin: result.totalWin,
      initialBoard: result.initialBoard
    },
    null,
    2
  )
);
