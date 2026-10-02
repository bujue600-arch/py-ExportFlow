import { useState } from "react";
import { ApiError } from "../api/client";
import JobCard from "../features/jobs/components/JobCard";
import { useJobs } from "../features/jobs/hooks/useJobs";

const PAGE_SIZE = 10;

export default function JobCenterPage() {
  const [page, setPage] = useState(1);
  const { data, error, isPending, isFetching } = useJobs({ page, pageSize: PAGE_SIZE });
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  return (
    <section>
      <h1>导出中心</h1>
      {isPending && <p role="status" className="empty-tip">加载中…</p>}
      {error && <p role="alert" className="error-text">
        {error instanceof ApiError ? error.toUserMessage() : `操作失败：${error.message}`}
      </p>}
      {data && <>
        {data.items.length === 0 ? <p className="empty-tip">暂无导出任务</p> :
          <div className="job-list">{data.items.map((job) =>
            <JobCard key={job.id} job={job} traceId={data.traceId} />)}</div>}
        <nav className="toolbar" aria-label="任务分页">
          <button className="btn" type="button" disabled={page <= 1 || isFetching}
            onClick={() => setPage((current) => current - 1)}>上一页</button>
          <span role="status">第 {data.page} / {totalPages} 页 · 共 {data.total} 条</span>
          <button className="btn" type="button" disabled={page >= totalPages || isFetching}
            onClick={() => setPage((current) => current + 1)}>下一页</button>
        </nav>
      </>}
    </section>
  );
}
