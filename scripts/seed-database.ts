import { db } from '../server/db';
import { galleryItems, services, testimonials } from '@shared/schema';

const galleryUrls = [
  "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/gallery/Screenshot%202025-11-14%20093949_1763138704138.png",
  "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/gallery/Screenshot%202025-11-14%20094008_1763138704139.png",
  "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/gallery/Screenshot%202025-11-14%20094021_1763138704140.png",
  "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/gallery/Screenshot%202025-11-14%20094028_1763138704141.png",
  "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/gallery/Screenshot%202025-11-14%20094040_1763138704141.png",
  "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/gallery/Screenshot%202025-11-14%20094050_1763138704144.png",
  "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/gallery/Screenshot%202025-11-14%20094059_1763138704145.png",
  "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/gallery/Screenshot%202025-11-14%20094108_1763138704146.png",
  "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/gallery/Screenshot%202025-11-14%20094118_1763138704147.png",
  "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/gallery/Screenshot%202025-11-14%20094127_1763138704147.png",
  "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/gallery/Screenshot%202025-11-14%20094138_1763138704148.png",
  "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/gallery/Screenshot%202025-11-14%20094149_1763138704148.png",
  "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/gallery/Screenshot%202025-11-14%20094222_1763138704149.png",
  "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/gallery/Screenshot%202025-11-14%20094232_1763138704150.png",
  "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/gallery/Screenshot%202025-11-14%20094240_1763138704150.png",
  "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/gallery/Screenshot%202025-11-14%20094253_1763138704151.png",
  "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/gallery/Screenshot%202025-11-14%20094304_1763138704152.png",
  "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/gallery/Screenshot%202025-11-20%20160041_1763679653310.png",
];

const categories = ["deep-cleaning", "move-in-out", "all"];

async function seedDatabase() {
  console.log('🌱 Seeding database...\n');

  // Insert Gallery Items
  console.log('📸 Adding gallery items...');
  for (let i = 0; i < galleryUrls.length; i++) {
    const category = categories[i % categories.length];
    const title = `Professional Cleaning Result ${i + 1}`;
    
    await db.insert(galleryItems).values({
      title,
      category,
      imageUrl: galleryUrls[i],
      order: i,
    }).onConflictDoNothing();
  }
  console.log(`✅ Added ${galleryUrls.length} gallery items\n`);

  // Insert Services
  console.log('🧹 Adding services...');
  const servicesData = [
    {
      name: "Deep Cleaning",
      description: "Comprehensive deep cleaning service covering every corner of your home with attention to detail and premium care.",
      features: ["Baseboards & trim", "Ceiling fans", "Light fixtures", "Window sills", "Door frames", "Deep carpet cleaning"],
      order: 0,
    },
    {
      name: "Move-In/Move-Out",
      description: "Professional move-in cleaning ensures your new space is spotless. Move-out cleaning leaves your previous home in pristine condition.",
      features: ["All surfaces cleaned", "Appliances detailed", "Carpets cleaned", "Move-in ready", "Final walk-through"],
      order: 1,
    },
    {
      name: "Basic Cleaning",
      description: "Regular maintenance cleaning to keep your home fresh and tidy between deep cleans.",
      features: ["Dusting", "Vacuuming", "Mopping", "Bathrooms", "Kitchen", "Common areas"],
      order: 2,
    },
    {
      name: "Laundry Services",
      description: "Professional laundry care for your linens and fabrics, treated with luxury attention.",
      features: ["Washing & drying", "Folding & pressing", "Stain treatment", "Delicate care", "Premium detergents"],
      order: 3,
    },
  ];

  for (const service of servicesData) {
    await db.insert(services).values(service).onConflictDoNothing();
  }
  console.log(`✅ Added ${servicesData.length} services\n`);

  // Insert Testimonials
  console.log('⭐ Adding testimonials...');
  const testimonialsData = [
    {
      name: "Alexandra Martinez",
      review: "Millan Luxury Cleaning transformed my home. Their attention to detail is extraordinary. I'm genuinely impressed with their professionalism and care.",
      rating: 5,
      order: 0,
    },
    {
      name: "James Chen",
      review: "After hiring Millan, my home has never looked better. They treat your space with the respect it deserves. Highly recommended!",
      rating: 5,
      order: 1,
    },
    {
      name: "Sophia Rodriguez",
      review: "The team is professional, punctual, and thorough. They use premium products and their commitment to excellence is unmatched.",
      rating: 5,
      order: 2,
    },
  ];

  for (const testimonial of testimonialsData) {
    await db.insert(testimonials).values(testimonial).onConflictDoNothing();
  }
  console.log(`✅ Added ${testimonialsData.length} testimonials\n`);

  console.log('✨ Database seeding complete!');
  console.log('\n📊 Summary:');
  console.log(`   - Gallery Items: ${galleryUrls.length}`);
  console.log(`   - Services: ${servicesData.length}`);
  console.log(`   - Testimonials: ${testimonialsData.length}`);
  console.log('\nYour site is ready to go!');
}

seedDatabase().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
