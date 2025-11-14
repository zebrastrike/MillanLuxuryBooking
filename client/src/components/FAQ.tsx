import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function FAQ() {
  const faqs = [
    {
      question: "What's included in a deep cleaning?",
      answer: "Our deep cleaning includes a full top-to-bottom refresh: baseboards, ceiling corners, vents, detailed kitchen and bath sanitizing, inside appliances (by request), and more—all finished with Millan's signature sparkle touch.",
      testId: "deep-cleaning"
    },
    {
      question: "Are your services pet-friendly?",
      answer: "Yes! We love furry family members. We use non-toxic, pet-safe products to ensure a safe, clean environment for all household residents.",
      testId: "pet-friendly"
    },
    {
      question: "What is your cancellation policy?",
      answer: "We kindly ask for 24 hours' notice for any cancellations or reschedules. Cancellations with less than 24 hours' notice may be subject to a fee.",
      testId: "cancellation"
    },
    {
      question: "How do I book a cleaning?",
      answer: "Booking is easy! You can call, email, or request a quote directly through our website or social media. We'll guide you through a quick intake to match you with the right service.",
      testId: "booking"
    },
    {
      question: "What areas do you service?",
      answer: "We proudly serve high-end residential and boutique commercial spaces throughout Phoenix, AZ. Not sure if you're in our range? Reach out — we're happy to check!",
      testId: "areas"
    }
  ];

  return (
    <section id="faq" className="py-20 md:py-32 bg-background">
      <div className="container mx-auto px-6 md:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="font-serif text-3xl md:text-5xl font-semibold mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground">
            Everything you need to know about our services
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="border rounded-md px-6 bg-card"
                data-testid={`faq-item-${faq.testId}`}
              >
                <AccordionTrigger className="text-left font-semibold text-base md:text-lg py-4 hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
