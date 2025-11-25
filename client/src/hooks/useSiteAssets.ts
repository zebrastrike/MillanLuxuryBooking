import { useQuery } from "@tanstack/react-query";

export type SiteAssetMap = Record<string, string>;

export function useSiteAssets() {
  return useQuery<SiteAssetMap>({
    queryKey: ["/api/assets"],
    queryFn: async () => {
      const res = await fetch("/api/assets");
      if (!res.ok) {
        throw new Error("Failed to load site assets");
      }
      const assets = (await res.json()) as Array<{ key: string; url: string }>;
      return assets.reduce<SiteAssetMap>((acc, asset) => {
        if (asset.key && asset.url) {
          acc[asset.key] = asset.url;
        }
        return acc;
      }, {});
    },
  });
}
