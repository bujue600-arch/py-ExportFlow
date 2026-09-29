/** 任务数据 hook（C 的导出中心页消费；A 提供 SSE/轮询统一策略）。 */

import { useQuery } from "@tanstack/react-query";
import { request } from "@/api/client";
import { jobsKeys } from "../keys";
import type { JobsPageData } from "../types";

export interface UseJobsParams {
  page: number;
  pageSize: number;
  status?: string;
  activeOnly?: boolean;
}

function toQueryString(params: UseJobsParams): string {
  const search = new URLSearchParams();
  search.set("page", String(params.page));
  search.set("page_size", String(params.pageSize));
  if (params.status) search.set("status", params.status);
  if (params.activeOnly) search.set("active_only", "true");
  return search.toString();
}

export function useJobs(params: UseJobsParams) {
  return useQuery({
    queryKey: jobsKeys.list(params),
    queryFn: () => request<JobsPageData>(`/api/export-jobs?${toQueryString(params)}`),
  });
}
