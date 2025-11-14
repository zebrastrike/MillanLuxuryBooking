import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Home, Truck, Shirt } from "lucide-react";
import darkBotanicalBg from "@assets/generated_images/Dark_botanical_hero_background_18ef14b3.png";

export function Services() {
  const services = [
    {
      icon: Sparkles,
      title: "Basic Cleaning",
      description: "Perfect for maintaining a consistently fresh and beautiful home.",
      features: [
        "Regular maintenance cleaning",
        "All living areas sanitized",
        "Kitchen and bathroom cleaned",
        "Floors vacuumed and mopped"
      ],
      bookingLink: "https://book.squareup.com/appointments/u9s0361hs20tf6/location/LGP7ERVS80Y4R/services/SYVYEI7QQUJX5UD3DGCOCI3O",
      testId: "basic-cleaning"
    },
    {
      icon: Sparkles,
      iconColor: "text-primary",
      title: "Deep Cleaning",
      description: "For when your home deserves that luxury-level refresh from top to bottom.",
      features: [
        "Thorough top-to-bottom refresh",
        "Baseboards and ceiling corners",
        "Inside appliances (by request)",
        "Signature sparkle touch"
      ],
      bookingLink: "https://book.squareup.com/appointments/u9s0361hs20tf6/location/LGP7ERVS80Y4R/services/FFGMODYFN5GMOMSM6XGSCGOL",
      testId: "deep-cleaning",
      featured: true
    },
    {
      icon: Truck,
      title: "Move-In / Move-Out Cleaning",
      description: "Start fresh or leave it spotless—stress-free and sparkling.",
      features: [
        "Complete property cleaning",
        "All areas thoroughly sanitized",
        "Perfect for transitions",
        "Walk-through ready"
      ],
      bookingLink: "https://book.squareup.com/appointments/u9s0361hs20tf6/location/LGP7ERVS80Y4R/services/QQ6C57O7KL2CKRAMUSEPFPFQ",
      testId: "move-cleaning"
    },
    {
      icon: Shirt,
      title: "Laundry Services",
      description: "Washed, dried, and folded with care because details matter.",
      features: [
        "Professional wash and dry",
        "Neatly folded",
        "Convenient delivery",
        "Attention to detail"
      ],
      bookingLink: "https://book.squareup.com/appointments/u9s0361hs20tf6/location/LGP7ERVS80Y4R/services/Y3TRG3L3NFEQZ7ZW53D3OD23",
      testId: "laundry-services"
    }
  ];

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
        
        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {services.map((service) => (
            <Card 
              key={service.testId}
              className={`hover-elevate transition-all duration-300 ${
                service.featured ? 'border-2 border-primary shadow-xl' : ''
              }`}
              data-testid={`card-service-${service.testId}`}
            >
              <CardHeader className="space-y-0 pb-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className={`p-3 rounded-lg ${
                    service.featured ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'
                  }`}>
                    <service.icon className="w-6 h-6" />
                  </div>
                  {service.featured && (
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                      MOST POPULAR
                    </span>
                  )}
                </div>
                <CardTitle className="text-xl md:text-2xl font-serif">
                  {service.title}
                </CardTitle>
                <CardDescription className="text-base pt-2">
                  {service.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-2">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-primary mt-0.5">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              
              <CardFooter>
                <Button 
                  asChild
                  variant={service.featured ? "default" : "outline"}
                  className="w-full"
                  data-testid={`button-book-${service.testId}`}
                >
                  <a href={service.bookingLink} target="_blank" rel="noopener noreferrer">
                    Book This Service
                  </a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
