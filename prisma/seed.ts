import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedFaqs() {
  const count = await prisma.faqItem.count();
  if (count > 0) return;

  const faqs = Array.from({ length: 20 }).map((_, index) => {
    const order = index;
    const question = [
      "How does Millan tailor luxury cleaning for Paradise Valley estates?",
      "Do you offer discreet service for high-profile Scottsdale homes?",
      "Can I book recurring weekly detailing for my condo in Phoenix?",
      "What is included in a luxury deep clean for a vacation rental?",
      "Do you handle post-renovation dust mitigation?",
      "Can you refresh upholstery and fine fabrics without damage?",
      "How do you protect custom finishes and marble surfaces?",
      "Are eco-forward products available for sensitive households?",
      "Can your team stage a home for showings after cleaning?",
      "Do you manage linen turnover for Airbnb and VRBO listings?",
      "How early should I schedule for seasonal visitors in Scottsdale?",
      "Do you clean exterior entries and courtyards?",
      "Can you coordinate with my property manager or concierge?",
      "Is a pre-event reset service available the morning-of?",
      "Do you offer fridge and pantry organization during service?",
      "Can you service luxury high-rises with elevator constraints?",
      "How do you secure access codes and alarm systems?",
      "Do you provide pet-friendly cleaning near Camelback?",
      "What happens if I need to reschedule last minute?",
      "Do you support move-in and white-glove move-out cleanings?",
    ][index];

    const answer = [
      "We perform a walkthrough to map bespoke materials, set protection plans, and assign a senior lead to oversee every session.",
      "Yes. Our crew signs NDAs, arrives in unmarked vehicles on request, and follows quiet entry protocols for privacy.",
      "Absolutely. We set recurring schedules with the same lead tech, aligning around valet, concierge, or garage access windows.",
      "It covers luxury kitchen detailing, spa bathroom reset, baseboard and trim care, dusting of artwork frames, and scent-neutral finishing.",
      "Yes, we use HEPA filtration, multi-stage wiping, and vent attention to remove fine particulates without scratching finishes.",
      "We use fiber-safe methods, spot-test every textile, and coordinate any specialty restoration through approved vendors if needed.",
      "We catalog each surface, use pH-correct products, and always shield edges and seams before polishing stone or metal.",
      "Yes. We stock fragrance-free, plant-based solutions and can avoid specific ingredients based on your preferences.",
      "We can reset pillows, throws, and decor layouts so the space shows as photo-ready immediately after cleaning.",
      "Yes, we track linen counts, launder per host standards, and restock essentials so turnovers stay consistent.",
      "Peak season fills quickly; booking 1–2 weeks ahead ensures your preferred time and lead technician.",
      "Entryways, patios, and porticos can be swept, rinsed, and dusted so your arrival path feels pristine.",
      "We coordinate schedules, access, and notes directly with your manager while keeping you updated on completion.",
      "Yes. We can provide a dawn or pre-guest reset including glass polish, floor shine, and scent balancing.",
      "We can declutter, wipe, and organize dry goods, storing items in clear bins or labeled baskets upon request.",
      "Yes. We are accustomed to valet-only and elevator-booked properties and plan timing accordingly.",
      "Access details are stored securely; we confirm alarm steps in writing and lock up with photo verification if desired.",
      "We use pet-safe products, secure doors and gates, and note any pet instructions before starting.",
      "Text or call us—same-day adjustments are possible when crews are available; otherwise we prioritize the next opening.",
      "We offer full move prep including cabinets, drawers, inside appliances, and final walkthrough ready for inspection.",
    ][index];

    return { question, answer, order };
  });

  await prisma.faqItem.createMany({ data: faqs });
}

async function seedPosts() {
  const count = await prisma.post.count();
  if (count > 0) return;

  const posts = [
    {
      title: "The Scottsdale Guide to White-Glove Deep Cleaning",
      slug: "scottsdale-white-glove-deep-cleaning",
      excerpt: "How luxury residences in Scottsdale stay guest-ready with meticulous deep cleaning protocols.",
      body:
        "Discover the step-by-step deep cleaning routine we use for McCormick Ranch estates, including marble-safe polishing and scent-neutral finishes.",
      published: true,
    },
    {
      title: "Paradise Valley Post-Renovation Dust Control",
      slug: "paradise-valley-post-renovation-dust-control",
      excerpt: "Remove construction dust without risking custom finishes or fixtures.",
      body:
        "Our HEPA-driven approach and microfiber sequencing pull fine dust from crevices while protecting luxury millwork and stone.",
      published: true,
    },
    {
      title: "Airbnb Turnover Excellence in Phoenix",
      slug: "phoenix-airbnb-turnover-excellence",
      excerpt: "How to keep five-star turnover standards without sacrificing speed.",
      body:
        "From linen logistics to amenity restocks, we design a turnover checklist that matches your brand and keeps reviews high.",
      published: true,
    },
    {
      title: "How to Protect Custom Marble During Cleaning",
      slug: "protect-custom-marble-during-cleaning",
      excerpt: "Luxury stone requires pH-aware products and gentle tools.",
      body:
        "We map every marble surface, apply edge guards, and polish with non-acidic solutions that preserve the natural sheen.",
      published: true,
    },
    {
      title: "Seasonal Cleaning Checklist for Scottsdale Snowbirds",
      slug: "seasonal-cleaning-checklist-scottsdale",
      excerpt: "Prepare your home for arrivals and departures with confidence.",
      body:
        "From HVAC vent dusting to patio refreshes, this checklist keeps desert dust out and your home guest-ready.",
      published: true,
    },
    {
      title: "Discreet Luxury Cleaning Protocols",
      slug: "discreet-luxury-cleaning-protocols",
      excerpt: "Privacy-first service standards for high-profile residents.",
      body:
        "Learn how NDAs, unmarked vehicles, and silent equipment keep service low-profile without sacrificing quality.",
      published: true,
    },
    {
      title: "Move-In Perfection for New Construction",
      slug: "move-in-perfection-new-construction",
      excerpt: "A white-glove approach to first occupancy cleanings.",
      body:
        "We detail appliances, cabinets, and closets so the home feels untouched and ready for reveal day.",
      published: true,
    },
    {
      title: "Eco-Luxe Cleaning for Sensitive Homes",
      slug: "eco-luxe-cleaning-sensitive-homes",
      excerpt: "Fragrance-free, plant-forward methods that still feel luxurious.",
      body:
        "We curate scent-free products, use steam where appropriate, and air out rooms to keep environments comfortable.",
      published: true,
    },
    {
      title: "Staging-Ready Cleaning Before Listing",
      slug: "staging-ready-cleaning-before-listing",
      excerpt: "Make your listing photos shine with minimal editing.",
      body:
        "Our staging reset polishes glass, aligns textiles, and balances lighting so photographers capture your best angles.",
      published: true,
    },
    {
      title: "The Anatomy of a Luxury Bathroom Reset",
      slug: "anatomy-of-luxury-bathroom-reset",
      excerpt: "Inside the checklist we use for spa-like bathrooms.",
      body:
        "From descaling rainfall showers to folding towels with boutique precision, here is how we keep bathrooms photo-ready.",
      published: true,
    },
  ];

  await prisma.post.createMany({ data: posts });
}

async function seedServices() {
  const count = await prisma.serviceItem.count();
  if (count > 0) return;

  const services = [
    {
      title: "Luxury Deep Clean",
      description: "White-glove detailing for estates with marble, glass, and bespoke finishes.",
      features: ["Marble-safe polishing", "Baseboard and trim care", "Glass and mirror luster"],
      order: 0,
    },
    {
      title: "Move-In Preparation",
      description: "First-day perfection for new construction and remodel completions.",
      features: ["Cabinet and drawer interiors", "Appliance detailing", "Dust mitigation"],
      order: 1,
    },
    {
      title: "Move-Out Assurance",
      description: "Inspection-ready cleaning with documentation photos upon request.",
      features: ["Inside appliances", "Closet reset", "Final walkthrough polish"],
      order: 2,
    },
    {
      title: "Airbnb / Vacation Rental Turnover",
      description: "Five-star turnovers with linen tracking and amenity restocking.",
      features: ["Linen change", "Amenity refill", "Damage notes"],
      order: 3,
    },
    {
      title: "Recurring Housekeeping",
      description: "Weekly or bi-weekly maintenance led by a dedicated supervisor.",
      features: ["Consistent lead tech", "Schedule coordination", "Scent-neutral finish"],
      order: 4,
    },
    {
      title: "Post-Construction Detail",
      description: "Fine dust removal using HEPA filtration and microfiber sequencing.",
      features: ["Vent attention", "Edge dusting", "Protective methods"],
      order: 5,
    },
    {
      title: "Event Reset",
      description: "Pre- and post-event cleaning with glassware polish and floor shine.",
      features: ["Entry refresh", "Surface sanitizing", "Trash and recycling"],
      order: 6,
    },
    {
      title: "Luxury Condo Detailing",
      description: "High-rise friendly cleaning that respects elevator and valet timelines.",
      features: ["Elevator scheduling", "Quiet tools", "Lobby coordination"],
      order: 7,
    },
  ];

  await prisma.serviceItem.createMany({ data: services });
}

async function seedTestimonials() {
  const count = await prisma.testimonial.count();
  if (count > 0) return;

  const testimonials = [
    {
      author: "Alexandra R. — Paradise Valley",
      rating: 5,
      content: "The team treats our home like a gallery—every visit feels curated, never generic.",
      order: 0,
    },
    {
      author: "Marcus L. — Scottsdale",
      rating: 5,
      content: "Discreet, punctual, and flawless. Our guests always comment on how immaculate everything feels.",
      order: 1,
    },
    {
      author: "Priya N. — Phoenix Biltmore",
      rating: 5,
      content: "They manage our Airbnb turnovers with hotel-level precision and detailed notes after every stay.",
      order: 2,
    },
    {
      author: "David and Lauren M. — Arcadia",
      rating: 5,
      content: "Post-renovation dust was gone in a day, and not a single finish was scratched.",
      order: 3,
    },
    {
      author: "Sofia T. — Old Town Scottsdale",
      rating: 5,
      content: "The move-in clean made our condo feel brand new—organized, fresh, and camera ready.",
      order: 4,
    },
    {
      author: "Jonathan K. — Paradise Valley",
      rating: 5,
      content: "They coordinate directly with our property manager so we never worry about scheduling.",
      order: 5,
    },
    {
      author: "Maya V. — Camelback East",
      rating: 5,
      content: "Pet-friendly products and a respectful crew—our pups love them and so do we.",
      order: 6,
    },
    {
      author: "Olivia P. — McCormick Ranch",
      rating: 5,
      content: "Their event reset at sunrise saved our brunch—sparkling glassware and flawless floors.",
      order: 7,
    },
    {
      author: "Ethan W. — Desert Ridge",
      rating: 5,
      content: "Consistent quality every week with the same lead tech. It feels boutique, not corporate.",
      order: 8,
    },
    {
      author: "Helena C. — Phoenix",
      rating: 5,
      content: "Thoughtful organization in the pantry and closets—little details that make daily life easier.",
      order: 9,
    },
  ];

  await prisma.testimonial.createMany({ data: testimonials });
}

async function seedGallery() {
  const count = await prisma.galleryItem.count();
  if (count > 0) return;

  // Using actual images from Vercel Blob storage
  const baseUrl = "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com";

  const galleryItems = [
    // Real cleaning images from actual jobs
    {
      title: "Luxury Home Deep Clean",
      category: "deep-cleaning",
      imageUrl: `${baseUrl}/images/192153C5-389B-43C7-9236-4CB60F896D3E_1_105_c.jpeg`,
      order: 0,
    },
    {
      title: "Kitchen Transformation",
      category: "deep-cleaning",
      imageUrl: `${baseUrl}/images/2D597695-AEF5-4F74-9121-82DC642A7B32_1_105_c.jpeg`,
      order: 1,
    },
    {
      title: "Bathroom Spa Detail",
      category: "deep-cleaning",
      imageUrl: `${baseUrl}/images/7ED002D8-4758-4885-8A5C-E43C7F02ACC3_1_105_c.jpeg`,
      order: 2,
    },
    {
      title: "Living Room Reset",
      category: "all",
      imageUrl: `${baseUrl}/images/8264BBFB-BB18-4D5B-93EF-23173A5963BB_1_105_c.jpeg`,
      order: 3,
    },
    {
      title: "Luxury Interior Detail",
      category: "all",
      imageUrl: `${baseUrl}/images/8C012EF9-D9D4-4D15-AB07-E259D1E033FF_1_105_c.jpeg`,
      order: 4,
    },
    {
      title: "Move-In Preparation",
      category: "move-in-out",
      imageUrl: `${baseUrl}/images/905FF31F-CBFF-4041-A43C-3DBCC33B8F58_1_105_c.jpeg`,
      order: 5,
    },
    {
      title: "Home Staging Ready",
      category: "move-in-out",
      imageUrl: `${baseUrl}/images/9927DB61-8C20-406C-903A-E90A636C616C_1_105_c.jpeg`,
      order: 6,
    },
    {
      title: "Premium Detail Work",
      category: "all",
      imageUrl: `${baseUrl}/images/41EF78DB-708F-4622-9D84-0002704C035B_1_102_o.jpeg`,
      order: 7,
    },
    {
      title: "Elegant Space Refresh",
      category: "all",
      imageUrl: `${baseUrl}/images/7EA82D2F-E177-413E-8D5D-CE33DCBAC003_1_102_o.jpeg`,
      order: 8,
    },
    {
      title: "Scottsdale Estate Cleaning",
      category: "all",
      imageUrl: `${baseUrl}/images/B21BCCA3-CAE3-481F-B7EA-68AAF86B562A_1_102_o.jpeg`,
      order: 9,
    },
    {
      title: "Paradise Valley Detail",
      category: "all",
      imageUrl: `${baseUrl}/images/C9823912-B95C-40C3-B209-D3FE06C30941_1_102_o.jpeg`,
      order: 10,
    },
  ];

  await prisma.galleryItem.createMany({ data: galleryItems });
}

async function seedBrandingAssets() {
  const count = await prisma.brandingAsset.count();
  if (count > 0) return;

  await prisma.brandingAsset.create({ data: {} });
}

async function main() {
  await seedFaqs();
  await seedPosts();
  await seedServices();
  await seedTestimonials();
  await seedGallery();
  await seedBrandingAssets();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seeding failed", error);
    await prisma.$disconnect();
    process.exit(1);
  });
