import type { Asset } from "../types";

const typeLabels = { image: "图片", video: "视频", script: "剧本" };
const statusLabels = { draft: "草稿", ready: "就绪", failed: "失败" };
const statusClasses = { draft: "badge-gray", ready: "badge-green", failed: "badge-red" };
const dateFormat = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  hour12: false,
});

function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${(bytes / 1024).toFixed(1)} KB`;
}

export default function AssetTable({ assets }: { assets: Asset[] }) {
  return (
    <div className="asset-table-scroll">
      <table className="data-table" aria-label="作品列表">
        <thead>
          <tr>
            {["标题", "类型", "状态", "标签", "大小", "创建时间"].map((label) => (
              <th key={label} scope="col">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => (
            <tr key={asset.id}>
              <td>{asset.title}</td>
              <td><span className="badge badge-blue">{typeLabels[asset.asset_type]}</span></td>
              <td><span className={`badge ${statusClasses[asset.status]}`}>{statusLabels[asset.status]}</span></td>
              <td>{asset.tags.length > 0 ? asset.tags.join("、") : "—"}</td>
              <td className="asset-nowrap">{formatSize(asset.size_bytes)}</td>
              <td className="asset-nowrap">
                <time dateTime={asset.created_at}>{dateFormat.format(new Date(asset.created_at))}</time>
              </td>
            </tr>
          ))}
          {assets.length === 0 && <tr><td colSpan={6} className="empty-tip">暂无作品</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
