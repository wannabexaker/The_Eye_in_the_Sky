import assert from "node:assert/strict";
import test from "node:test";
import type { SymbolId } from "@eye/game-engine";
import {
  FLOATING_TEXT_FADE_MS,
  FLOATING_TEXT_HOLD_MS,
  getFloatingTextAlpha,
  isDefaultAshenBoard,
  shouldSuppressBoardDropAnimation
} from "./board-animation-rules";

const buildBoard = (symbol: SymbolId): SymbolId[][] =>
  Array.from({ length: 5 }, () => Array.from({ length: 6 }, () => symbol));

test("isDefaultAshenBoard returns true only for full ashen board", () => {
  const ashenBoard = buildBoard("ashen_sigil");
  const mixedBoard = buildBoard("ashen_sigil");
  mixedBoard[2][3] = "burning_crown";

  assert.equal(isDefaultAshenBoard(ashenBoard), true);
  assert.equal(isDefaultAshenBoard(mixedBoard), false);
});

test("shouldSuppressBoardDropAnimation only in IDLE + default ashen board", () => {
  const ashenBoard = buildBoard("ashen_sigil");
  const nonDefaultBoard = buildBoard("wild");

  assert.equal(shouldSuppressBoardDropAnimation(ashenBoard, "IDLE"), true);
  assert.equal(shouldSuppressBoardDropAnimation(ashenBoard, "SPIN_START"), false);
  assert.equal(shouldSuppressBoardDropAnimation(nonDefaultBoard, "IDLE"), false);
});

test("getFloatingTextAlpha holds full opacity and fades to zero on schedule", () => {
  assert.equal(getFloatingTextAlpha(0), 1);
  assert.equal(getFloatingTextAlpha(FLOATING_TEXT_HOLD_MS), 1);

  const halfwayFade = getFloatingTextAlpha(
    FLOATING_TEXT_HOLD_MS + FLOATING_TEXT_FADE_MS / 2
  );
  assert.ok(halfwayFade < 0.6 && halfwayFade > 0.4, `Unexpected midpoint alpha: ${halfwayFade}`);

  assert.equal(getFloatingTextAlpha(FLOATING_TEXT_HOLD_MS + FLOATING_TEXT_FADE_MS), 0);
  assert.equal(getFloatingTextAlpha(FLOATING_TEXT_HOLD_MS + FLOATING_TEXT_FADE_MS + 1000), 0);
});
