import { db, hasDatabaseUrl } from "./db";
import { galleryItems, testimonials, services, siteAssets } from "@shared/schema";

if (!hasDatabaseUrl || !db) {
  console.error("DATABASE_URL must be set to seed the database. Aborting.");
  process.exit(1);
}

const database = db;

async function seed() {
  console.log("Seeding database...");
  
  // Seed gallery items
  const initialGallery = [
    {
      title: "Kitchen & Living Transformations",
      imageUrl: "/gallery/1.png",
      category: "deep-cleaning" as const,
      order: 0
    },
    {
      title: "Bedroom & Bathroom Refresh",
      imageUrl: "/gallery/2.png",
      category: "deep-cleaning" as const,
      order: 1
    },
    {
      title: "Complete Home Cleaning",
      imageUrl: "/gallery/3.png",
      category: "move-in-out" as const,
      order: 2
    },
    {
      title: "Living Spaces Transformation",
      imageUrl: "/gallery/4.png",
      category: "deep-cleaning" as const,
      order: 3
    },
    {
      title: "Kitchen & Bathroom Sparkle",
      imageUrl: "/gallery/5.png",
      category: "deep-cleaning" as const,
      order: 4
    },
    {
      title: "Bedroom Cleaning Excellence",
      imageUrl: "/gallery/6.png",
      category: "move-in-out" as const,
      order: 5
    }
  ];

  for (const item of initialGallery) {
    await database.insert(galleryItems).values(item);
  }
  console.log("Gallery items seeded");

  // Seed testimonials
  const initialTestimonials = [
    {
      name: "Amanda R.",
      review: "Ivan's team transformed my home! Every corner sparkles and the attention to detail is remarkable.",
      rating: 5,
      order: 0
    },
    {
      name: "Sarah M.",
      review: "Professional, reliable, and thorough. Millan Luxury Cleaning exceeded all my expectations!",
      rating: 5,
      order: 1
    },
    {
      name: "Evelyn R.",
      review: "The deep cleaning service was phenomenal. My home has never looked or felt this clean.",
      rating: 5,
      order: 2
    },
    {
      name: "Austin F.",
      review: "Punctual, respectful, and incredibly efficient. I highly recommend their services!",
      rating: 5,
      order: 3
    },
    {
      name: "Michael L.",
      review: "Outstanding service from start to finish. The team is professional and the results speak for themselves.",
      rating: 5,
      order: 4
    }
  ];

  for (const item of initialTestimonials) {
    await database.insert(testimonials).values(item);
  }
  console.log("Testimonials seeded");

  // Seed services
  const initialServices = [
    {
      name: "Deep Cleaning",
      description: "Comprehensive cleaning for your entire home, reaching every corner and detail.",
      features: [
        "Complete surface cleaning",
        "Kitchen deep clean",
        "Bathroom sanitization",
        "Floor care",
        "Window cleaning",
        "Dust removal"
      ],
      order: 0
    },
    {
      name: "Move-In/Move-Out",
      description: "Perfect for transitions, ensuring your space is spotless for the next chapter.",
      features: [
        "Complete property cleaning",
        "Appliance cleaning",
        "Cabinet interiors",
        "Closet cleaning",
        "Wall washing",
        "Floor deep clean"
      ],
      order: 1
    },
    {
      name: "Basic Cleaning",
      description: "Regular maintenance to keep your home fresh and welcoming.",
      features: [
        "Surface dusting",
        "Vacuuming",
        "Mopping",
        "Kitchen tidying",
        "Bathroom cleaning",
        "Trash removal"
      ],
      order: 2
    },
    {
      name: "Laundry Services",
      description: "Professional laundry care with meticulous attention to your garments.",
      features: [
        "Washing & drying",
        "Folding",
        "Ironing",
        "Stain treatment",
        "Delicate care",
        "Organized delivery"
      ],
      order: 3
    }
  ];

  for (const item of initialServices) {
    await database.insert(services).values(item);
  }
  console.log("Services seeded");

  const initialAssets = [
    {
      key: "logo",
      url: "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/static/millan-logo.png",
      name: "Millan Logo",
      filename: "millan-logo.png",
      publicId: "static/millan-logo.png",
      description: "Primary logo",
    },
    {
      key: "heroBackground",
      url: "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/static/dark-botanical-bg.png",
      name: "Hero Background",
      filename: "dark-botanical-bg.png",
      publicId: "static/dark-botanical-bg.png",
      description: "Hero background",
    },
    {
      key: "servicesBackground",
      url: "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/static/dark-botanical-bg.png",
      name: "Services Background",
      filename: "dark-botanical-bg.png",
      publicId: "static/dark-botanical-bg.png",
      description: "Services background",
    },
    {
      key: "aboutBackground",
      url: "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/static/light-botanical-bg.png",
      name: "About Background",
      filename: "light-botanical-bg.png",
      publicId: "static/light-botanical-bg.png",
      description: "About background",
    },
    {
      key: "aboutPortrait",
      url: "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/static/owner-photo.jpg",
      name: "Owner Portrait",
      filename: "owner-photo.jpg",
      publicId: "static/owner-photo.jpg",
      description: "Owner portrait",
    },
  ];

  for (const asset of initialAssets) {
    await database.insert(siteAssets).values(asset);
  }
  console.log("Site assets seeded");

  console.log("Database seeded successfully!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Error seeding database:", error);
  process.exit(1);
});
