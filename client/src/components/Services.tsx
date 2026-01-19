import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Home, Truck, Shirt } from "lucide-react";
import type { ServiceItem } from "@shared/types";
import { normalizeArrayData } from "@/lib/arrayUtils";
import { useAssets } from "@/hooks/useAssets";

const fallbackBg = "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/static/dark-botanical-bg.png";

// Icon mapping for services
const iconMap: Record<string, any> = {
  "Deep Cleaning": Sparkles,
  "Move-In/Move-Out": Truck,
  "Basic Cleaning": Home,
  "Laundry Services": Shirt,
};


type ServicesProps = {
  limit?: number;
  heading?: string;
  subheading?: string;
  showAllLink?: boolean;
};

const resolveServiceTitle = (service: ServiceItem) => service.title || service.name || "Service";

const normalizeServiceName = (name: string) => name.replace(/^[^A-Za-z0-9]+/, "").trim();

const getServiceType = (name: string) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("laundry") || lowerName.includes("comforter") || lowerName.includes("bed sheet")) {
    return "Laundry";
  }
  if (lowerName.includes("add-on")) {
    return "Add-on";
  }
  return "Cleaning";
};

const formatPrice = (price?: number | null) => {
  if (price === null || price === undefined) {
    return null;
  }
  return Number(price).toFixed(2);
};

export function Services({ limit, heading, subheading, showAllLink = false }: ServicesProps) {
  const { data: services = [], isLoading, error } = useQuery<ServiceItem[]>({
    queryKey: ["/api/services"],
  });
  const { data: assets = {} } = useAssets();

  const { items: serviceList, isValid } = normalizeArrayData<ServiceItem>(services);
  const squareServices = serviceList.filter((service) => Boolean(service.squareServiceId));
  const limitedServices = typeof limit === "number" ? squareServices.slice(0, limit) : squareServices;
  const hasShapeError = !isLoading && !error && !isValid;
  const background = assets?.servicesBackground?.url ?? assets?.heroBackground?.url ?? fallbackBg;
  const titleText = heading ?? "Our Services";
  const subtitleText =
    subheading ??
    "A spotless, refreshed home is the heart of everyday comfort that's precisely what Millan Luxury Cleaning delivers through our premium residential cleaning solutions.";

  return (
    <section
      id="services"
      className="relative py-20 md:py-32 overflow-hidden"
      style={{
        backgroundImage: `url(${background})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70" />

      <div className="relative z-10 container mx-auto px-6 md:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="font-serif text-3xl md:text-5xl font-semibold text-white mb-4">
            {titleText}
          </h2>
          <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto">
            {subtitleText}
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
            {limitedServices.map((service) => {
              const serviceTitle = resolveServiceTitle(service);
              const normalizedTitle = normalizeServiceName(serviceTitle);
              const serviceType = getServiceType(normalizedTitle);
              const Icon = iconMap[normalizedTitle] || Sparkles;
              const isFeatured = normalizedTitle === "Deep Cleaning";
              const bookingLink = `/book?serviceId=${service.id}`;
              const price = formatPrice(service.price);

              return (
                <Card
                  key={service.id}
                  className={`hover-elevate transition-all duration-300 overflow-hidden ${
                    isFeatured ? "border-2 border-primary shadow-xl" : ""
                  }`}
                  data-testid={`card-service-${service.id}`}
                >
                  {/* Service Image */}
                  {service.imageUrl && (
                    <div className="relative w-full h-48 overflow-hidden">
                      <img src={service.imageUrl} alt={serviceTitle} className="w-full h-full object-cover" />
                      {isFeatured && (
                        <span className="absolute top-3 right-3 text-xs font-semibold text-white bg-primary px-3 py-1 rounded-full shadow-lg">
                          MOST POPULAR
                        </span>
                      )}
                    </div>
                  )}

                  <CardHeader className="space-y-3 pb-4">
                    <div className="flex items-center justify-between gap-4">
                      <div
                        className={`p-3 rounded-lg ${
                          isFeatured ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"
                        }`}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{serviceType}</Badge>
                        {price && service.displayPrice && (
                          <Badge className="bg-primary text-primary-foreground">${price}</Badge>
                        )}
                      </div>
                    </div>
                    <CardTitle className="text-xl md:text-2xl font-serif">{serviceTitle}</CardTitle>
                    <CardDescription className="text-base text-muted-foreground">{service.description}</CardDescription>
                  </CardHeader>

                  <CardContent>
                    {Array.isArray(service.features) && service.features.length > 0 ? (
                      <ul className="space-y-2">
                        {service.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="text-primary mt-0.5">*</span>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {serviceType} service with flexible scheduling and premium care.
                      </p>
                    )}
                  </CardContent>

                  <CardFooter>
                    <Button
                      asChild
                      variant={isFeatured ? "default" : "outline"}
                      className="w-full"
                      data-testid={`button-book-${service.id}`}
                    >
                      <a href={bookingLink}>Book This Service</a>
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && limitedServices.length === 0 && (
          <div className="text-center py-12">
            <p className="text-white/70 text-lg">No services available yet.</p>
          </div>
        )}

        {/* Shape error state */}
        {hasShapeError && (
          <div className="text-center py-12">
            <p className="text-white/70 text-lg">
              We encountered unexpected data while loading services. Please refresh the page.
            </p>
          </div>
        )}

        {showAllLink && !isLoading && !error && limitedServices.length > 0 && (
          <div className="mt-12 text-center">
            <Button asChild variant="outline" className="border-white/50 text-white hover:text-white">
              <a href="/services">View all services</a>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
