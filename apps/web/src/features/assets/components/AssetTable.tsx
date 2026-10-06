import { useEffect, useRef } from "react";
import { deriveHeaderState, emptySelection } from "../lib/selection";
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

interface AssetTableProps {
  assets: Asset[];
  selectedIds: Set<string>;
  onToggleRow: (id: string) => void;
}

export default function AssetTable({ assets, selectedIds, onToggleRow }: AssetTableProps) {
  const headerRef = useRef<HTMLInputElement>(null);
  // 空页没有可选作品；其余情况复用选择模型的三态派生。
  const headerState = assets.length === 0 ? "none" : deriveHeaderState(
    { ...emptySelection(), explicitIds: selectedIds }, assets.map((asset) => asset.id),
  );

  useEffect(() => {
    if (headerRef.current) headerRef.current.indeterminate = headerState === "some";
  }, [headerState]);

  function handleTogglePage() {
    for (const asset of assets) {
      if (selectedIds.has(asset.id) === (headerState === "all")) onToggleRow(asset.id);
    }
  }

  return (
    <div className="asset-table-scroll">
      <table className="data-table" aria-label="作品列表">
        <thead>
          <tr>
            <th scope="col">
              <input ref={headerRef} type="checkbox" aria-label="选择本页全部作品"
                checked={headerState === "all"} disabled={assets.length === 0}
                onChange={handleTogglePage} />
            </th>
            {["标题", "类型", "状态", "标签", "大小", "创建时间"].map((label) => (
              <th key={label} scope="col">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => (
            <tr key={asset.id} data-selected={selectedIds.has(asset.id)}>
              <td>
                <input type="checkbox" aria-label={`选择作品：${asset.title}`}
                  checked={selectedIds.has(asset.id)} onChange={() => onToggleRow(asset.id)} />
              </td>
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
          {assets.length === 0 && <tr><td colSpan={7} className="empty-tip">暂无作品</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
