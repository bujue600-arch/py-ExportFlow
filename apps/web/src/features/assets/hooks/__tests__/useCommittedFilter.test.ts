import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useCommittedFilter } from "../useCommittedFilter";
import { defaultFilter } from "../../lib/filter";

describe("useCommittedFilter（bullet ⑤：输入不触发请求 → 结构上表现为 committed 不变）", () => {
  it("键入_只改草稿_已提交条件不变", () => {
    const { result } = renderHook(() => useCommittedFilter());

    act(() => result.current.setDraft({ ...defaultFilter(), keyword: "漫" }));

    expect(result.current.draft.keyword).toBe("漫");
    expect(result.current.committed).toEqual(defaultFilter());
  });

  it("连续键入多次_已提交条件仍不变_请求量与键入解耦", () => {
    const { result } = renderHook(() => useCommittedFilter());

    for (const kw of ["漫", "漫剧", "漫剧第"]) {
      act(() => result.current.setDraft({ ...defaultFilter(), keyword: kw }));
    }

    expect(result.current.draft.keyword).toBe("漫剧第");
    expect(result.current.committed.keyword).toBe("");
  });

  it("提交_冻结当前草稿为快照", () => {
    const { result } = renderHook(() => useCommittedFilter());

    act(() => result.current.setDraft({ ...defaultFilter(), assetType: "video" }));
    act(() => result.current.submit());

    expect(result.current.committed.assetType).toBe("video");

    // 提交后再改草稿，不影响已提交快照
    act(() => result.current.setDraft({ ...defaultFilter(), assetType: "script" }));
    expect(result.current.committed.assetType).toBe("video");
  });

  it("重置_两层同时回默认", () => {
    const { result } = renderHook(() => useCommittedFilter());

    act(() => result.current.setDraft({ ...defaultFilter(), keyword: "x" }));
    act(() => result.current.submit());
    act(() => result.current.reset());

    expect(result.current.draft).toEqual(defaultFilter());
    expect(result.current.committed).toEqual(defaultFilter());
  });
});
