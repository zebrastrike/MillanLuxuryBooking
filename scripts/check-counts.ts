import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCounts() {
  try {
    const services = await prisma.serviceItem.count();
    const testimonials = await prisma.testimonial.count();
    const faqs = await prisma.faqItem.count();
    const gallery = await prisma.galleryItem.count();

    console.log('Database Record Counts:');
    console.log('  Services:', services);
    console.log('  Testimonials:', testimonials);
    console.log('  FAQs:', faqs);
    console.log('  Gallery:', gallery);
    console.log();

    if (services === 0 || testimonials === 0 || faqs === 0) {
      console.log('⚠️  Some tables are empty. Run: npx tsx prisma/seed.ts');
    } else {
      console.log('✅ All data loaded successfully!');
    }
  } catch (error) {
    console.error('Error checking counts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCounts();
