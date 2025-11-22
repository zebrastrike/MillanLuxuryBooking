import { useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { SignIn } from "@clerk/clerk-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, LogOut, ImageIcon, MessageSquare, Star, Briefcase } from "lucide-react";
import { ContactMessages } from "@/components/admin/ContactMessages";
import { GalleryManagement } from "@/components/admin/GalleryManagement";
import { TestimonialsManagement } from "@/components/admin/TestimonialsManagement";
import { ServicesManagement } from "@/components/admin/ServicesManagement";
import { useQuery } from "@tanstack/react-query";

export default function Admin() {
  const { toast } = useToast();
  const { userId, isLoaded, signOut } = useAuth();
  
  // Fetch current user from database to check admin status
  const { data: userResponse, isLoading: isUserLoading } = useQuery<any>({
    queryKey: ['/api/auth/user'],
    enabled: isLoaded && !!userId,
  });

  const user = userResponse as any;
  const isLoading = !isLoaded || isUserLoading;
  const isAuthenticated = isLoaded && !!userId;
  const isAdmin = user?.isAdmin ?? false;

  // Show Clerk sign-in page if not authenticated
  if (isLoaded && !userId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-md">
          <SignIn redirectUrl="/admin" />
        </div>
      </div>
    );
  }

  // Check if user is admin after login
  useEffect(() => {
    if (!isUserLoading && isAuthenticated && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You do not have admin privileges.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    }
  }, [isAuthenticated, isAdmin, isUserLoading, toast]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-semibold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Welcome, {user?.firstName || user?.email}
            </p>
          </div>
          <Button 
            variant="outline"
            onClick={() => signOut({ redirectUrl: "/" })}
            data-testid="button-logout"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="gallery" className="w-full">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="gallery" data-testid="tab-gallery">
              <ImageIcon className="mr-2 h-4 w-4" />
              Gallery
            </TabsTrigger>
            <TabsTrigger value="testimonials" data-testid="tab-testimonials">
              <Star className="mr-2 h-4 w-4" />
              Testimonials
            </TabsTrigger>
            <TabsTrigger value="services" data-testid="tab-services">
              <Briefcase className="mr-2 h-4 w-4" />
              Services
            </TabsTrigger>
            <TabsTrigger value="messages" data-testid="tab-messages">
              <MessageSquare className="mr-2 h-4 w-4" />
              Messages
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gallery" className="mt-6">
            <div className="mb-6">
              <h2 className="text-2xl font-serif font-semibold mb-2">Gallery Management</h2>
              <p className="text-muted-foreground">
                Manage before/after photos and gallery images
              </p>
            </div>
            <GalleryManagement />
          </TabsContent>

          <TabsContent value="testimonials" className="mt-6">
            <div className="mb-6">
              <h2 className="text-2xl font-serif font-semibold mb-2">Testimonials Management</h2>
              <p className="text-muted-foreground">
                Manage customer reviews and testimonials
              </p>
            </div>
            <TestimonialsManagement />
          </TabsContent>

          <TabsContent value="services" className="mt-6">
            <div className="mb-6">
              <h2 className="text-2xl font-serif font-semibold mb-2">Services Management</h2>
              <p className="text-muted-foreground">
                Manage service offerings and details
              </p>
            </div>
            <ServicesManagement />
          </TabsContent>

          <TabsContent value="messages" className="mt-6">
            <div className="mb-6">
              <h2 className="text-2xl font-serif font-semibold mb-2">Contact Messages</h2>
              <p className="text-muted-foreground">
                View and manage contact form submissions
              </p>
            </div>
            <ContactMessages />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
