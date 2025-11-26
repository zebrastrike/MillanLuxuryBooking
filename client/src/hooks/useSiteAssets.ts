import { useQuery } from "@tanstack/react-query";
import type { Asset, SiteAsset } from "@shared/schema";

export type SiteAssetMap = Record<string, Asset>;

type SiteAssetResponseRecord = (Asset & { key?: string }) | (SiteAsset & { key?: string });

function normalizeAsset(asset: SiteAssetResponseRecord, keyFallback?: string): Asset | null {
  if (!asset?.url) return null;

  try {
    const inferredName = "name" in asset ? (asset as SiteAssetResponseRecord & { name?: string }).name : undefined;
    const filename = asset.filename || inferredName || asset.publicId?.split("/").pop() || new URL(asset.url).pathname.split("/").pop();
    const publicId = asset.publicId || new URL(asset.url).pathname;

    return {
      id: String((asset as any).id ?? (asset as any).key ?? keyFallback ?? filename ?? asset.url),
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
      const res = await fetch("/api/assets", { credentials: "include" });
      if (!res.ok) {
        throw new Error("Failed to load site assets");
      }
      const payload = await res.json();
      const assets = payload?.data ?? payload ?? {};

      if (Array.isArray(assets)) {
        return (assets as SiteAssetResponseRecord[]).reduce<SiteAssetMap>((acc, asset) => {
          if (asset?.key && asset?.url) {
            const normalized = normalizeAsset(asset);
            if (normalized) {
              acc[asset.key] = normalized;
            }
          }
          return acc;
        }, {});
      }

      if (assets && typeof assets === "object") {
        return Object.entries(assets as Record<string, SiteAssetResponseRecord>).reduce<SiteAssetMap>(
          (acc, [key, value]) => {
            const normalized = normalizeAsset(value, key);
            if (normalized) {
              acc[key] = normalized;
            }
            return acc;
          },
          {},
        );
      }

      return {};
    },
    initialData: {},
  });
}
