# Analytics Abstraction Layer

**Location:** `packages/shared-types/src/analytics-service.ts` + `apps/player-web/lib/analytics/`

## Overview

SQL-ready abstraction for analytics storage and retrieval. Currently uses localStorage, Phase 2 swaps to PostgreSQL without changing UI code.

## Architecture

### Service Interface (`AnalyticsService`)

```typescript
interface AnalyticsService {
  storeRound(entry: RoundAnalyticsEntry): Promise<void>;
  queryRounds(options?: AnalyticsQueryOptions): Promise<RoundAnalyticsEntry[]>;
  getAllRounds(): Promise<RoundAnalyticsEntry[]>;
  clearRounds(): Promise<void>;
  getRoundCount(): Promise<number>;
  storeBatch(entries: RoundAnalyticsEntry[]): Promise<void>;
}
```

### Implementations

1. **LocalStorageAnalyticsService** (Phase 1 — Current)
   - In-memory array with localStorage persistence via Zustand
   - 10,000 round retention limit
   - Dedupe by round ID
   - Fast queries (all in-memory)

2. **PostgresAnalyticsService** (Phase 2 — Stub)
   - API-backed, all queries hit server
   - Server-side dedup via UNIQUE constraint
   - Unlimited storage (bounded by DB)
   - Efficient server-side filtering

## Usage

### Component Initialization (page.tsx)

```typescript
const { roundsLog } = usePlayerUiStore();

// Phase 1: Pass roundsLog directly
<SessionAnalyticsOverlay rounds={roundsLog} />

// Phase 2: No change needed! roundsLog auto-updates when service persists async
```

### Service Access (hooks/components)

```typescript
import { useAnalyticsService } from "../../hooks/use-analytics-service";

const analyticsService = useAnalyticsService();

// Query with filters
const recentRounds = await analyticsService.queryRounds({
  limit: 100,
  after: Date.now() - 24 * 60 * 60 * 1000, // Last 24h
  mode: "base"
});

// Store a single round
await analyticsService.storeRound({
  id: "round-123",
  timestamp: Date.now(),
  bet: 10,
  win: 50,
  // ... rest of fields
});
```

### Store Integration (player-store.ts)

```typescript
// Hydration: seed service with persisted rounds
onRehydrateStorage: () => (state) => {
  if (state?.roundsLog) {
    initializeAnalyticsService(state.roundsLog);
  }
  usePlayerUiStore.setState({ hasHydrated: true });
};

// Apply round: update state (sync), service persists async
applyRoundResult: (result) => set((state) => {
  // ... create analyticsEntry ...
  // Service auto-persists via hydration path; no explicit call needed
  return {
    // ... updated store state ...
    roundsLog: nextRoundsLog.slice(-ANALYTICS_MAX_ROUNDS)
  };
});
```

## Phase 1 → Phase 2 Swap (Minimal)

### In `hooks/use-analytics-service.ts`:

```typescript
// Before
analyticsServiceInstance = new LocalStorageAnalyticsService();

// After (Phase 2)
const sessionId = usePlayerUiStore.getState().sessionId || "anonymous";
analyticsServiceInstance = new PostgresAnalyticsService(
  process.env.NEXT_PUBLIC_API_URL,
  sessionId
);
```

**That's it.** No UI changes needed.

## Key Design Decisions

- **Singleton pattern:** `useAnalyticsService()` returns same instance throughout app lifetime
- **Fire-and-forget persistence:** player-store updates synchronously, service persists asynchronously
- **localStorage + Zustand:** Phase 1 state acts as canonical source of truth
- **Service initialization on hydration:** Ensures in-memory state matches persisted data
- **Dedupe strategy:** Phase 1 checks `previousEntry?.id`, Phase 2 relies on DB constraint

## Testing

### Phase 1 Validation

```typescript
// apps/player-web/hooks/use-analytics-service.test.ts (future)
test("stores and retrieves rounds correctly", async () => {
  const service = new LocalStorageAnalyticsService();
  const entry: RoundAnalyticsEntry = { /* ... */ };
  
  await service.storeRound(entry);
  const rounds = await service.queryRounds();
  
  expect(rounds).toHaveLength(1);
  expect(rounds[0].id).toBe(entry.id);
});

test("deduplicates by ID", async () => {
  const service = new LocalStorageAnalyticsService();
  const entry: RoundAnalyticsEntry = { /* ... */ };
  
  await service.storeRound(entry);
  await service.storeRound(entry); // Same ID
  const rounds = await service.queryRounds();
  
  expect(rounds).toHaveLength(1); // Not 2
});

test("enforces 10k retention limit", async () => {
  const service = new LocalStorageAnalyticsService();
  
  for (let i = 0; i < 12000; i++) {
    await service.storeRound({
      id: `round-${i}`,
      timestamp: Date.now() + i,
      // ... minimal fields ...
    } as RoundAnalyticsEntry);
  }
  
  const count = await service.getRoundCount();
  expect(count).toBe(10000);
});
```

### Phase 2 Validation (When API Ready)

```typescript
// API integration tests in apps/api/src/analytics.controller.spec.ts
test("POST /analytics/rounds stores and dedupes correctly");
test("GET /analytics/rounds?limit=100 returns limited set");
test("GET /analytics/rounds?after=timestamp filters by time");
test("DELETE /analytics/rounds/:sessionId clears session data");
```

## Migration Checklist (Phase 2)

- [ ] NestJS API endpoints implemented (POST, GET, DELETE)
- [ ] Prisma schema with RoundAnalytics model + unique constraint
- [ ] PostgresAnalyticsService implementations (all Promise methods)
- [ ] Test API with Postman/curl
- [ ] Swap service in use-analytics-service.ts
- [ ] Run player-web locally, spin 20 rounds
- [ ] Verify rounds appear in DB and CSV export
- [ ] Compare observable RTP: should be identical before/after
- [ ] Load test with 100k rounds, verify query performance
