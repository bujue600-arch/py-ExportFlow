/**
 * 筛选条件的类型与纯函数（bullet ⑤ 的基础件）。
 * FilterDraft 是「草稿态」的形状；序列化只对「已提交态」进行。
 */

export type AssetType = "image" | "video" | "script";
export type AssetStatus = "draft" | "ready" | "failed";

export interface FilterDraft {
  keyword: string;
  assetType: AssetType | "";
  status: AssetStatus | "";
  tag: string;
  createdFrom: string; // date input 的 yyyy-mm-dd
  createdTo: string;
}

export function defaultFilter(): FilterDraft {
  return { keyword: "", assetType: "", status: "", tag: "", createdFrom: "", createdTo: "" };
}

export function isEmptyFilter(filter: FilterDraft): boolean {
  return Object.values(filter).every((value) => String(value).trim() === "");
}

/**
 * 序列化为查询参数：空值一律不发送（「全部」语义由参数缺省表达，api-contract §4）。
 * 纯函数：相同输入永远相同输出，可表驱动测试。
 */
export function serializeFilter(filter: FilterDraft): Record<string, string> {
  const params: Record<string, string> = {};
  const keyword = filter.keyword.trim();
  if (keyword) params.keyword = keyword;
  if (filter.assetType) params.asset_type = filter.assetType;
  if (filter.status) params.status = filter.status;
  const tag = filter.tag.trim();
  if (tag) params.tag = tag;
  if (filter.createdFrom) params.created_from = `${filter.createdFrom}T00:00:00`;
  if (filter.createdTo) params.created_to = `${filter.createdTo}T23:59:59`;
  return params;
}
