import { Card } from "@/components/ui/card";
import { useSiteAssets } from "@/hooks/useSiteAssets";

const fallbackBackground = "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/static/light-botanical-bg.png";
const fallbackPortrait = "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/static/owner-photo.jpg";

export function About() {
  const { data: assets } = useSiteAssets();
  const background = assets?.aboutBackground ?? fallbackBackground;
  const portrait = assets?.aboutPortrait ?? fallbackPortrait;

  return (
    <section
      id="about"
      className="relative py-20 md:py-32 overflow-hidden"
      style={{
        backgroundImage: `url(${background})`,
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
          
          {/* Content Card with Owner Photo */}
          <Card className="p-8 md:p-12 shadow-lg">
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
              {/* Photo */}
              <div className="flex justify-center md:justify-start">
                <div className="w-full max-w-sm rounded-lg overflow-hidden shadow-md">
                  <img
                    src={portrait}
                    alt="Ivan Millan, Founder of Millan Luxury Cleaning"
                    className="w-full h-auto object-cover"
                    data-testid="img-owner-photo"
                  />
                </div>
              </div>

              {/* Text Content */}
              <div className="space-y-6">
                <h3 className="font-serif text-2xl md:text-3xl font-semibold text-primary">
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
