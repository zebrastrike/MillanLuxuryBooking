import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import millanLogo from "@assets/IMG_5919 - Millan Luxury Cleaning (1)_1763147963949.png";
import darkBotanicalBg from "@assets/generated_images/Dark_botanical_hero_background_18ef14b3.png";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Parallax Effect */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${darkBotanicalBg})`,
          backgroundAttachment: 'fixed'
        }}
      />
      
      {/* Gradient Overlay for Text Legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 md:px-8 text-center">
        {/* Logo */}
        <div className="flex justify-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <img 
            src={millanLogo} 
            alt="Millan Luxury Cleaning Logo" 
            className="w-48 h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 drop-shadow-2xl object-contain"
          />
        </div>
        
        {/* Brand Name */}
        <h1 className="text-white font-serif font-semibold text-4xl md:text-6xl lg:text-7xl mb-4 tracking-wide animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-100">
          MILLAN
        </h1>
        <h2 className="text-white font-serif font-medium text-2xl md:text-4xl lg:text-5xl mb-6 tracking-widest animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
          LUXURY CLEANING
        </h2>
        
        {/* Tagline */}
        <div className="flex items-center justify-center gap-3 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
          <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-primary" />
          <p className="text-white text-lg md:text-xl lg:text-2xl font-serif tracking-wide">
            Crowning Every Space in Sparkle
          </p>
          <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-primary" />
        </div>
        
        {/* Subtitle */}
        <p className="text-white/90 text-sm md:text-base lg:text-lg max-w-2xl mx-auto mb-4 leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-400">
          Personal Cleaning Service
        </p>
        
        {/* Description */}
        <p className="text-white/80 text-base md:text-lg max-w-3xl mx-auto mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
          An immaculate home should feel like a retreat—restful, rejuvenating, and refined. 
          Millan Luxury Cleaning delivers high-end home cleaning services in Phoenix, AZ, 
          with a dedication to precision and care that sets us apart.
        </p>
        
        {/* CTA Button */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-700">
          <Button 
            asChild
            variant="default"
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xl shadow-primary/50 border-2 border-primary-foreground/20 px-12 py-6 text-lg font-bold tracking-wider"
            data-testid="button-book-hero"
          >
            <a href="https://millanluxurycleaning.square.site/" target="_blank" rel="noopener noreferrer">
              BOOK NOW
            </a>
          </Button>
        </div>
        
        {/* Location */}
        <p className="text-white/70 text-sm md:text-base mt-8 animate-in fade-in duration-1000 delay-1000">
          Serving Phoenix, AZ And Surrounding Areas
        </p>
      </div>
    </section>
  );
}
