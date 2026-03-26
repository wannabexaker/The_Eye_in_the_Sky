/**
 * SQL-Ready Analytics Abstraction — Phase 2 Migration Guide
 * 
 * Current State (Phase 1):
 * ========================
 * - LocalStorageAnalyticsService: in-memory rounds + localStorage persistence
 * - player-store.ts: maintains roundsLog array
 * - store hydration: calls initializeAnalyticsService(roundsLog) to seed service
 * - page.tsx: passes roundsLog as prop to SessionAnalyticsOverlay
 * - SessionAnalyticsOverlay: processes via prop, no async
 * 
 * No code changes needed to switch Phase 1 ↔ Phase 2.
 * Only need to implement PostgreSQL endpoints and swap one line in use-analytics-service.ts
 * 
 * Phase 2 Migration Steps (When Ready):
 * =====================================
 * 
 * 1. Create NestJS API Endpoints (apps/api/src)
 *    ────────────────────────────────────────
 *    
 *    analytics.controller.ts:
 *    - POST   /analytics/rounds          → storeRound(entry: RoundAnalyticsEntry)
 *    - GET    /analytics/rounds          → queryRounds(limit, after, before, mode)
 *    - GET    /analytics/rounds/count    → getRoundCount()
 *    - POST   /analytics/rounds/batch    → storeBatch(entries)
 *    - DELETE /analytics/rounds/:sessionId → clearRounds()
 * 
 *    Implement Prisma schema:
 *    model RoundAnalytics {
 *      id                String    @id
 *      sessionId         String    // Add to client on API call
 *      timestamp         DateTime
 *      bet               Float
 *      win               Float
 *      net               Float
 *      mode              String    // "base" | "bonus"
 *      cascades          Int
 *      bonusTriggered    Boolean
 *      multiplier        Float
 *      winMultiple       Float
 *      tier              String    // "loss" | "win" | "big_win" | "huge_win" | "super_win"
 *      balanceAfter      Float
 *      createdAt         DateTime  @default(now())
 *      
 *      @@unique([id, sessionId])  // Dedupe by (id + sessionId) pair
 *    }
 * 
 * 2. Implement PostgresAnalyticsService
 *    ─────────────────────────────────
 *    
 *    Replace stubs in postgres-service.ts:
 *    - All methods call API endpoints
 *    - Pass sessionId on every request
 *    - Handle network errors gracefully (fallback to cache)
 * 
 * 3. Update use-analytics-service.ts
 *    ──────────────────────────────
 *    
 *    Swap one line:
 *    Change:  analyticsServiceInstance = new LocalStorageAnalyticsService();
 *    To:      const sessionId = getSessionIdFromAuth(); // or store
 *             analyticsServiceInstance = new PostgresAnalyticsService(
 *               process.env.NEXT_PUBLIC_API_URL,
 *               sessionId
 *             );
 * 
 * 4. Update player-web component that fetches
 *    ──────────────────────────────────────────
 *    
 *    Current (page.tsx):
 *    <OverlayModal>
 *      <SessionAnalyticsOverlay rounds={roundsLog} />
 *    </OverlayModal>
 *    
 *    Can stay same! SessionAnalyticsOverlay already accepts prop.
 *    No UI changes needed.
 * 
 * 5. Optional: Direct Service Usage (Advanced)
 *    ──────────────────────────────────────────
 *    
 *    Components can call service directly for real-time queries:
 *    
 *    const analyticsService = useAnalyticsService();
 *    const recentRounds = await analyticsService.queryRounds({ limit: 100 });
 *    
 *    This is deferred—leave for Phase 3 if needed.
 * 
 * Benefits of This Pattern:
 * ==========================
 * ✅ Zero UI changes on service swap
 * ✅ localStorage fallback if API goes offline
 * ✅ Server-side filtering more efficient for large datasets
 * ✅ Cross-session analytics queries possible in Phase 3
 * ✅ No duplicate rounds via database unique constraint
 * ✅ Session scoping built-in from day 1
 * 
 * Testing Phase 2:
 * ================
 * 1. Spin 10-20 rounds with LocalStorageAnalyticsService (baseline)
 * 2. Enable PostgresAnalyticsService stub with mock API
 * 3. Verify rounds persist in DB
 * 4. Test dedupe: trigger same round ID twice, expect 1 entry
 * 5. Test filters: query with time window = 24h, verify correct subset
 * 6. Compare CSV export before/after — should be identical
 */
