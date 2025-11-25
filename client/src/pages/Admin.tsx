import { RedirectToSignIn, UserButton } from "@clerk/clerk-react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { CLERK_ENABLED } from "@/lib/clerkConfig";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ImageIcon, MessageSquare, Star, Briefcase, BookOpen, HelpCircle } from "lucide-react";
import { ContactMessages } from "@/components/admin/ContactMessages";
import { GalleryManagement } from "@/components/admin/GalleryManagement";
import { TestimonialsManagement } from "@/components/admin/TestimonialsManagement";
import { ServicesManagement } from "@/components/admin/ServicesManagement";
import { SiteAssetsManagement } from "@/components/admin/SiteAssetsManagement";
import { BlogManagement } from "@/components/admin/BlogManagement";
import { FaqManagement } from "@/components/admin/FaqManagement";

export default function Admin() {
  const { user, isLoading, isLoaded, isSignedIn, isAdmin, error } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoaded && isSignedIn && !isAdmin) {
      setLocation("/");
    }
  }, [isAdmin, isLoaded, isSignedIn, setLocation]);

  if (CLERK_ENABLED && !isLoading && isLoaded && !isSignedIn) {
    return <RedirectToSignIn redirectUrl="/admin" />;
  }

  // Show loading spinner while checking user permissions
  if (isLoading || !isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" data-testid="loader-admin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error state if authentication failed
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Authentication Error</CardTitle>
            <CardDescription>
              Failed to load your account. {error.message || 'Please try again.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <button 
              onClick={() => window.location.reload()} 
              className="text-sm text-primary hover:underline"
              data-testid="button-retry"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Redirect non-admins once loaded
  if (isLoaded && isSignedIn && !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {!CLERK_ENABLED && (
        <div className="bg-amber-100 border-b border-amber-300 text-amber-900 px-6 py-3 text-sm">
          Authentication is disabled. You're viewing the admin dashboard in development mode with a local admin account.
        </div>
      )}

      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-semibold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Welcome, {user?.firstName || user?.email || "Admin"}
            </p>
          </div>
          {CLERK_ENABLED && <UserButton afterSignOutUrl="/" data-testid="button-user" />}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="gallery" className="w-full">
          <TabsList className="grid w-full grid-cols-7 max-w-5xl">
            <TabsTrigger value="gallery" data-testid="tab-gallery">
              <ImageIcon className="mr-2 h-4 w-4" />
              Gallery
            </TabsTrigger>
            <TabsTrigger value="branding" data-testid="tab-branding">
              <ImageIcon className="mr-2 h-4 w-4" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="testimonials" data-testid="tab-testimonials">
              <Star className="mr-2 h-4 w-4" />
              Testimonials
            </TabsTrigger>
            <TabsTrigger value="services" data-testid="tab-services">
              <Briefcase className="mr-2 h-4 w-4" />
              Services
            </TabsTrigger>
            <TabsTrigger value="blog" data-testid="tab-blog">
              <BookOpen className="mr-2 h-4 w-4" />
              Blog
            </TabsTrigger>
            <TabsTrigger value="faq" data-testid="tab-faq">
              <HelpCircle className="mr-2 h-4 w-4" />
              FAQ
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

          <TabsContent value="branding" className="mt-6">
            <div className="mb-6">
              <h2 className="text-2xl font-serif font-semibold mb-2">Branding Assets</h2>
              <p className="text-muted-foreground">
                Update logo and background images stored in Vercel Blob.
              </p>
            </div>
            <SiteAssetsManagement />
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

          <TabsContent value="blog" className="mt-6">
            <div className="mb-6">
              <h2 className="text-2xl font-serif font-semibold mb-2">Blog Management</h2>
              <p className="text-muted-foreground">
                Publish updates and announcements for your clients
              </p>
            </div>
            <BlogManagement />
          </TabsContent>

          <TabsContent value="faq" className="mt-6">
            <div className="mb-6">
              <h2 className="text-2xl font-serif font-semibold mb-2">FAQ Management</h2>
              <p className="text-muted-foreground">
                Manage common questions displayed on the public site
              </p>
            </div>
            <FaqManagement />
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
