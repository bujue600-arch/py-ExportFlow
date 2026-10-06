import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { ApiError } from "../../../api/client";
import { downloadJob } from "../lib/downloadJob";
import JobCard from "../components/JobCard";
import type { ExportJob } from "../types";

vi.mock("../lib/downloadJob", () => ({ downloadJob: vi.fn().mockResolvedValue(undefined) }));

const baseJob: ExportJob = {
  id: "job_demo", status: "QUEUED", format: "csv", total_count: 10,
  processed_count: 0, progress: 0, job_version: 1, created_at: "2026-10-02T10:00:00Z",
  finished_at: null, file: null, error: null,
};

describe("JobCard", () => {
  beforeEach(() => { vi.mocked(downloadJob).mockReset().mockResolvedValue(undefined); });
  it("test_排队任务_显示中文状态_不显示进度条", () => {
    render(<JobCard job={baseJob} />);

    expect(screen.getByText("排队中")).toHaveClass("badge-gray");
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("test_运行任务_显示进度条_按处理数计算百分比", () => {
    render(<JobCard job={{ ...baseJob, status: "RUNNING", processed_count: 3, progress: 30 }} />);

    expect(screen.getByText("导出中")).toHaveClass("badge-blue");
    expect(screen.getByRole("progressbar")).toHaveValue(30);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "3 / 10 条");
  });

  it("test_完成任务_存在文件_显示下载按钮并触发下载", async () => {
    render(<JobCard job={{ ...baseJob, status: "DONE", finished_at: "2026-10-02T10:01:00Z",
      processed_count: 10, progress: 100, file: { name: "export.csv", size_bytes: 12 } }} />);

    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "下载" })); });

    await waitFor(() => expect(downloadJob).toHaveBeenCalledWith("job_demo", "export.csv"));
    expect(screen.getByText("已完成")).toHaveClass("badge-green");
    expect(document.querySelectorAll("time")).toHaveLength(2);
  });

  it("test_失败任务_有错误_显示错误消息和trace_id", () => {
    render(<JobCard job={{ ...baseJob, status: "FAILED", error: { code: "3003", message: "文件生成失败" } }}
      traceId="trace-failed" />);

    expect(screen.getByText(/文件生成失败/)).toBeInTheDocument();
    expect(screen.getByText("失败")).toHaveClass("badge-red");
    expect(screen.getByText(/trace-failed/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "下载" })).not.toBeInTheDocument();
  });

  it("test_下载_文件过期_显示统一错误并可再次点击", async () => {
    vi.mocked(downloadJob).mockRejectedValue(new ApiError(4001, "导出文件已过期", "trace-download"));
    render(<JobCard job={{ ...baseJob, status: "DONE", file: { name: "export.csv", size_bytes: 12 } }} />);

    fireEvent.click(screen.getByRole("button", { name: "下载" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("导出文件已过期（trace_id: trace-download）");
    expect(screen.getByRole("button", { name: "下载" })).toBeEnabled();
  });

  it("test_完成任务_文件信息缺失_不显示下载", () => {
    render(<JobCard job={{ ...baseJob, status: "DONE" }} />);

    expect(screen.queryByRole("button", { name: "下载" })).not.toBeInTheDocument();
  });
});
