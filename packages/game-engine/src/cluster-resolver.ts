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

const payoutForThreshold = (config: GameConfig, symbol: SymbolId, size: number): number => {
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

  return payout * (config.payoutScale ?? 1);
};

const resolveClusterWins = (
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
        const payoutMultiplier = payoutForThreshold(config, symbol, cluster.length);
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

const resolveCountAnywhereWins = (
  board: SymbolId[][],
  config: GameConfig,
  bet: number
): CascadeWin[] => {
  const cellsBySymbol = new Map<SymbolId, ClusterCell[]>();
  const wins: CascadeWin[] = [];

  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < (board[row]?.length ?? 0); col += 1) {
      const symbol = board[row][col];
      const cells = cellsBySymbol.get(symbol) ?? [];
      cells.push({ row, col });
      cellsBySymbol.set(symbol, cells);
    }
  }

  for (const entry of config.paytable) {
    const cells = cellsBySymbol.get(entry.symbol) ?? [];
    if (cells.length < config.clusterThreshold) {
      continue;
    }

    const payoutMultiplier = payoutForThreshold(config, entry.symbol, cells.length);
    if (payoutMultiplier <= 0) {
      continue;
    }

    wins.push({
      symbol: entry.symbol,
      size: cells.length,
      payoutMultiplier,
      payout: Number((bet * payoutMultiplier).toFixed(2)),
      cells
    });
  }

  if (config.bonusTriggerMode === "scatter" && config.scatterRewards.length > 0) {
    const scatterCells = cellsBySymbol.get("samsara") ?? [];
    if (scatterCells.length > 0) {
      const sortedRewards = [...config.scatterRewards].sort((a, b) => a.count - b.count);
      let matchedReward = sortedRewards[0];

      for (const reward of sortedRewards) {
        if (scatterCells.length >= reward.count) {
          matchedReward = reward;
        }
      }

      if (scatterCells.length >= matchedReward.count && matchedReward.payoutMultiplier > 0) {
        wins.push({
          symbol: "samsara",
          size: scatterCells.length,
          payoutMultiplier: matchedReward.payoutMultiplier,
          payout: Number((bet * matchedReward.payoutMultiplier).toFixed(2)),
          cells: scatterCells
        });
      }
    }
  }

  return wins;
};

export const resolveWins = (
  board: SymbolId[][],
  config: GameConfig,
  bet: number
): CascadeWin[] =>
  config.evaluationMode === "count_anywhere"
    ? resolveCountAnywhereWins(board, config, bet)
    : resolveClusterWins(board, config, bet);

export const resolveClusters = resolveClusterWins;
