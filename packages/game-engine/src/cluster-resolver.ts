import type { CascadeWin, ClusterCell, GameConfig, SymbolId } from "./types";

const directions = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1]
];

const isMatchingSymbol = (origin: SymbolId, candidate: SymbolId): boolean => {
  if (candidate === "wild") {
    return true;
  }

  return candidate === origin;
};

const payoutForCluster = (
  config: GameConfig,
  symbol: SymbolId,
  size: number
): number => {
  const entry = config.paytable.find((item) => item.symbol === symbol);
  if (!entry) {
    return 0;
  }

  const sortedThresholds = Object.keys(entry.payouts)
    .map(Number)
    .sort((a, b) => a - b);

  let payout = 0;
  for (const threshold of sortedThresholds) {
    if (size >= threshold) {
      payout = entry.payouts[threshold] ?? payout;
    }
  }

  return payout;
};

export const resolveClusters = (
  board: SymbolId[][],
  config: GameConfig,
  bet: number
): CascadeWin[] => {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const visited = new Set<string>();
  const wins: CascadeWin[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const symbol = board[row][col];
      const key = `${row}:${col}`;

      if (
        visited.has(key) ||
        symbol === "wild" ||
        symbol === "seraphim_eye" ||
        symbol === "samsara" ||
        symbol === "ouroboros" ||
        symbol === "panepoptis_ophthalmos"
      ) {
        continue;
      }

      const stack: ClusterCell[] = [{ row, col }];
      const cluster: ClusterCell[] = [];

      while (stack.length > 0) {
        const current = stack.pop()!;
        const currentKey = `${current.row}:${current.col}`;
        if (visited.has(currentKey)) {
          continue;
        }

        const currentSymbol = board[current.row][current.col];
        if (!isMatchingSymbol(symbol, currentSymbol)) {
          continue;
        }

        visited.add(currentKey);
        cluster.push(current);

        for (const [dr, dc] of directions) {
          const nextRow = current.row + dr;
          const nextCol = current.col + dc;

          if (
            nextRow >= 0 &&
            nextRow < rows &&
            nextCol >= 0 &&
            nextCol < cols
          ) {
            stack.push({ row: nextRow, col: nextCol });
          }
        }
      }

      if (cluster.length >= config.clusterThreshold) {
        const payoutMultiplier = payoutForCluster(config, symbol, cluster.length);
        if (payoutMultiplier > 0) {
          wins.push({
            symbol,
            size: cluster.length,
            payoutMultiplier,
            payout: Number((bet * payoutMultiplier).toFixed(2)),
            cells: cluster
          });
        }
      }
    }
  }

  return wins;
};
