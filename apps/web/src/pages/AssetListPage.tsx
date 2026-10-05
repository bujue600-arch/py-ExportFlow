import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import AssetTable from "../features/assets/components/AssetTable";
import FilterForm from "../features/assets/components/FilterForm";
import SelectionBar from "../features/assets/components/SelectionBar";
import { useAssetList } from "../features/assets/hooks/useAssetList";
import { useCommittedFilter } from "../features/assets/hooks/useCommittedFilter";
import { createExportIntent } from "../features/assets/lib/exportSubmit";
import { emptySelection, enterSelectAll, exitSelectAll, isRowSelected, toggleRow,
  buildExportPayload } from "../features/assets/lib/selection";

const PAGE_SIZE = 20;

export default function AssetListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [selection, setSelection] = useState(emptySelection);
  const [exportError, setExportError] = useState("");
  const [exporting, setExporting] = useState(false);
  const { draft, committed, setDraft, submit } = useCommittedFilter();
  const { data, error, isPending, isFetching } = useAssetList(page, PAGE_SIZE, committed);
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  function handleSubmit() {
    setPage(1);
    setSelection(emptySelection());
    setExportError("");
    submit();
  }

  function handleToggleSelectAll() {
    setSelection((current) => current.selectAll ? exitSelectAll() : enterSelectAll());
  }

  async function handleExport(format: "csv" | "json") {
    setExportError("");
    setExporting(true);
    try {
      const intent = createExportIntent();
      await intent.submit(buildExportPayload(selection, committed), format);
      navigate("/jobs");
    } catch (error) {
      setExportError(error instanceof ApiError ? error.toUserMessage()
        : `导出失败：${error instanceof Error ? error.message : "未知错误"}`);
    } finally {
      setExporting(false);
    }
  }

  const selectedIds = new Set(
    (data?.items ?? []).filter((asset) => isRowSelected(selection, asset.id)).map((asset) => asset.id),
  );

  return (
    <section>
      <div className="toolbar"><h1>作品库</h1><Link to="/jobs">导出中心</Link></div>
      <div className="card">
        <FilterForm value={draft} onChange={setDraft} onSubmit={handleSubmit} />
        {exportError && <p role="alert" className="error-text">{exportError}</p>}
        {isPending && <p role="status" className="empty-tip">加载中…</p>}
        {error && <p role="alert" className="error-text">
          {error instanceof ApiError ? error.toUserMessage() : `操作失败：${error.message}`}
        </p>}
        {data && !error && <>
          <SelectionBar selection={selection} snapshotTotal={data.total}
            onToggleSelectAll={handleToggleSelectAll} onExport={handleExport}
            disabled={isFetching || exporting} />
          <AssetTable assets={data.items} selectedIds={selectedIds}
            onToggleRow={(id) => setSelection((current) => toggleRow(current, id))} />
          <nav className="toolbar" aria-label="作品分页">
            <button className="btn" type="button" disabled={page <= 1 || isFetching}
              onClick={() => setPage((current) => current - 1)}>上一页</button>
            <span role="status">第 {data.page} / {totalPages} 页 · 共 {data.total} 条</span>
            <button className="btn" type="button" disabled={page >= totalPages || isFetching}
              onClick={() => setPage((current) => current + 1)}>下一页</button>
          </nav>
        </>}
      </div>
    </section>
  );
}
