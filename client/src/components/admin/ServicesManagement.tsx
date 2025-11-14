import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase } from "lucide-react";
import type { Service } from "@shared/schema";
import { handleUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";

export function ServicesManagement() {
  const { toast } = useToast();
  
  const { data: servicesData, isLoading, error} = useQuery<{ success: boolean; data: Service[] }>({
    queryKey: ["/api/services"],
    retry: false,
  });

  useEffect(() => {
    if (error) {
      if (handleUnauthorizedError(error, toast)) {
        return;
      }
      toast({
        title: "Error",
        description: "Failed to load services",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const services = servicesData?.data || [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-2/3 mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground py-8">
            <Briefcase className="mx-auto h-12 w-12 mb-3 opacity-50" />
            <p>No services yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {services.map((service) => (
        <Card key={service.id} data-testid={`card-service-${service.id}`} className="hover-elevate">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-lg" data-testid={`text-name-${service.id}`}>
                  {service.name}
                </CardTitle>
                <CardDescription className="mt-1">
                  {service.description}
                </CardDescription>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Order: {service.order}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {service.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
