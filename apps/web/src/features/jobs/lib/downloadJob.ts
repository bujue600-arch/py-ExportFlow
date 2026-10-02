import { requestBlob } from "../../../api/client";

export async function downloadJob(id: string, filename: string): Promise<void> {
  const blob = await requestBlob(`/api/export-jobs/${encodeURIComponent(id)}/download`);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    // 等浏览器消费下载链接后释放对象 URL。
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
