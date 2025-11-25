import { useQuery } from "@tanstack/react-query";
import type { SiteAsset } from "@shared/schema";

export type SiteAssetMap = Record<string, string>;

export function useSiteAssets() {
  return useQuery<SiteAssetMap>({
    queryKey: ["/api/assets"],
    queryFn: async () => {
      const res = await fetch("/api/assets");
      if (!res.ok) {
        throw new Error("Failed to load site assets");
      }
      const payload = await res.json();
      const assets = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : [];

      return (assets as SiteAsset[]).reduce<SiteAssetMap>((acc, asset) => {
        if (asset?.key && asset?.url) {
          acc[asset.key] = asset.url;
        }
        return acc;
      }, {});
    },
    initialData: {},
  });
}
