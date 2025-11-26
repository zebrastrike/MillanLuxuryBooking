import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Mail, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import type { ContactMessage } from "@shared/types";
import { handleUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { normalizeArrayData } from "@/lib/arrayUtils";

export function ContactMessages() {
  const { toast } = useToast();
  
  const { data: messagesPayload, isLoading, error } = useQuery<ContactMessage[]>({
    queryKey: ["/api/contact"],
    retry: false,
  });

  const { items: messages = [], isValid: messagesValid } = normalizeArrayData<ContactMessage>(messagesPayload);

  useEffect(() => {
    if (error) {
      if (handleUnauthorizedError(error, toast)) {
        return;
      }
      toast({
        title: "Error",
        description: "Failed to load contact messages",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  useEffect(() => {
    if (!messagesValid && !isLoading && !error) {
      // eslint-disable-next-line no-console
      console.warn("[Admin] Unexpected contact messages response shape.", messagesPayload);
    }
  }, [messagesPayload, messagesValid, isLoading, error]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground py-8">
            <Mail className="mx-auto h-12 w-12 mb-3 opacity-50" />
            <p>No contact messages yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <Card key={message.id} data-testid={`card-message-${message.id}`}>
          <CardHeader className="space-y-2 pb-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <CardTitle className="text-lg">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  {message.name}
                </div>
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {format(new Date(message.timestamp), "PPp")}
              </div>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-3 w-3 text-muted-foreground" />
                <a 
                  href={`mailto:${message.email}`}
                  className="text-primary hover:underline"
                  data-testid={`link-email-${message.id}`}
                >
                  {message.email}
                </a>
              </div>
              <Badge variant="secondary" data-testid={`badge-service-${message.id}`}>
                {message.service}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap" data-testid={`text-message-${message.id}`}>
              {message.message}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
