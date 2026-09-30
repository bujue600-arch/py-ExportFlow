import type { Asset } from "./types";

/** 固定内容与时间，便于静态页面验收及测试复用。 */
export const mockAssets: Asset[] = [
  { id: "asset_01", title: "城市晨光", asset_type: "image", status: "ready",
    tags: ["城市", "风景"], size_bytes: 524288, created_at: "2026-09-12T08:00:00+08:00" },
  { id: "asset_02", title: "秋日旅行预告", asset_type: "video", status: "draft",
    tags: ["旅行"], size_bytes: 15728640, created_at: "2026-09-11T14:30:00+08:00" },
  { id: "asset_03", title: "咖啡馆的故事", asset_type: "script", status: "failed",
    tags: ["故事", "生活"], size_bytes: 2048, created_at: "2026-09-10T10:15:00+08:00" },
  { id: "asset_04", title: "新品海报草稿", asset_type: "image", status: "draft",
    tags: ["设计"], size_bytes: 1572864, created_at: "2026-09-09T09:00:00+08:00" },
  { id: "asset_05", title: "烘焙课堂", asset_type: "video", status: "ready",
    tags: ["教程", "生活"], size_bytes: 26214400, created_at: "2026-09-08T16:20:00+08:00" },
  { id: "asset_06", title: "山间来信", asset_type: "script", status: "draft",
    tags: ["故事"], size_bytes: 8192, created_at: "2026-09-07T11:45:00+08:00" },
  { id: "asset_07", title: "雨夜街景", asset_type: "image", status: "failed",
    tags: ["城市"], size_bytes: 786432, created_at: "2026-09-06T20:00:00+08:00" },
  { id: "asset_08", title: "海边日落延时", asset_type: "video", status: "failed",
    tags: ["风景", "旅行"], size_bytes: 10485760, created_at: "2026-09-05T18:10:00+08:00" },
  { id: "asset_09", title: "人物访谈提纲", asset_type: "script", status: "ready",
    tags: ["访谈"], size_bytes: 4096, created_at: "2026-09-04T13:00:00+08:00" },
  { id: "asset_10", title: "森林光影", asset_type: "image", status: "ready",
    tags: ["自然", "风景"], size_bytes: 2097152, created_at: "2026-09-03T07:30:00+08:00" },
  { id: "asset_11", title: "手作记录", asset_type: "video", status: "ready",
    tags: ["教程"], size_bytes: 3670016, created_at: "2026-09-02T15:40:00+08:00" },
  { id: "asset_12", title: "未命名短篇", asset_type: "script", status: "draft",
    tags: [], size_bytes: 1024, created_at: "2026-09-01T12:00:00+08:00" },
];
