import type { AssetStatus, AssetType } from "./lib/filter";

/** GET /api/assets 的作品形状，见 api-contract.md §4。 */
export interface Asset {
  id: string;
  title: string;
  asset_type: AssetType;
  status: AssetStatus;
  tags: string[];
  size_bytes: number;
  created_at: string;
}
