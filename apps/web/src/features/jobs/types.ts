/**
 * 任务域类型（api-contract §5 ExportJob 形状 / sse-events §3 事件形状）。
 */

export type JobStatus = "QUEUED" | "RUNNING" | "DONE" | "FAILED";
export type TerminalStatus = "DONE" | "FAILED";

export interface JobFile {
  name: string;
  size_bytes: number;
}

export interface JobError {
  code: string;
  message: string;
}

export interface JobDto {
  id: string;
  status: JobStatus;
  format: string;
  total_count: number;
  processed_count: number;
  progress: number;
  job_version: number;
  created_at: string;
  finished_at: string | null;
  file: JobFile | null;
  error: JobError | null;
}

export interface JobsPageData {
  items: JobDto[];
  total: number;
  page: number;
  page_size: number;
}

/** SSE job_updated 事件的 data 形状（sse-events §3）。 */
export interface JobEventData {
  job_id: string;
  job_version: number;
  status: JobStatus;
  progress: number;
  total_count: number;
  processed_count: number;
  error?: JobError;
}

/** SSE snapshot 事件的 data 形状。 */
export interface SnapshotData {
  jobs: JobDto[];
  max_job_version_map: Record<string, number>;
}

export function isTerminal(status: JobStatus): status is TerminalStatus {
  return status === "DONE" || status === "FAILED";
}
