import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, ExternalLink } from "lucide-react";

export function Testimonials() {
  const testimonials = [
    {
      id: 1,
      name: "Amanda R.",
      rating: 5,
      text: "Amazing service! My home has never looked this clean — it truly sparkles.",
      testId: "amanda-r"
    },
    {
      id: 2,
      name: "Sarah M.",
      rating: 5,
      text: "Professional, kind, and detail-oriented. Highly recommend!",
      testId: "sarah-m"
    },
    {
      id: 3,
      name: "Evelyn R.",
      rating: 5,
      text: "I had Ivan come and clean our rental house. I highly recommend him! He was very professional and diligent and thorough with his work. I had numerous estimates given to me and he had the best price in town, I definitely feel like I got my money's worth.",
      testId: "evelyn-r"
    },
    {
      id: 4,
      name: "Austin F.",
      rating: 5,
      text: "Super quick response time, thorough cleaning. Does a great job and the price is also super competitive!",
      testId: "austin-f"
    },
    {
      id: 5,
      name: "Michael L.",
      rating: 5,
      text: "Awesome service. Ivan came and quickly cleaned everything and it was spotless after! Plus it smelled amazing afterwards!",
      testId: "michael-l"
    }
  ];

  return (
    <section id="testimonials" className="py-20 md:py-32 bg-card">
      <div className="container mx-auto px-6 md:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="font-serif text-3xl md:text-5xl font-semibold mb-4">
            What Clients Say
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground">
            Trusted by homeowners across Phoenix, AZ
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {testimonials.map((testimonial) => (
            <Card 
              key={testimonial.id} 
              className="hover-elevate transition-all duration-300"
              data-testid={`card-testimonial-${testimonial.testId}`}
            >
              <CardContent className="pt-6">
                {/* Star Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                  ))}
                </div>

                {/* Review Text */}
                <p className="text-base italic text-foreground mb-4 leading-relaxed">
                  "{testimonial.text}"
                </p>

                {/* Reviewer Name */}
                <p className="font-semibold text-sm text-muted-foreground">
                  – {testimonial.name}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA to Yelp */}
        <div className="text-center mt-12">
          <Button 
            asChild
            variant="outline"
            size="lg"
            data-testid="button-read-more-reviews"
          >
            <a 
              href="https://www.yelp.com/biz/millan-luxury-cleaning-phoenix" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2"
            >
              Read More on Yelp
              <ExternalLink className="w-4 h-4" />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
