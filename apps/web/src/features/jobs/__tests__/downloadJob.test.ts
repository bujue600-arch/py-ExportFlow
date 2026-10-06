import { ApiError, requestBlob } from "../../../api/client";
import { downloadJob } from "../lib/downloadJob";

vi.mock("../../../api/client", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../../api/client")>(), requestBlob: vi.fn(),
}));

describe("downloadJob", () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

  it("test_下载_成功文件_使用文件名并释放链接", async () => {
    vi.useFakeTimers();
    const create = vi.fn().mockReturnValue("blob:export");
    const revoke = vi.fn();
    vi.stubGlobal("URL", Object.assign(class extends URL {}, { createObjectURL: create, revokeObjectURL: revoke }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe("作品.csv");
      expect(this.href).toBe("blob:export");
    });
    vi.mocked(requestBlob).mockResolvedValue(new Blob(["id,title\n1,test"]));

    await downloadJob("job_1", "作品.csv");
    await vi.advanceTimersByTimeAsync(1000);

    expect(requestBlob).toHaveBeenCalledWith("/api/export-jobs/job_1/download");
    expect(click).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith("blob:export");
    expect(document.querySelector("a[download]")).toBeNull();
  });

  it("test_下载_过期错误_保留统一错误而不触发文件保存", async () => {
    const error = new ApiError(4001, "导出文件已过期", "trace-expired");
    vi.mocked(requestBlob).mockRejectedValue(error);
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const result = downloadJob("job_1", "作品.csv");

    await expect(result).rejects.toBe(error);
    expect(click).not.toHaveBeenCalled();
  });
});
