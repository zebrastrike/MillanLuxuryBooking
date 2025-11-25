import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ImageIcon, Loader2 } from "lucide-react";

export type BlobBrowserModalProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  prefix: "assets/" | "gallery/";
};

type BlobFile = {
  url: string;
  pathname: string;
  size?: number;
  uploadedAt?: string;
};

export function BlobBrowserModal({ open, onClose, onSelect, prefix }: BlobBrowserModalProps) {
  const { data, isLoading, isError, error } = useQuery<BlobFile[]>({
    queryKey: ["blob-files", prefix],
    enabled: open,
    queryFn: async () => {
      const res = await fetch(`/api/blob/list?prefix=${encodeURIComponent(prefix)}`, {
        credentials: "include",
      });

      if (!res.ok) {
        const message = (await res.json().catch(() => null))?.message || "Failed to load files";
        throw new Error(message);
      }

      const payload = await res.json();
      return Array.isArray(payload) ? payload : [];
    },
  });

  const files = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Choose an Image</DialogTitle>
          <DialogDescription>Select from existing uploads in Vercel Blob.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{(error as Error)?.message || "Failed to load images."}</AlertDescription>
          </Alert>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
            <p>No images found for this folder.</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {files.map((file) => (
                <button
                  key={file.pathname}
                  type="button"
                  className="group overflow-hidden rounded border bg-muted/40 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                  onClick={() => {
                    onSelect(file.url);
                    onClose();
                  }}
                >
                  <div className="aspect-square w-full overflow-hidden bg-background">
                    <img
                      src={file.url}
                      alt={file.pathname}
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                  </div>
                  <div className="px-3 py-2 text-left">
                    <p className="truncate text-sm font-medium" title={file.pathname}>
                      {file.pathname.split("/").pop() || file.pathname}
                    </p>
                    {file.size ? (
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
