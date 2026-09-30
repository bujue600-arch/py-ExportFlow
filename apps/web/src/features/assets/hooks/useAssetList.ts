import { useQuery } from "@tanstack/react-query";
import { request } from "../../../api/client";
import { assetListKey } from "../keys";
import type { FilterDraft } from "../lib/filter";
import type { AssetListResponse } from "../types";

export function useAssetList(page: number, pageSize: number, filter: FilterDraft) {
  return useQuery({
    queryKey: assetListKey(page, pageSize, filter),
    queryFn: ({ queryKey, signal }) => {
      const params = new URLSearchParams();
      for (const [name, value] of Object.entries(queryKey[2])) params.set(name, String(value));
      return request<AssetListResponse>(`/api/assets?${params}`, { signal });
    },
    retry: false,
    refetchOnWindowFocus: false,
  });
}
