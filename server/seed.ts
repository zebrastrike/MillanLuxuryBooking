import { db } from "./db";
import { galleryItems, testimonials, services } from "@shared/schema";

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
    await db.insert(galleryItems).values(item);
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
    await db.insert(testimonials).values(item);
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
    await db.insert(services).values(item);
  }
  console.log("Services seeded");

  console.log("Database seeded successfully!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Error seeding database:", error);
  process.exit(1);
});
