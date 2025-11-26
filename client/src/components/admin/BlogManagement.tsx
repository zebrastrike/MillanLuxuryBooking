import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { normalizeArrayData } from "@/lib/arrayUtils";
import { handleUnauthorizedError, getErrorMessage } from "@/lib/authUtils";
import type { InsertPost, Post } from "@shared/types";
import { insertPostSchema } from "@shared/types";
import { Edit, Loader2, Plus, Trash2 } from "lucide-react";

const sortPosts = (items: Post[]) =>
  [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

type PostFormData = InsertPost;

export function BlogManagement() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const { data: postsPayload, isLoading, error } = useQuery<Post[]>({
    queryKey: ["/api/blog/get?admin=true"],
    retry: false,
  });

  const { items: posts = [], isValid: postsValid } = normalizeArrayData<Post>(postsPayload);
  const normalizeCachedPosts = (value: unknown) => normalizeArrayData<Post>(value).items;

  useEffect(() => {
    if (error) {
      if (handleUnauthorizedError(error, toast)) return;
      toast({ title: "Error", description: "Failed to load posts", variant: "destructive" });
    }
  }, [error, toast]);

  useEffect(() => {
    if (!postsValid && !isLoading && !error) {
      // eslint-disable-next-line no-console
      console.warn("[Admin] Unexpected posts payload shape.", postsPayload);
    }
  }, [postsPayload, postsValid, isLoading, error]);

  const uploadImageToBlob = async (
    file: File,
    form: ReturnType<typeof useForm<PostFormData>>,
  ) => {
    setIsUploadingImage(true);
    try {
      const res = await fetch(`/api/upload?prefix=blog-images`, {
        method: "POST",
        headers: {
          "content-type": file.type,
          "x-file-name": file.name,
        },
        body: file,
        credentials: "include",
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        const message = payload?.message ?? "Upload failed";
        throw new Error(message);
      }

      const url = (payload?.url ?? payload?.data?.url) as string | undefined;
      if (!url) {
        throw new Error("Upload failed");
      }

      form.setValue("imageUrl", url);
      toast({ title: "Success", description: "Image uploaded successfully" });
    } catch (uploadError) {
      toast({
        title: "Error",
        description:
          uploadError instanceof Error ? uploadError.message : "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const addForm = useForm<PostFormData>({
    resolver: zodResolver(insertPostSchema),
    defaultValues: {
      title: "",
      slug: "",
      excerpt: "",
      body: "",
      imageUrl: "",
      published: false,
    },
  });

  const editForm = useForm<PostFormData>({
    resolver: zodResolver(insertPostSchema),
    defaultValues: {
      title: "",
      slug: "",
      excerpt: "",
      body: "",
      imageUrl: "",
      published: false,
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: PostFormData) => {
      const res = await apiRequest("POST", "/api/blog/add", data);
      const body = await res.json().catch(() => null);
      return (body?.data ?? body) as Post | null;
    },
    onSuccess: (post) => {
      if (post) {
        queryClient.setQueryData<Post[]>(["/api/blog/get?admin=true"], (prev = []) => {
          const normalized = normalizeCachedPosts(prev);
          return sortPosts([...normalized, post]);
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/blog/get?admin=true"] });
      toast({ title: "Success", description: "Post created successfully" });
      addForm.reset();
      setIsAddDialogOpen(false);
    },
    onError: (mutationError) => {
      if (handleUnauthorizedError(mutationError, toast)) return;
      const message = getErrorMessage(mutationError) || "Failed to create post";
      addForm.setError("root", { message });
      toast({ title: "Error", description: message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<PostFormData> }) => {
      const res = await apiRequest("PATCH", `/api/blog/${id}`, data);
      const body = await res.json().catch(() => null);
      return (body?.data ?? body) as Post | null;
    },
    onSuccess: (post) => {
      if (post) {
        queryClient.setQueryData<Post[]>(["/api/blog/get?admin=true"], (prev = []) =>
          sortPosts(normalizeCachedPosts(prev).map((item) => (item.id === post.id ? post : item)))
        );
      }
      queryClient.invalidateQueries({ queryKey: ["/api/blog/get?admin=true"] });
      toast({ title: "Success", description: "Post updated successfully" });
      editForm.reset();
      setEditingPost(null);
    },
    onError: (mutationError) => {
      if (handleUnauthorizedError(mutationError, toast)) return;
      const message = getErrorMessage(mutationError) || "Failed to update post";
      editForm.setError("root", { message });
      toast({ title: "Error", description: message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/blog/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<Post[]>(["/api/blog/get?admin=true"], (prev = []) =>
        normalizeCachedPosts(prev).filter((post) => post.id !== id)
      );
      queryClient.invalidateQueries({ queryKey: ["/api/blog/get?admin=true"] });
      toast({ title: "Success", description: "Post deleted successfully" });
      setDeletingPostId(null);
    },
    onError: (mutationError) => {
      if (handleUnauthorizedError(mutationError, toast)) return;
      const message = getErrorMessage(mutationError) || "Failed to delete post";
      toast({ title: "Error", description: message, variant: "destructive" });
    },
  });

  const handleEdit = (post: Post) => {
    editForm.reset({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      body: post.body,
      imageUrl: post.imageUrl ?? "",
      published: post.published ?? false,
    });
    setEditingPost(post);
  };

  const onAddSubmit = (data: PostFormData) => addMutation.mutate(data);

  const onEditSubmit = (data: PostFormData) => {
    if (!editingPost) return;
    updateMutation.mutate({ id: editingPost.id, data });
  };

  return (
    <Card className="border-primary/10">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <h3 className="text-xl font-serif font-semibold">Blog Posts</h3>
          <p className="text-sm text-muted-foreground">Manage blog articles and publication status.</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New Post
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create post</DialogTitle>
              <DialogDescription>Publish news and updates for your clients.</DialogDescription>
            </DialogHeader>
            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
                <FormField
                  control={addForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Post title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. summer-cleaning-tips" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="excerpt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Excerpt</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Short summary of the post" rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Featured image URL (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2">
                  <FormLabel className="text-sm">Upload image</FormLabel>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        uploadImageToBlob(file, addForm);
                        event.target.value = "";
                      }
                    }}
                  />
                  {isUploadingImage && (
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading image...
                    </p>
                  )}
                </div>
                <FormField
                  control={addForm.control}
                  name="body"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Body</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Full post content" rows={6} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="published"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Published</FormLabel>
                        <p className="text-sm text-muted-foreground">Only published posts appear on the public site.</p>
                      </div>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={addMutation.isPending}>
                    {addMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create post
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, idx) => (
              <Skeleton key={idx} className="h-20 w-full" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No posts yet. Create your first post to get started.</p>
        ) : (
          <div className="space-y-3">
            {sortPosts(posts).map((post) => (
              <div
                key={post.id}
                className="flex flex-col gap-3 rounded-lg border border-primary/10 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-semibold">{post.title}</h4>
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">{post.slug}</span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">{post.published ? "Published" : "Draft"}</span>
                    {post.createdAt && (
                      <span className="ml-2">
                        • {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(post)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => setDeletingPostId(post.id)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={Boolean(editingPost)} onOpenChange={(open) => !open && setEditingPost(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit post</DialogTitle>
            <DialogDescription>Update the content or publication status.</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Post title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. summer-cleaning-tips" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
                <FormField
                  control={editForm.control}
                  name="excerpt"
                  render={({ field }) => (
                    <FormItem>
                    <FormLabel>Excerpt</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Short summary of the post" rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Featured image URL (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2">
                  <FormLabel className="text-sm">Upload image</FormLabel>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        uploadImageToBlob(file, editForm);
                        event.target.value = "";
                      }
                    }}
                  />
                  {isUploadingImage && (
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading image...
                    </p>
                  )}
                </div>
                <FormField
                  control={editForm.control}
                  name="body"
                  render={({ field }) => (
                    <FormItem>
                    <FormLabel>Body</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Full post content" rows={6} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="published"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Published</FormLabel>
                      <p className="text-sm text-muted-foreground">Only published posts appear on the public site.</p>
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deletingPostId)} onOpenChange={(open) => !open && setDeletingPostId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete post?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The post will be removed from both the admin list and the public site.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingPostId !== null && deleteMutation.mutate(deletingPostId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
