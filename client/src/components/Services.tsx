import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Home, Truck, Shirt } from "lucide-react";
import type { Service } from "@shared/schema";

const darkBotanicalBg = "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/static/dark-botanical-bg.png";

// Icon mapping for services
const iconMap: Record<string, any> = {
  "Deep Cleaning": Sparkles,
  "Move-In/Move-Out": Truck,
  "Basic Cleaning": Home,
  "Laundry Services": Shirt
};

// Booking links mapping for Square Appointments
const bookingLinks: Record<string, string> = {
  "Deep Cleaning": "https://book.squareup.com/appointments/u9s0361hs20tf6/location/LGP7ERVS80Y4R/services/FFGMODYFN5GMOMSM6XGSCGOL",
  "Move-In/Move-Out": "https://book.squareup.com/appointments/u9s0361hs20tf6/location/LGP7ERVS80Y4R/services/QQ6C57O7KL2CKRAMUSEPFPFQ",
  "Basic Cleaning": "https://book.squareup.com/appointments/u9s0361hs20tf6/location/LGP7ERVS80Y4R/services/SYVYEI7QQUJX5UD3DGCOCI3O",
  "Laundry Services": "https://book.squareup.com/appointments/u9s0361hs20tf6/location/LGP7ERVS80Y4R/services/Y3TRG3L3NFEQZ7ZW53D3OD23"
};

export function Services() {
  const { data: services = [], isLoading, error } = useQuery<Service[]>({
    queryKey: ["/api/services"]
  });

  return (
    <section 
      id="services" 
      className="relative py-20 md:py-32 overflow-hidden"
      style={{
        backgroundImage: `url(${darkBotanicalBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70" />
      
      <div className="relative z-10 container mx-auto px-6 md:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="font-serif text-3xl md:text-5xl font-semibold text-white mb-4">
            Our Services
          </h2>
          <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto">
            A spotless, refreshed home is the heart of everyday comfort that's 
            precisely what Millan Luxury Cleaning delivers through our premium residential cleaning solutions.
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-12 w-12 mb-4" />
                  <Skeleton className="h-8 w-3/4 mb-2" />
                  <Skeleton className="h-16 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
        
        {/* Error State */}
        {!isLoading && error && (
          <div className="text-center py-6">
            <p className="text-white/80 text-sm md:text-base">
              We couldn't load services right now. Please refresh the page.
            </p>
          </div>
        )}

        {/* Services Grid */}
        {!isLoading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {services.map((service) => {
              const Icon = iconMap[service.name] || Sparkles;
              const isFeatured = service.name === "Deep Cleaning";
              const bookingLink = bookingLinks[service.name] || "https://millanluxurycleaning.square.site/";
              
              return (
                <Card 
                  key={service.id}
                  className={`hover-elevate transition-all duration-300 ${
                    isFeatured ? 'border-2 border-primary shadow-xl' : ''
                  }`}
                  data-testid={`card-service-${service.id}`}
                >
                  <CardHeader className="space-y-0 pb-4">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className={`p-3 rounded-lg ${
                        isFeatured ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'
                      }`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      {isFeatured && (
                        <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                          MOST POPULAR
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-xl md:text-2xl font-serif">
                      {service.name}
                    </CardTitle>
                    <CardDescription className="text-base pt-2">
                      {service.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <ul className="space-y-2">
                      {Array.isArray(service.features) && service.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-primary mt-0.5">✓</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                      {!Array.isArray(service.features) && (
                        <li className="text-sm text-muted-foreground text-center py-4">
                          Features loading...
                        </li>
                      )}
                    </ul>
                  </CardContent>
                  
                  <CardFooter>
                    <Button 
                      asChild
                      variant={isFeatured ? "default" : "outline"}
                      className="w-full"
                      data-testid={`button-book-${service.id}`}
                    >
                      <a href={bookingLink} target="_blank" rel="noopener noreferrer">
                        Book This Service
                      </a>
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && services.length === 0 && (
          <div className="text-center py-12">
            <p className="text-white/70 text-lg">
              No services available yet.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
