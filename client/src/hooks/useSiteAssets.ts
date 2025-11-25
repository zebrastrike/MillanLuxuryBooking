import { useQuery } from "@tanstack/react-query";
import type { Asset, SiteAsset } from "@shared/schema";

export type SiteAssetMap = Record<string, Asset>;

function normalizeAsset(asset: SiteAsset): Asset | null {
  if (!asset?.url) return null;

  try {
    const filename = asset.filename || asset.name || asset.publicId?.split("/").pop() || new URL(asset.url).pathname.split("/").pop();
    const publicId = asset.publicId || new URL(asset.url).pathname;

    return {
      id: String(asset.id ?? asset.key ?? filename ?? asset.url),
      url: asset.url,
      publicId,
      filename: filename ?? "asset",
    };
  } catch {
    return null;
  }
}

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
          const normalized = normalizeAsset(asset);
          if (normalized) {
            acc[asset.key] = normalized;
          }
        }
        return acc;
      }, {});
    },
    initialData: {},
  });
}
