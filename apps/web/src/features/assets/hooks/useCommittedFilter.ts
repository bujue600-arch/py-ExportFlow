/**
 * 草稿/已提交两层状态机（bullet ⑤ 的核心机制之一）。
 *
 * 服务端镜像（第三层）由 TanStack Query 缓存承担：query key 含 committed，
 * 于是「键入永不发请求、查询与导出一律以最近一次提交条件为准」由结构保证。
 *
 * committed 是快照语义：submit() 冻结当前 draft；之后 draft 怎么改都不影响
 * 已发出的查询（这份快照在 D5 还会被三态全选复用为 filterSnapshot）。
 */

import { useCallback, useState } from "react";
import { defaultFilter, type FilterDraft } from "../lib/filter";

export interface CommittedFilterController {
  draft: FilterDraft;
  committed: FilterDraft;
  /** 只改草稿：输入中，永不触发请求。 */
  setDraft: (next: FilterDraft) => void;
  /** 提交：把当前草稿快照为已提交条件（下次查询生效）。 */
  submit: () => void;
  /** 重置：草稿与已提交同时回到默认。 */
  reset: () => void;
}

export function useCommittedFilter(initial: FilterDraft = defaultFilter()): CommittedFilterController {
  const [draft, setDraft] = useState<FilterDraft>(initial);
  const [committed, setCommitted] = useState<FilterDraft>(initial);

  const submit = useCallback(() => {
    setCommitted(draft);
  }, [draft]);

  const reset = useCallback(() => {
    const next = defaultFilter();
    setDraft(next);
    setCommitted(next);
  }, []);

  return { draft, committed, setDraft, submit, reset };
}
