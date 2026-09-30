import { useId } from "react";
import { defaultFilter, type FilterDraft } from "../lib/filter";

interface FilterFormProps {
  value: FilterDraft;
  onChange: (next: FilterDraft) => void;
  onSubmit: () => void;
}

export default function FilterForm({ value, onChange, onSubmit }: FilterFormProps) {
  const id = useId();

  return (
    <form className="filter-form asset-filter" aria-label="筛选作品"
      onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
      <label htmlFor={`${id}-keyword`}>关键词
        <input id={`${id}-keyword`} className="field" type="search" placeholder="搜索作品标题"
          value={value.keyword} onChange={(event) => onChange({ ...value, keyword: event.target.value })} />
      </label>
      <label htmlFor={`${id}-type`}>类型
        <select id={`${id}-type`} className="field" value={value.assetType}
          onChange={(event) => onChange({ ...value, assetType: event.target.value as FilterDraft["assetType"] })}>
          <option value="">全部</option><option value="image">图片</option>
          <option value="video">视频</option><option value="script">剧本</option>
        </select>
      </label>
      <label htmlFor={`${id}-status`}>状态
        <select id={`${id}-status`} className="field" value={value.status}
          onChange={(event) => onChange({ ...value, status: event.target.value as FilterDraft["status"] })}>
          <option value="">全部</option><option value="draft">草稿</option>
          <option value="ready">就绪</option><option value="failed">失败</option>
        </select>
      </label>
      <label htmlFor={`${id}-tag`}>标签
        <input id={`${id}-tag`} className="field" placeholder="输入单个标签" value={value.tag}
          onChange={(event) => onChange({ ...value, tag: event.target.value })} />
      </label>
      <label htmlFor={`${id}-from`}>开始日期
        <input id={`${id}-from`} className="field" type="date" value={value.createdFrom}
          onChange={(event) => onChange({ ...value, createdFrom: event.target.value })} />
      </label>
      <label htmlFor={`${id}-to`}>结束日期
        <input id={`${id}-to`} className="field" type="date" value={value.createdTo}
          onChange={(event) => onChange({ ...value, createdTo: event.target.value })} />
      </label>
      <div className="asset-filter-actions">
        <button className="btn btn-primary" type="submit">查询</button>
        <button className="btn" type="button" onClick={() => onChange(defaultFilter())}>重置</button>
      </div>
    </form>
  );
}
