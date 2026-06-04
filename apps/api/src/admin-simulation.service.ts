import { BadRequestException, Injectable, NotFoundException, OnModuleDestroy } from "@nestjs/common";
import { Worker } from "node:worker_threads";
import { randomUUID } from "node:crypto";

export type SimulationProfileId =
  | "legacy_v1_3"
  | "math_base_v2_0"
  | "constellation_simple_v0_1";

export type AdminSimulationRequest = {
  profileId: SimulationProfileId;
  spins: number;
  bet: number;
  seed: number;
  winMultiplier?: number;
};

export type AdminSimulationResult = {
  profileId: SimulationProfileId;
  configVersion: string;
  spins: number;
  bet: number;
  seed: number;
  winMultiplier: number;
  rtp: number;
  hitRate: number;
  bonusRate: number;
  volatilityIndex: number;
  p95Win: number;
  p99Win: number;
  maxWin: number;
  averageWin: number;
  averageWinOnHit: number;
  confidenceLow: number;
  confidenceHigh: number;
};

export type AdminSimulationJob = {
  jobId: string;
  status: "queued" | "running" | "completed" | "failed";
  progress: number;
  createdAt: string;
  updatedAt: string;
  request: AdminSimulationRequest;
  result?: AdminSimulationResult;
  error?: string;
};

type WorkerSuccessMessage = {
  ok: true;
  result: AdminSimulationResult;
};

type WorkerFailureMessage = {
  ok: false;
  error: string;
};

const MAX_SPINS = 1_000_000;
const MAX_ACTIVE_JOBS = 2;
const JOB_RETENTION_MS = 30 * 60 * 1000;
const WORKER_TIMEOUT_MS = 5 * 60 * 1000;

const workerScript = `
const { parentPort, workerData } = require("node:worker_threads");

try {
  const { resolveGameConfigProfile, simulateSpins } = require("@eye/game-engine");
  const profile = resolveGameConfigProfile(workerData.profileId);
  const report = simulateSpins({
    spins: workerData.spins,
    bet: workerData.bet,
    baseSeed: workerData.seed,
    winMultiplier: workerData.winMultiplier
  }, profile.config);

  const p95Win = report.percentileWinDistribution?.p95 ?? 0;
  const p99Win = report.percentileWinDistribution?.p99 ?? 0;
  parentPort.postMessage({
    ok: true,
    result: {
      profileId: profile.id,
      configVersion: report.configVersion,
      spins: report.totalSpins,
      bet: workerData.bet,
      seed: workerData.seed,
      winMultiplier: workerData.winMultiplier,
      rtp: report.achievedRtp,
      hitRate: report.hitRate,
      bonusRate: report.bonusTriggerRate,
      volatilityIndex: workerData.bet > 0 ? p99Win / workerData.bet : 0,
      p95Win,
      p99Win,
      maxWin: report.maxObservedWin,
      averageWin: report.averageWin,
      averageWinOnHit: report.averageWinOnHit,
      confidenceLow: report.confidenceInterval95.low,
      confidenceHigh: report.confidenceInterval95.high
    }
  });
} catch (error) {
  parentPort.postMessage({
    ok: false,
    error: error instanceof Error ? error.message : "Simulation worker failed."
  });
}
`;

const cloneJob = (job: AdminSimulationJob): AdminSimulationJob => ({
  ...job,
  request: { ...job.request },
  result: job.result ? { ...job.result } : undefined
});

@Injectable()
export class AdminSimulationService implements OnModuleDestroy {
  private jobs = new Map<string, AdminSimulationJob>();
  private workers = new Map<string, Worker>();

  onModuleDestroy() {
    for (const worker of this.workers.values()) {
      void worker.terminate();
    }
    this.workers.clear();
  }

  startSimulation(request: AdminSimulationRequest): AdminSimulationJob {
    this.pruneCompletedJobs();

    const activeJobs = Array.from(this.jobs.values()).filter(
      (job) => job.status === "queued" || job.status === "running"
    ).length;
    if (activeJobs >= MAX_ACTIVE_JOBS) {
      throw new BadRequestException("Simulation runner is busy. Wait for an active job to finish.");
    }

    const normalizedRequest = this.normalizeRequest(request);
    const now = new Date().toISOString();
    const jobId = `sim-${randomUUID()}`;
    const job: AdminSimulationJob = {
      jobId,
      status: "queued",
      progress: 0,
      createdAt: now,
      updatedAt: now,
      request: normalizedRequest
    };

    this.jobs.set(jobId, job);
    this.spawnWorker(jobId, normalizedRequest);
    return cloneJob(job);
  }

  getJob(jobId: string): AdminSimulationJob {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new NotFoundException("Simulation job not found.");
    }
    return cloneJob(job);
  }

  private normalizeRequest(request: AdminSimulationRequest): AdminSimulationRequest {
    if (request.spins < 1 || request.spins > MAX_SPINS) {
      throw new BadRequestException(`spins must be between 1 and ${MAX_SPINS}.`);
    }
    if (request.bet <= 0 || !Number.isFinite(request.bet)) {
      throw new BadRequestException("bet must be a positive number.");
    }

    return {
      profileId: request.profileId,
      spins: Math.floor(request.spins),
      bet: Number(request.bet),
      seed: Math.floor(request.seed),
      winMultiplier: request.winMultiplier && request.winMultiplier > 0
        ? Number(request.winMultiplier)
        : 1
    };
  }

  private spawnWorker(jobId: string, request: AdminSimulationRequest) {
    const worker = new Worker(workerScript, {
      eval: true,
      workerData: request
    });
    const timeout = setTimeout(() => {
      void worker.terminate();
      this.failJob(jobId, "Simulation timed out.");
    }, WORKER_TIMEOUT_MS);

    this.workers.set(jobId, worker);

    worker.once("online", () => {
      this.updateJob(jobId, {
        status: "running",
        progress: 5
      });
    });

    worker.on("message", (message: WorkerSuccessMessage | WorkerFailureMessage) => {
      clearTimeout(timeout);
      this.workers.delete(jobId);

      if (message.ok) {
        this.updateJob(jobId, {
          status: "completed",
          progress: 100,
          result: message.result,
          error: undefined
        });
        return;
      }

      this.failJob(jobId, message.error);
    });

    worker.once("error", (error) => {
      clearTimeout(timeout);
      this.workers.delete(jobId);
      this.failJob(jobId, error.message);
    });

    worker.once("exit", (code) => {
      clearTimeout(timeout);
      this.workers.delete(jobId);
      const job = this.jobs.get(jobId);
      if (job && job.status !== "completed" && job.status !== "failed") {
        this.failJob(jobId, `Simulation worker exited with code ${code}.`);
      }
    });
  }

  private updateJob(jobId: string, patch: Partial<AdminSimulationJob>) {
    const job = this.jobs.get(jobId);
    if (!job) {
      return;
    }
    this.jobs.set(jobId, {
      ...job,
      ...patch,
      updatedAt: new Date().toISOString()
    });
  }

  private failJob(jobId: string, error: string) {
    this.updateJob(jobId, {
      status: "failed",
      progress: 100,
      error
    });
  }

  private pruneCompletedJobs() {
    const cutoff = Date.now() - JOB_RETENTION_MS;
    for (const [jobId, job] of this.jobs.entries()) {
      if (
        (job.status === "completed" || job.status === "failed") &&
        Date.parse(job.updatedAt) < cutoff
      ) {
        this.jobs.delete(jobId);
      }
    }
  }
}
