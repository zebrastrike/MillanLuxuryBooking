import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ImageIcon, Loader2, RefreshCw, Trash2 } from "lucide-react";

const assetKeys = [
  { key: "logo", label: "Logo" },
  { key: "heroCrown", label: "Hero Crown" },
  { key: "heroBackground", label: "Hero Background" },
  { key: "servicesBackground", label: "Services Background" },
  { key: "aboutBackground", label: "About Background" },
  { key: "aboutPortrait", label: "Owner Portrait" },
];

export type BlobSummary = {
  url: string;
  pathname: string;
  size?: number;
  uploadedAt?: string;
};

export function BlobBrowser() {
  const [prefix, setPrefix] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isFetching, isLoading, error, refetch } = useQuery<BlobSummary[]>({
    queryKey: ["/api/blob", prefix],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (prefix) params.set("prefix", prefix);
      const res = await apiRequest("GET", `/api/blob${params.size ? `?${params.toString()}` : ""}`);
      const payload = await res.json();
      const blobs = payload?.data ?? payload;
      return Array.isArray(blobs) ? blobs : [];
    },
  });

  const files = useMemo(() => data ?? [], [data]);

  const setAssetMutation = useMutation({
    mutationFn: async ({ key, blob }: { key: string; blob: BlobSummary }) => {
      const filename = blob.pathname.split("/").pop() ?? key;
      const res = await apiRequest("PUT", `/api/assets/${key}`, {
        url: blob.url,
        filename,
        publicId: blob.pathname,
      });
      const body = await res.json();
      return body?.data ?? body;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({ title: "Updated", description: `Updated ${variables.key} asset.` });
    },
    onError: (err: any) => {
      toast({ title: "Update failed", description: err?.message ?? "Failed to set asset", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await apiRequest("DELETE", "/api/blob", { url });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blob"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({ title: "Deleted", description: "Blob removed successfully." });
    },
    onError: (err: any) => {
      const description = err?.body?.error || err?.message || "Failed to delete blob";
      toast({ title: "Delete failed", description, variant: "destructive" });
    },
  });

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Copied", description: "URL copied to clipboard" });
    } catch (err) {
      toast({ title: "Copy failed", description: (err as Error)?.message ?? "Unable to copy" });
    }
  };

  const formatSize = (size?: number) => {
    if (!size) return "";
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (value?: string) => {
    if (!value) return "";
    try {
      const parsed = new Date(value);
      return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(parsed);
    } catch {
      return value;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Vercel Blob Browser</CardTitle>
          <CardDescription>Browse, assign, and delete images stored in Vercel Blob.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Filter by prefix (e.g. assets/, gallery/)"
            value={prefix}
            onChange={(event) => setPrefix(event.target.value)}
            className="w-56"
          />
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
            {(error as Error).message || "Failed to load blobs"}
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
            <p>No blobs found.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {files.map((blob) => {
              const selectedKey = selectedKeys[blob.pathname] ?? "";
              return (
                <div key={blob.pathname} className="rounded-lg border bg-card shadow-sm">
                  <div className="aspect-square overflow-hidden rounded-t-lg bg-muted">
                    <img src={blob.url} alt={blob.pathname} className="h-full w-full object-cover" />
                  </div>
                  <div className="space-y-2 p-3 text-sm">
                    <p className="font-medium truncate" title={blob.pathname}>
                      {blob.pathname.split("/").pop() || blob.pathname}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {blob.size ? <Badge variant="secondary">{formatSize(blob.size)}</Badge> : null}
                      {blob.uploadedAt ? <Badge variant="outline">{formatDate(blob.uploadedAt)}</Badge> : null}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedKey}
                          onChange={(event) =>
                            setSelectedKeys((prev) => ({ ...prev, [blob.pathname]: event.target.value }))
                          }
                          className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                        >
                          <option value="">Set as asset…</option>
                          {assetKeys.map((asset) => (
                            <option key={asset.key} value={asset.key}>
                              {asset.label}
                            </option>
                          ))}
                        </select>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={!selectedKey || setAssetMutation.isPending}
                          onClick={() => selectedKey && setAssetMutation.mutate({ key: selectedKey, blob })}
                        >
                          {setAssetMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleCopy(blob.url)}>
                          Copy URL
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteMutation.mutate(blob.url)}
                          disabled={deleteMutation.isPending}
                        >
                          {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
