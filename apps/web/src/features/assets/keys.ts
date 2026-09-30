import { serializeFilter, type FilterDraft } from "./lib/filter";

/** 请求参数与缓存标识使用同一份规范化条件，草稿输入不参与缓存。 */
export function assetListKey(page: number, pageSize: number, filter: FilterDraft) {
  return ["assets", "list", { page, page_size: pageSize, ...serializeFilter(filter) }] as const;
}
