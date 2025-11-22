import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Star } from "lucide-react";
import type { Testimonial } from "@shared/schema";
import { handleUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";

export function TestimonialsManagement() {
  const { toast } = useToast();
  
  const { data: testimonials = [], isLoading, error } = useQuery<Testimonial[]>({
    queryKey: ["/api/testimonials"],
    retry: false,
  });

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

  if (testimonials.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground py-8">
            <Star className="mx-auto h-12 w-12 mb-3 opacity-50" />
            <p>No testimonials yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {testimonials.map((testimonial) => (
        <Card key={testimonial.id} data-testid={`card-testimonial-${testimonial.id}`} className="hover-elevate">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div>
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
              <span className="text-xs text-muted-foreground">
                Order: {testimonial.order}
              </span>
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
  );
}
