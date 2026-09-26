/**
 * job_version 守卫与缓存精准更新（bullet ② 核心）。
 *
 * 规则（乐观锁思想）：事件版本 ≤ 本地已知版本 → 乱序/重复，整包丢弃；
 * 严格大于才应用。「SSE 仅通知、HTTP invalidateQueries 校准」：终态是结构性
 * 变化（条目要移动/移除），SSE 做能精确做的，剩下的交给 HTTP 校准。
 */

import type { QueryClient } from "@tanstack/react-query";
import { jobsKeys } from "../keys";
import { isTerminal, type JobDto, type JobEventData, type JobsPageData } from "../types";

/** 版本守卫：undefined（未知任务）视为可应用；否则必须严格大于。 */
export function shouldApplyEvent(known: number | undefined, incoming: number): boolean {
  return known === undefined || incoming > known;
}

/** 把增量事件合并进任务 DTO（调用方保证已过版本守卫）。 */
export function mergeJobUpdate(current: JobDto | undefined, ev: JobEventData): JobDto {
  if (!current) {
    return {
      id: ev.job_id,
      status: ev.status,
      format: "",
      total_count: ev.total_count,
      processed_count: ev.processed_count,
      progress: ev.progress,
      job_version: ev.job_version,
      created_at: "",
      finished_at: null,
      file: null,
      error: ev.error ?? null,
    };
  }
  return {
    ...current,
    status: ev.status,
    progress: ev.progress,
    total_count: ev.total_count,
    processed_count: ev.processed_count,
    job_version: ev.job_version,
    error: ev.error ?? current.error,
  };
}

interface ListView {
  status?: string;
  activeOnly?: boolean;
}

function viewOf(queryKey: readonly unknown[]): ListView {
  const params = queryKey[2] as ListView | undefined;
  return params ?? {};
}/** 事件对单个列表缓存页的作用：原地更新 / 乱序丢弃 / 过滤视图移除+total 重算。 */
function applyEventToPage(
  page: JobsPageData | undefined,
  ev: JobEventData,
  view: ListView,
): JobsPageData | undefined {
  if (!page) return page;
  const index = page.items.findIndex((job) => job.id === ev.job_id);
  if (index === -1) return page; // 本页不含该任务：不动（引用不变）
  const current = page.items[index];
  if (!shouldApplyEvent(current.job_version, ev.job_version)) return page; // 乱序/重复：整页原样返回

  const viewExcludes =
    (view.activeOnly === true && isTerminal(ev.status)) ||
    (view.status !== undefined && view.status !== ev.status);

  if (viewExcludes) {
    // 条目移除 + total 重算（简历原话的落点）
    const items = page.items.filter((_, i) => i !== index);
    return { ...page, items, total: Math.max(0, page.total - 1) };
  }
  const items = page.items.map((job, i) => (i === index ? mergeJobUpdate(job, ev) : job));
  return { ...page, items };
}

/** 把 job_updated 事件精准写进所有相关缓存（跨分页 × 筛选视图）。 */
export function applyJobEventToCaches(queryClient: QueryClient, ev: JobEventData): void {
  // 详情缓存：版本守卫 + 合并
  queryClient.setQueryData<JobDto | undefined>(jobsKeys.detail(ev.job_id), (old) =>
    old !== undefined && !shouldApplyEvent(old.job_version, ev.job_version)
      ? old
      : mergeJobUpdate(old, ev),
  );

  // 所有列表缓存（跨分页 × 筛选）：setQueriesData 的 updater 拿不到 queryKey，
  // 无法感知视图参数，因此显式遍历 QueryCache 逐个精准更新。
  for (const query of queryClient.getQueryCache().getAll()) {
    if (query.queryKey[0] !== "jobs" || query.queryKey[1] !== "list") continue;
    const view = viewOf(query.queryKey);
    queryClient.setQueryData<JobsPageData>(query.queryKey, (page) =>
      applyEventToPage(page, ev, view),
    );
  }

  // 终态 → 结构性变化，HTTP 校准兜底（SSE 仅通知）
  if (isTerminal(ev.status)) {
    void queryClient.invalidateQueries({ queryKey: jobsKeys.root });
  }
}
