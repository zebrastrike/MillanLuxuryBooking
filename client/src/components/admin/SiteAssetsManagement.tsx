import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useSiteAssets, type SiteAssetMap } from "@/hooks/useSiteAssets";
import { Loader2, Upload } from "lucide-react";

const assetFields = [
  { key: "logo", label: "Logo URL", description: "Shown in navigation and hero." },
  { key: "heroBackground", label: "Hero Background", description: "Large landing background image." },
  { key: "servicesBackground", label: "Services Background", description: "Behind the services section." },
  { key: "aboutBackground", label: "About Background", description: "Behind the about section." },
  { key: "aboutPortrait", label: "Owner Portrait", description: "Photo in the about card." },
];

export function SiteAssetsManagement() {
  const { data, isLoading: assetsLoading } = useSiteAssets();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const assetValues = useMemo(() => data ?? {}, [data]);

  const updateMutation = useMutation({
    mutationFn: async ({ key, url }: { key: string; url: string }) => {
      const res = await apiRequest("PUT", `/api/assets/${key}`, { url });
      const body = await res.json();
      return (body?.data ?? body) as { key: string; url: string; publicId?: string; filename?: string };
    },
    onSuccess: (asset) => {
      queryClient.setQueryData<SiteAssetMap>(["/api/assets"], (prev = {}) => ({
        ...prev,
        [asset.key]: {
          id: String(prev[asset.key]?.id ?? asset.key),
          url: asset.url,
          publicId: asset.publicId ?? prev[asset.key]?.publicId ?? "",
          filename: asset.filename ?? prev[asset.key]?.filename ?? asset.key,
        },
      }));
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({ title: "Updated", description: "Asset saved successfully." });
    },
    onError: (error: unknown) => {
      toast({ title: "Error", description: (error as Error)?.message ?? "Failed to save asset", variant: "destructive" });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ key, file }: { key: string; file: File }) => {
      const formData = new FormData();
      formData.append("key", key);
      formData.append("file", file);
      formData.append("name", file.name);

      const res = await fetch("/api/assets", { method: "POST", body: formData, credentials: "include" });
      const body = await res.json();

      if (!res.ok || !body?.data?.url) {
        throw new Error(body?.message || "Upload failed");
      }

      return body.data as { key: string; url: string; publicId?: string; filename?: string };
    },
    onSuccess: (asset) => {
      queryClient.setQueryData<SiteAssetMap>(["/api/assets"], (prev = {}) => ({
        ...prev,
        [asset.key]: {
          id: String(prev[asset.key]?.id ?? asset.key),
          url: asset.url,
          publicId: asset.publicId ?? prev[asset.key]?.publicId ?? "",
          filename: asset.filename ?? prev[asset.key]?.filename ?? asset.key,
        },
      }));
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({ title: "Uploaded", description: "Image uploaded successfully." });
    },
    onError: (error: unknown) => {
      toast({ title: "Upload failed", description: (error as Error).message, variant: "destructive" });
    },
  });

  const handleUpload = async (key: string, file?: File | null) => {
    if (!file) return;
    setUploadingKey(key);
    uploadMutation.mutate({ key, file }, { onSettled: () => setUploadingKey(null) });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brand Assets</CardTitle>
        <CardDescription>Manage logo and background images stored in Vercel Blob.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {assetFields.map((field) => {
          const currentAsset = assetValues[field.key];
          const currentValue = currentAsset?.url ?? "";
          return (
            <div key={field.key} className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor={`asset-${field.key}`} className="text-base">{field.label}</Label>
                  <p className="text-sm text-muted-foreground">{field.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                    <Upload className="h-4 w-4" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleUpload(field.key, e.target.files?.[0])}
                    />
                  </label>
                  {uploadingKey === field.key && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-3">
                <Input
                  id={`asset-${field.key}`}
                  defaultValue={currentValue}
                  placeholder="https://..."
                  onBlur={(e) => {
                    const value = e.target.value.trim();
                    if (value && value !== currentValue) {
                      updateMutation.mutate({ key: field.key, url: value });
                    }
                  }}
                />
                {currentValue && (
                  <div className="flex-shrink-0 w-24 h-16 rounded border overflow-hidden bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={currentValue} alt={`${field.label} preview`} className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              <Separator />
            </div>
          );
        })}
        {assetsLoading && <p className="text-sm text-muted-foreground">Loading assets...</p>}
      </CardContent>
    </Card>
  );
}
