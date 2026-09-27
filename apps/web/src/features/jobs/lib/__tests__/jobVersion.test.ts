/** job_version 守卫与缓存精准更新测试（bullet ②，真实 QueryClient 无渲染）。 */

import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { jobsKeys } from "../../keys";
import { applyJobEventToCaches, mergeJobUpdate, shouldApplyEvent } from "../jobVersion";
import type { JobDto, JobEventData, JobsPageData } from "../../types";

function job(overrides: Partial<JobDto> = {}): JobDto {
  return {
    id: "j1", status: "RUNNING", format: "csv",
    total_count: 100, processed_count: 40, progress: 40, job_version: 3,
    created_at: "2026-09-18T12:00:00", finished_at: null, file: null, error: null,
    ...overrides,
  };
}

function event(overrides: Partial<JobEventData> = {}): JobEventData {
  return {
    job_id: "j1", job_version: 4, status: "RUNNING",
    progress: 80, total_count: 100, processed_count: 80,
    ...overrides,
  };
}

function page(jobs: JobDto[]): JobsPageData {
  return { items: jobs, total: jobs.length, page: 1, page_size: 20 };
}

describe("shouldApplyEvent（场景2/3：乱序与重复丢弃的判定）", () => {
  it.each([
    ["未知任务_可应用", undefined, 1, true],
    ["更高版本_应用", 3, 4, true],
    ["相同版本_丢弃（重复）", 4, 4, false],
    ["更低版本_丢弃（乱序）", 5, 4, false],
  ])("%s", (_name, known, incoming, expected) => {
    expect(shouldApplyEvent(known, incoming)).toBe(expected);
  });
});

describe("mergeJobUpdate", () => {
  it("合并增量字段_保留事件未携带的字段", () => {
    const merged = mergeJobUpdate(job(), event());

    expect(merged.progress).toBe(80);
    expect(merged.format).toBe("csv"); // 事件不含 format，保留
    expect(merged.job_version).toBe(4);
  });

  it("无本地任务时_从事件构造最小DTO", () => {
    const merged = mergeJobUpdate(undefined, event());

    expect(merged.id).toBe("j1");
    expect(merged.job_version).toBe(4);
  });
});

describe("applyJobEventToCaches（跨分页×筛选视图精准更新）", () => {
  function seed(): QueryClient {
    const qc = new QueryClient();
    qc.setQueryData(jobsKeys.detail("j1"), job());
    qc.setQueryData(jobsKeys.list({ page: 1, pageSize: 20 }), page([job()]));
    qc.setQueryData(
      jobsKeys.list({ page: 1, pageSize: 20, activeOnly: true }),
      page([job()]),
    );
    qc.setQueryData(
      jobsKeys.list({ page: 2, pageSize: 20, status: "RUNNING" }),
      page([job(), job({ id: "j2" })]),
    );
    return qc;
  }

  it("进度事件_原地更新所有视图中的该条目", () => {
    const qc = seed();

    applyJobEventToCaches(qc, event());

    const p1 = qc.getQueryData<JobsPageData>(jobsKeys.list({ page: 1, pageSize: 20 }))!;
    expect(p1.items[0].progress).toBe(80);
    const p2 = qc.getQueryData<JobsPageData>(jobsKeys.list({ page: 2, pageSize: 20, status: "RUNNING" }))!;
    expect(p2.items[0].progress).toBe(80);
    expect(qc.getQueryData<JobDto>(jobsKeys.detail("j1"))!.progress).toBe(80);
  });

  it("乱序事件_整页缓存原样返回_引用不变", () => {
    const qc = seed();
    const before = qc.getQueryData<JobsPageData>(jobsKeys.list({ page: 1, pageSize: 20 }));

    applyJobEventToCaches(qc, event({ job_version: 1 })); // 低于本地 v3

    expect(qc.getQueryData(jobsKeys.list({ page: 1, pageSize: 20 }))).toBe(before);
  });

  it("终态事件_从activeOnly视图移除条目并重算total", () => {
    const qc = seed();

    applyJobEventToCaches(qc, event({ status: "DONE", progress: 100 }));

    const active = qc.getQueryData<JobsPageData>(
      jobsKeys.list({ page: 1, pageSize: 20, activeOnly: true }),
    )!;
    expect(active.items).toHaveLength(0);
    expect(active.total).toBe(0);
  });

  it("终态事件_状态筛选视图同样移除_并触发invalidate校准", () => {
    const qc = seed();

    applyJobEventToCaches(qc, event({ status: "FAILED" }));

    const runningView = qc.getQueryData<JobsPageData>(
      jobsKeys.list({ page: 2, pageSize: 20, status: "RUNNING" }),
    )!;
    expect(runningView.items.map((j) => j.id)).toEqual(["j2"]);
    expect(runningView.total).toBe(1);
    const state = qc.getQueryState(jobsKeys.list({ page: 2, pageSize: 20, status: "RUNNING" }));
    expect(state?.isInvalidated).toBe(true); // SSE 仅通知、HTTP 校准
  });

  it("未终态事件_不触发invalidate", () => {
    const qc = seed();

    applyJobEventToCaches(qc, event());

    const state = qc.getQueryState(jobsKeys.list({ page: 1, pageSize: 20 }));
    expect(state?.isInvalidated).toBe(false);
  });
});
