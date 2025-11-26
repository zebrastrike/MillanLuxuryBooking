import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { handleUnauthorizedError, getErrorMessage } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { normalizeArrayData } from "@/lib/arrayUtils";
import type { Faq } from "@shared/types";
import { insertFaqSchema } from "@shared/types";
import { Plus, Edit, Trash2, Loader2, HelpCircle } from "lucide-react";
import { z } from "zod";

const toNumberOrUndefined = (value: string) => {
  if (value === "" || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

type FaqFormData = z.infer<typeof insertFaqSchema>;

export function FaqManagement() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Faq | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);

  const { data: faqsPayload, isLoading, error } = useQuery<Faq[]>({
    queryKey: ["/api/faq/get"],
    retry: false,
  });

  const { items: faqs = [], isValid: faqsValid } = normalizeArrayData<Faq>(faqsPayload);
  const normalizeCachedFaqs = (value: unknown) => normalizeArrayData<Faq>(value).items;

  useEffect(() => {
    if (error) {
      if (handleUnauthorizedError(error, toast)) {
        return;
      }
      toast({
        title: "Error",
        description: "Failed to load FAQs",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  useEffect(() => {
    if (!faqsValid && !isLoading && !error) {
      // eslint-disable-next-line no-console
      console.warn("[Admin] Unexpected FAQs payload shape.", faqsPayload);
    }
  }, [faqsPayload, faqsValid, isLoading, error]);

  const addForm = useForm<FaqFormData>({
    resolver: zodResolver(insertFaqSchema),
    defaultValues: {
      question: "",
      answer: "",
      order: undefined,
    },
  });

  const editForm = useForm<FaqFormData>({
    resolver: zodResolver(insertFaqSchema),
    defaultValues: {
      question: "",
      answer: "",
      order: undefined,
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: FaqFormData) => {
      const res = await apiRequest("POST", "/api/faq/add", data);
      const body = await res.json().catch(() => null);
      return (body?.data ?? body) as Faq | null;
    },
    onSuccess: (item) => {
      if (item) {
        queryClient.setQueryData<Faq[]>(["/api/faq/get"], (prev = []) => {
          const normalizedPrev = normalizeCachedFaqs(prev);
          const next = [...normalizedPrev, item];
          return next.sort((a, b) => {
            if ((a.order ?? 0) === (b.order ?? 0)) return a.id - b.id;
            return (a.order ?? 0) - (b.order ?? 0);
          });
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/faq/get"] });
      toast({
        title: "Success",
        description: "FAQ created successfully",
      });
      setIsAddDialogOpen(false);
      addForm.reset();
    },
    onError: (error) => {
      if (handleUnauthorizedError(error, toast)) {
        return;
      }
      const message = getErrorMessage(error) || "Failed to create FAQ";
      addForm.setError("root", { message });
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<FaqFormData> }) => {
      const res = await apiRequest("PATCH", `/api/faq/${id}`, data);
      const body = await res.json().catch(() => null);
      return (body?.data ?? body) as Faq | null;
    },
    onSuccess: (item) => {
      if (item) {
        queryClient.setQueryData<Faq[]>(["/api/faq/get"], (prev = []) =>
          normalizeCachedFaqs(prev).map((faq) => (faq.id === item.id ? item : faq))
        );
      }
      queryClient.invalidateQueries({ queryKey: ["/api/faq/get"] });
      toast({
        title: "Success",
        description: "FAQ updated successfully",
      });
      setEditingItem(null);
      editForm.reset();
    },
    onError: (error) => {
      if (handleUnauthorizedError(error, toast)) {
        return;
      }
      const message = getErrorMessage(error) || "Failed to update FAQ";
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
      await apiRequest("DELETE", `/api/faq/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<Faq[]>(["/api/faq/get"], (prev = []) =>
        normalizeCachedFaqs(prev).filter((item) => item.id !== id)
      );
      queryClient.invalidateQueries({ queryKey: ["/api/faq/get"] });
      toast({
        title: "Success",
        description: "FAQ deleted successfully",
      });
      setDeletingItemId(null);
    },
    onError: (error) => {
      if (handleUnauthorizedError(error, toast)) {
        return;
      }
      const message = getErrorMessage(error) || "Failed to delete FAQ";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (item: Faq) => {
    editForm.reset({
      question: item.question,
      answer: item.answer,
      order: item.order ?? undefined,
    });
    setEditingItem(item);
  };

  const onAddSubmit = (data: FaqFormData) => {
    addMutation.mutate(data);
  };

  const onEditSubmit = (data: FaqFormData) => {
    if (!editingItem) return;
    updateMutation.mutate({ id: editingItem.id, data });
  };

  const renderFormFields = (form: typeof addForm) => (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="question"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Question</FormLabel>
            <FormControl>
              <Input placeholder="Enter FAQ question" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="answer"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Answer</FormLabel>
            <FormControl>
              <Textarea rows={4} placeholder="Enter FAQ answer" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="order"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Display Order (optional)</FormLabel>
            <FormControl>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Leave blank to auto-place"
                {...field}
                value={field.value ?? ""}
                onChange={(event) => field.onChange(toNumberOrUndefined(event.target.value))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {form.formState.errors.root && (
        <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-xl font-semibold">Frequently Asked Questions</h3>
          </div>
          <p className="text-sm text-muted-foreground">Manage the questions shown on the public site</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add FAQ
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add FAQ</DialogTitle>
              <DialogDescription>Provide the question and answer shown to visitors.</DialogDescription>
            </DialogHeader>
            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-6">
                {renderFormFields(addForm)}
                <DialogFooter>
                  <Button type="submit" disabled={addMutation.isPending}>
                    {addMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save FAQ
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : faqs.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">No FAQs added yet.</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {faqs.map((faq) => (
            <Card key={faq.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-lg">{faq.question}</CardTitle>
                  <CardDescription>Order: {faq.order ?? 0}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => handleEdit(faq)} data-testid={`faq-edit-${faq.id}`}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => setDeletingItemId(faq.id)}
                    data-testid={`faq-delete-${faq.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{faq.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={Boolean(editingItem)} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit FAQ</DialogTitle>
            <DialogDescription>Update the question, answer, or display order.</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
              {renderFormFields(editForm)}
              <DialogFooter>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deletingItemId !== null} onOpenChange={(open) => !open && setDeletingItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete FAQ</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingItemId !== null && deleteMutation.mutate(deletingItemId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
