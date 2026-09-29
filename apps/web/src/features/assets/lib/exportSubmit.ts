/**
 * 创建导出的提交意图（bullet ④：幂等键防重复创建）。
 *
 * 「一个意图 = 一个幂等键」：用户每点一次导出按钮创建一个 intent；
 * 网络重试/重复提交复用同一 key，后端据此去重（api-contract §5）。
 */

import { newIdempotencyKey, request } from "@/api/client";
import type { ExportPayload } from "./selection";

export interface ExportJobResult {
  id: string;
  status: string;
  job_version: number;
}

export interface ExportIntent {
  key: string;
  submit: (payload: ExportPayload, format: "csv" | "json") => Promise<ExportJobResult>;
}

export function createExportIntent(): ExportIntent {
  const key = newIdempotencyKey();
  return {
    key,
    submit: (payload, format) =>
      request<ExportJobResult>("/api/export-jobs", {
        method: "POST",
        body: JSON.stringify({ ...payload, format }),
        idempotencyKey: key,
      }),
  };
}
