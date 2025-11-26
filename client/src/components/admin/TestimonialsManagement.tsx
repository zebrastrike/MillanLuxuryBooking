import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { handleUnauthorizedError, getErrorMessage } from "@/lib/authUtils";
import { Star, Plus, Edit, Trash2, Loader2 } from "lucide-react";
import type { Testimonial, InsertTestimonial } from "@shared/types";
import { insertTestimonialSchema, testimonialSourceSchema } from "@shared/types";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { normalizeArrayData } from "@/lib/arrayUtils";

type TestimonialFormData = InsertTestimonial;
const testimonialSources = testimonialSourceSchema.options;

export function TestimonialsManagement() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Testimonial | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);

  const { data: testimonialsPayload, isLoading, error } = useQuery<Testimonial[]>({
    queryKey: ["/api/testimonials"],
    retry: false,
  });

  const { items: testimonials = [], isValid: testimonialsValid } = normalizeArrayData<Testimonial>(testimonialsPayload);
  const normalizeCachedTestimonials = (value: unknown) => normalizeArrayData<Testimonial>(value).items;

  useEffect(() => {
    if (error) {
      if (handleUnauthorizedError(error, toast)) {
        return;
      }
      toast({
        title: "Error",
        description: "Failed to load testimonials",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  useEffect(() => {
    if (!testimonialsValid && !isLoading && !error) {
      // eslint-disable-next-line no-console
      console.warn("[Admin] Unexpected testimonials payload shape.", testimonialsPayload);
    }
  }, [testimonialsPayload, testimonialsValid, isLoading, error]);

  const addForm = useForm<TestimonialFormData>({
    resolver: zodResolver(insertTestimonialSchema),
    defaultValues: {
      name: "",
      review: "",
      rating: 5,
      source: "manual",
      sourceUrl: "",
    },
  });

  const editForm = useForm<TestimonialFormData>({
    resolver: zodResolver(insertTestimonialSchema),
    defaultValues: {
      name: "",
      review: "",
      rating: 5,
      source: "manual",
      sourceUrl: "",
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: TestimonialFormData) => {
      const res = await apiRequest("POST", "/api/testimonials", data);
      const body = await res.json().catch(() => null);
      return (body?.data ?? body) as Testimonial | null;
    },
    onSuccess: (item) => {
      if (item) {
        queryClient.setQueryData<Testimonial[]>(["/api/testimonials"], (prev = []) => {
          const normalizedPrev = normalizeCachedTestimonials(prev);
          const next = [...normalizedPrev, item];
          return next.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/testimonials"] });
      toast({
        title: "Success",
        description: "Testimonial created successfully",
      });
      setIsAddDialogOpen(false);
      addForm.reset();
    },
    onError: (error) => {
      if (handleUnauthorizedError(error, toast)) {
        return;
      }
      const message = getErrorMessage(error) || "Failed to create testimonial";
      addForm.setError("root", { message });
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<TestimonialFormData> }) => {
      const res = await apiRequest("PATCH", `/api/testimonials/${id}`, data);
      const body = await res.json().catch(() => null);
      return (body?.data ?? body) as Testimonial | null;
    },
    onSuccess: (item) => {
      if (item) {
        queryClient.setQueryData<Testimonial[]>(["/api/testimonials"], (prev = []) =>
          normalizeCachedTestimonials(prev).map((existing) => (existing.id === item.id ? item : existing))
        );
      }
      queryClient.invalidateQueries({ queryKey: ["/api/testimonials"] });
      toast({
        title: "Success",
        description: "Testimonial updated successfully",
      });
      setEditingItem(null);
      editForm.reset();
    },
    onError: (error) => {
      if (handleUnauthorizedError(error, toast)) {
        return;
      }
      const message = getErrorMessage(error) || "Failed to update testimonial";
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
      await apiRequest("DELETE", `/api/testimonials/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<Testimonial[]>(["/api/testimonials"], (prev = []) =>
        normalizeCachedTestimonials(prev).filter((item) => item.id !== id)
      );
      queryClient.invalidateQueries({ queryKey: ["/api/testimonials"] });
      toast({
        title: "Success",
        description: "Testimonial deleted successfully",
      });
      setDeletingItemId(null);
    },
    onError: (error) => {
      if (handleUnauthorizedError(error, toast)) {
        return;
      }
      const message = getErrorMessage(error) || "Failed to delete testimonial";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (item: Testimonial) => {
    editForm.reset({
      name: item.name,
      review: item.review,
      rating: item.rating,
      source: item.source ?? "manual",
      sourceUrl: item.sourceUrl ?? "",
    });
    setEditingItem(item);
  };

  const onAddSubmit = (data: TestimonialFormData) => {
    addMutation.mutate(data);
  };

  const onEditSubmit = (data: TestimonialFormData) => {
    if (!editingItem) return;
    updateMutation.mutate({ id: editingItem.id, data });
  };

  const handleDeleteConfirm = () => {
    if (deletingItemId) {
      deleteMutation.mutate(deletingItemId);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-1/3 mb-2" />
              <Skeleton className="h-4 w-1/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-testimonial">
              <Plus className="mr-2 h-4 w-4" />
              Add Testimonial
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Testimonial</DialogTitle>
              <DialogDescription>
                Add a new customer testimonial.
              </DialogDescription>
            </DialogHeader>
            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
                <FormField
                  control={addForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="John Doe" data-testid="input-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addForm.control}
                  name="review"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Review</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Enter the testimonial..." data-testid="textarea-review" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addForm.control}
                  name="rating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rating: {field.value ?? 5} / 5</FormLabel>
                      <FormControl>
                        <Slider
                          value={[field.value ?? 5]}
                          onValueChange={(val) => field.onChange(val[0])}
                          min={1}
                          max={5}
                          step={1}
                          data-testid="slider-rating"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addForm.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? "manual"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-source">
                            <SelectValue placeholder="Select source" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {testimonialSources.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option === "manual" ? "Manual" : option.charAt(0).toUpperCase() + option.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addForm.control}
                  name="sourceUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source URL</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="https://"
                          data-testid="input-source-url"
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {addForm.formState.errors.root?.message && (
                  <p className="text-sm text-destructive">{addForm.formState.errors.root.message}</p>
                )}

                <DialogFooter>
                  <Button type="submit" disabled={addMutation.isPending} data-testid="button-submit">
                    {addMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {addMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {testimonials.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground py-8">
              <Star className="mx-auto h-12 w-12 mb-3 opacity-50" />
              <p className="mb-4">No testimonials yet.</p>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Testimonial
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.id} data-testid={`card-testimonial-${testimonial.id}`} className="hover-elevate">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold" data-testid={`text-name-${testimonial.id}`}>
                      {testimonial.name}
                    </h3>
                    <div className="flex items-center gap-1 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < testimonial.rating
                              ? "fill-primary text-primary"
                              : "fill-muted text-muted"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(testimonial)}
                      data-testid={`button-edit-${testimonial.id}`}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeletingItemId(testimonial.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${testimonial.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground" data-testid={`text-review-${testimonial.id}`}>
                  {testimonial.review}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Testimonial</DialogTitle>
            <DialogDescription>
              Update the testimonial details.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="review"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Review</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="textarea-edit-review" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rating: {field.value ?? 5} / 5</FormLabel>
                    <FormControl>
                      <Slider
                        value={[field.value ?? 5]}
                        onValueChange={(val) => field.onChange(val[0])}
                        min={1}
                        max={5}
                        step={1}
                        data-testid="slider-edit-rating"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? "manual"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-source">
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {testimonialSources.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option === "manual" ? "Manual" : option.charAt(0).toUpperCase() + option.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="sourceUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source URL</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        data-testid="input-edit-source-url"
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {editForm.formState.errors.root?.message && (
                <p className="text-sm text-destructive">{editForm.formState.errors.root.message}</p>
              )}

              <DialogFooter>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-update">
                  {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {updateMutation.isPending ? "Updating..." : "Update"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deletingItemId !== null} onOpenChange={(open) => !open && setDeletingItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Testimonial</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this testimonial? This action cannot be undone.
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
