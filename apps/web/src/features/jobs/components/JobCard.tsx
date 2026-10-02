import { useState } from "react";
import { ApiError } from "../../../api/client";
import { downloadJob } from "../lib/downloadJob";
import type { ExportJob } from "../types";

const statusLabels = { QUEUED: "排队中", RUNNING: "导出中", DONE: "已完成", FAILED: "失败" };
const statusColors = { QUEUED: "badge-gray", RUNNING: "badge-blue", DONE: "badge-green", FAILED: "badge-red" };

function JobTime({ value }: { value: string | null }) {
  if (!value) return <>—</>;
  const date = new Date(value);
  return <time dateTime={value}>{Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("zh-CN", { hour12: false })}</time>;
}

export default function JobCard({ job, traceId }: { job: ExportJob; traceId?: string }) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const progress = job.total_count > 0
    ? Math.min(100, Math.max(0, job.processed_count / job.total_count * 100)) : 0;

  async function handleDownload() {
    if (!job.file || downloading) return;
    setDownloading(true);
    setDownloadError("");
    try {
      await downloadJob(job.id, job.file.name);
    } catch (error) {
      setDownloadError(error instanceof ApiError ? error.toUserMessage()
        : `下载失败：${error instanceof Error ? error.message : "未知错误"}`);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <article className="card job-card" aria-label={`导出任务 ${job.id}`}>
      <header className="job-card-header">
        <h2>{job.id}</h2>
        <span className={`badge ${statusColors[job.status]}`}>{statusLabels[job.status]}</span>
      </header>
      <p className="job-meta">{job.format.toUpperCase()} · 已处理 {job.processed_count} / {job.total_count} 条</p>
      {job.status === "RUNNING" && <progress className="job-progress" max={100} value={progress}
        aria-label="导出进度" aria-valuetext={`${job.processed_count} / ${job.total_count} 条`} />}
      <dl className="job-times">
        <div><dt>创建时间</dt><dd><JobTime value={job.created_at} /></dd></div>
        <div><dt>完成时间</dt><dd><JobTime value={job.finished_at} /></dd></div>
      </dl>
      {job.status === "FAILED" && <p role="alert" className="error-text">
        {job.error?.message || "导出失败"}（本次查询 trace_id: {traceId || "未提供"}）
      </p>}
      {job.status === "DONE" && job.file && <div className="job-download">
        <span>{job.file.name}</span>
        <button className="btn btn-primary" type="button" disabled={downloading} onClick={handleDownload}>
          {downloading ? "下载中…" : "下载"}
        </button>
      </div>}
      {downloadError && <p role="alert" className="error-text">{downloadError}</p>}
    </article>
  );
}
