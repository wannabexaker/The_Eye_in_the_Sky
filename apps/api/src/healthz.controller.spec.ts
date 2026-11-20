/**
 * HealthzController — Unit Tests
 *
 * Locks the public monitoring contract polled by NetSentry:
 * 200 { status, version, commit, database } when the database answers,
 * 503 with the same shape when it does not. No auth, no DB writes.
 */

import { HttpException } from "@nestjs/common";
import { HealthzController, getBuildInfo } from "./health.controller";
import type { PrismaService } from "./prisma.service";

const originalVersion = process.env.APP_VERSION;
const originalCommit = process.env.GIT_COMMIT;

afterEach(() => {
  if (originalVersion === undefined) delete process.env.APP_VERSION;
  else process.env.APP_VERSION = originalVersion;
  if (originalCommit === undefined) delete process.env.GIT_COMMIT;
  else process.env.GIT_COMMIT = originalCommit;
});

const buildController = (queryRaw: jest.Mock) =>
  new HealthzController({ $queryRaw: queryRaw } as unknown as PrismaService);

describe("getBuildInfo", () => {
  it("reports the baked-in version and commit", () => {
    process.env.APP_VERSION = "0.2.2";
    process.env.GIT_COMMIT = "abc123";
    expect(getBuildInfo()).toEqual({ version: "0.2.2", commit: "abc123" });
  });

  it("falls back to dev/unknown when not built by CI", () => {
    delete process.env.APP_VERSION;
    process.env.GIT_COMMIT = "   ";
    expect(getBuildInfo()).toEqual({ version: "dev", commit: "unknown" });
  });
});

describe("HealthzController", () => {
  it("returns ok with build info when the database answers", async () => {
    process.env.APP_VERSION = "0.2.2";
    process.env.GIT_COMMIT = "abc123";
    const controller = buildController(jest.fn().mockResolvedValue([{ "?column?": 1 }]));

    await expect(controller.getHealthz()).resolves.toEqual({
      status: "ok",
      version: "0.2.2",
      commit: "abc123",
      database: "up"
    });
  });

  it("throws 503 with the same shape when the database is down", async () => {
    process.env.APP_VERSION = "0.2.2";
    process.env.GIT_COMMIT = "abc123";
    const controller = buildController(jest.fn().mockRejectedValue(new Error("ECONNREFUSED")));

    try {
      await controller.getHealthz();
      throw new Error("expected 503");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(503);
      expect((error as HttpException).getResponse()).toEqual({
        status: "degraded",
        version: "0.2.2",
        commit: "abc123",
        database: "down"
      });
    }
  });
});
