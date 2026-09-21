import { describe, expect, it } from "vitest";
import { defaultFilter, isEmptyFilter, serializeFilter, type FilterDraft } from "../filter";

type Case = [name: string, input: FilterDraft, expected: Record<string, string>];

const cases: Case[] = [
    ["空筛选_不发任何参数", defaultFilter(), {}],
    [
      "全部字段_逐项序列化_下划线命名",
      { ...defaultFilter(), keyword: " 漫剧 ", assetType: "video", status: "ready", tag: "精选", createdFrom: "2026-09-01", createdTo: "2026-09-10" },
      { keyword: "漫剧", asset_type: "video", status: "ready", tag: "精选", created_from: "2026-09-01T00:00:00", created_to: "2026-09-10T23:59:59" },
    ],
    [
      "keyword_仅空白_视为空",
      { ...defaultFilter(), keyword: "   " },
      {},
    ],
    [
      "仅日期起点_转为闭区间ISO",
      { ...defaultFilter(), createdFrom: "2026-01-02" },
      { created_from: "2026-01-02T00:00:00" },
    ],
];

describe("serializeFilter（表驱动）", () => {
  it.each(cases)("%s", (_name, input, expected) => {
    expect(serializeFilter(input)).toEqual(expected);
  });
});

describe("isEmptyFilter", () => {
  it("默认筛选为空", () => {
    expect(isEmptyFilter(defaultFilter())).toBe(true);
  });

  it("任一非空白字段即非空", () => {
    expect(isEmptyFilter({ ...defaultFilter(), tag: "x" })).toBe(false);
  });
});
