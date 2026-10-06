import { useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../api/client";
import AssetTable from "../features/assets/components/AssetTable";
import FilterForm from "../features/assets/components/FilterForm";
import { useAssetList } from "../features/assets/hooks/useAssetList";
import { useCommittedFilter } from "../features/assets/hooks/useCommittedFilter";
import { emptySelection, toggleRow } from "../features/assets/lib/selection";

const PAGE_SIZE = 20;

export default function AssetListPage() {
  const [page, setPage] = useState(1);
  const [selection, setSelection] = useState(emptySelection);
  const { draft, committed, setDraft, submit } = useCommittedFilter();
  const { data, error, isPending, isFetching } = useAssetList(page, PAGE_SIZE, committed);
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  function handleSubmit() {
    setPage(1);
    setSelection(emptySelection());
    submit();
  }

  return (
    <section>
      <div className="toolbar"><h1>作品库</h1><Link to="/jobs">导出中心</Link></div>
      <div className="card">
        <FilterForm value={draft} onChange={setDraft} onSubmit={handleSubmit} />
        {isPending && <p role="status" className="empty-tip">加载中…</p>}
        {error && <p role="alert" className="error-text">
          {error instanceof ApiError ? error.toUserMessage() : `操作失败：${error.message}`}
        </p>}
        {data && !error && <>
          <AssetTable assets={data.items} selectedIds={selection.explicitIds}
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
