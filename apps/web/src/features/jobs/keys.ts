/** 任务域 query key 工厂（RULES-frontend #6：key 集中定义）。 */

export const jobsKeys = {
  root: ["jobs"] as const,
  list: (params: {
    page: number;
    pageSize: number;
    status?: string;
    activeOnly?: boolean;
  }) => ["jobs", "list", params] as const,
  detail: (id: string) => ["jobs", "detail", id] as const,
};
