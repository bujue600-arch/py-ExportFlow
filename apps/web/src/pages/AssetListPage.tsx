import { useState } from "react";
import AssetTable from "../features/assets/components/AssetTable";
import FilterForm from "../features/assets/components/FilterForm";
import { defaultFilter } from "../features/assets/lib/filter";
import { mockAssets } from "../features/assets/mock";

/** D2 静态列表：提交仅打印草稿条件，后续任务再接入真实查询。 */
export default function AssetListPage() {
  const [draft, setDraft] = useState(defaultFilter);

  return (
    <section>
      <h1>作品库</h1>
      <div className="card">
        <FilterForm value={draft} onChange={setDraft} onSubmit={() => console.log(draft)} />
        <p className="asset-list-summary">共 {mockAssets.length} 个作品</p>
        <AssetTable assets={mockAssets} />
      </div>
    </section>
  );
}
