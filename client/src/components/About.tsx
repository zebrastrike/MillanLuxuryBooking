import { Card } from "@/components/ui/card";
import lightBotanicalBg from "@assets/generated_images/Light_botanical_section_background_e6c03f5a.png";

export function About() {
  return (
    <section 
      id="about" 
      className="relative py-20 md:py-32 overflow-hidden"
      style={{
        backgroundImage: `url(${lightBotanicalBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      
      <div className="relative z-10 container mx-auto px-6 md:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Section Title */}
          <h2 className="font-serif text-3xl md:text-5xl font-semibold text-center mb-4">
            About Millan Luxury Cleaning
          </h2>
          <p className="text-lg md:text-xl text-center text-muted-foreground mb-12 italic">
            An immaculate home should feel like a retreat—restful, rejuvenating, and refined
          </p>
          
          {/* Content Card */}
          <Card className="p-8 md:p-12 shadow-lg">
            <div className="space-y-6 text-center md:text-left">
              <h3 className="font-serif text-2xl md:text-3xl font-semibold text-primary mb-6">
                Hi, I'm Ivan Millan, the heart behind Millan Luxury Cleaning Co.
              </h3>
              
              <p className="text-base md:text-lg leading-relaxed text-foreground">
                What began as a small passion for creating clean, peaceful spaces has grown 
                into a full-service cleaning business built on trust, quality, and care. I started 
                this company because I truly believe a clean home can bring peace of mind and 
                a sense of luxury to everyday life.
              </p>
              
              <p className="text-base md:text-lg leading-relaxed text-foreground">
                Every service is done with attention to detail and pride — as if it were my own home. My 
                goal is to give each client that fresh start feeling every time they walk in.
              </p>
              
              <div className="pt-4">
                <p className="text-primary font-semibold text-lg">
                  Dedicated to making your space shine inside and out
                </p>
              </div>
            </div>
          </Card>
          
          {/* Mission Statement */}
          <div className="mt-12 text-center max-w-3xl mx-auto">
            <p className="text-base md:text-lg leading-relaxed text-muted-foreground">
              Whether you're preparing for a fresh start with move-in cleaning, wrapping up a chapter 
              with move-out cleaning, or simply maintaining a sparkling living space through regular 
              residential cleaning, our work is grounded in one clear purpose: to elevate your environment.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
