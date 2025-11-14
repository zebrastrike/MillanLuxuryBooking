import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { handleUnauthorizedError, getErrorMessage } from "@/lib/authUtils";
import { ImageIcon, Plus, Edit, Trash2, Loader2 } from "lucide-react";
import type { GalleryItem, InsertGalleryItem } from "@shared/schema";
import { insertGalleryItemSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

type GalleryFormData = InsertGalleryItem;

export function GalleryManagement() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);

  const { data: galleryData, isLoading, error } = useQuery<{ success: boolean; data: GalleryItem[] }>({
    queryKey: ["/api/gallery"],
    retry: false,
  });

  useEffect(() => {
    if (error) {
      if (handleUnauthorizedError(error, toast)) {
        return;
      }
      toast({
        title: "Error",
        description: "Failed to load gallery items",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const items = galleryData?.data || [];

  const addForm = useForm<GalleryFormData>({
    resolver: zodResolver(insertGalleryItemSchema),
    defaultValues: {
      title: "",
      category: "all",
    },
  });

  const editForm = useForm<GalleryFormData>({
    resolver: zodResolver(insertGalleryItemSchema),
  });

  const addMutation = useMutation({
    mutationFn: async (data: GalleryFormData) => {
      return await apiRequest("POST", "/api/gallery", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
      toast({
        title: "Success",
        description: "Gallery item created successfully",
      });
      setIsAddDialogOpen(false);
      addForm.reset();
    },
    onError: (error) => {
      if (handleUnauthorizedError(error, toast)) {
        return;
      }
      const message = getErrorMessage(error) || "Failed to create gallery item";
      addForm.setError("root", { message });
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<GalleryFormData> }) => {
      return await apiRequest("PATCH", `/api/gallery/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
      toast({
        title: "Success",
        description: "Gallery item updated successfully",
      });
      setEditingItem(null);
      editForm.reset();
    },
    onError: (error) => {
      if (handleUnauthorizedError(error, toast)) {
        return;
      }
      const message = getErrorMessage(error) || "Failed to update gallery item";
      editForm.setError("root", { message });
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/gallery/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
      toast({
        title: "Success",
        description: "Gallery item deleted successfully",
      });
      setDeletingItemId(null);
    },
    onError: (error) => {
      if (handleUnauthorizedError(error, toast)) {
        return;
      }
      toast({
        title: "Error",
        description: getErrorMessage(error) || "Failed to delete gallery item",
        variant: "destructive",
      });
      setDeletingItemId(null);
    },
  });

  const onAddSubmit = (data: GalleryFormData) => {
    addMutation.mutate(data);
  };

  const onEditSubmit = (data: GalleryFormData) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    }
  };

  const handleEdit = (item: GalleryItem) => {
    setEditingItem(item);
    editForm.reset({
      title: item.title,
      ...(item.imageUrl && { imageUrl: item.imageUrl }),
      ...(item.beforeImageUrl && { beforeImageUrl: item.beforeImageUrl }),
      ...(item.afterImageUrl && { afterImageUrl: item.afterImageUrl }),
      category: item.category as "deep-cleaning" | "move-in-out" | "all",
    });
  };

  const handleDeleteConfirm = () => {
    if (deletingItemId !== null) {
      deleteMutation.mutate(deletingItemId);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-32" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-48 w-full mb-3" />
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const GalleryForm = ({ form, onSubmit, isPending }: { 
    form: ReturnType<typeof useForm<GalleryFormData>>; 
    onSubmit: (data: GalleryFormData) => void;
    isPending: boolean;
  }) => {
    const rootError = form.formState.errors.root?.message;
    
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g. Kitchen Deep Clean" data-testid="input-title" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="deep-cleaning">Deep Cleaning</SelectItem>
                  <SelectItem value="move-in-out">Move-In/Move-Out</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="border-t pt-4">
          <p className="text-sm font-medium mb-3">Image Options (choose one)</p>
          
          <FormField
            control={form.control}
            name="imageUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Single Image URL</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ""} placeholder="/images/example.jpg or https://..." data-testid="input-imageUrl" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <p className="text-sm text-muted-foreground my-3 text-center">OR</p>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="beforeImageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Before Image URL</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} placeholder="/images/before.jpg" data-testid="input-beforeImageUrl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="afterImageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>After Image URL</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} placeholder="/images/after.jpg" data-testid="input-afterImageUrl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {rootError && (
            <p className="text-sm text-destructive mt-2" data-testid="error-root">
              {rootError}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="submit" disabled={isPending} data-testid="button-submit">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
        </form>
      </Form>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-gallery">
              <Plus className="mr-2 h-4 w-4" />
              Add Gallery Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Gallery Item</DialogTitle>
              <DialogDescription>
                Add a new photo to the gallery. Provide either a single image or before/after images.
              </DialogDescription>
            </DialogHeader>
            <GalleryForm form={addForm} onSubmit={onAddSubmit} isPending={addMutation.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground py-8">
              <ImageIcon className="mx-auto h-12 w-12 mb-3 opacity-50" />
              <p className="mb-4">No gallery items yet.</p>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Item
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <Card key={item.id} data-testid={`card-gallery-${item.id}`} className="group relative">
              <CardContent className="p-4">
                {item.beforeImageUrl && item.afterImageUrl ? (
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="aspect-square rounded overflow-hidden bg-muted">
                      <img 
                        src={item.beforeImageUrl} 
                        alt={`${item.title} - Before`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="aspect-square rounded overflow-hidden bg-muted">
                      <img 
                        src={item.afterImageUrl} 
                        alt={`${item.title} - After`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                ) : item.imageUrl ? (
                  <div className="aspect-square rounded overflow-hidden bg-muted mb-3">
                    <img 
                      src={item.imageUrl} 
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : null}
                
                <h3 className="font-medium mb-2" data-testid={`text-title-${item.id}`}>
                  {item.title}
                </h3>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary" className="text-xs">
                    {item.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Order: {item.order}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEdit(item)}
                    data-testid={`button-edit-${item.id}`}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setDeletingItemId(item.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-${item.id}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Gallery Item</DialogTitle>
            <DialogDescription>
              Update the gallery item details.
            </DialogDescription>
          </DialogHeader>
          <GalleryForm form={editForm} onSubmit={onEditSubmit} isPending={updateMutation.isPending} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deletingItemId !== null} onOpenChange={(open) => !open && setDeletingItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Gallery Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this gallery item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending} data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
