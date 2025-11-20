// Service areas for Millan Luxury Cleaning in Arizona
export const serviceAreas = [
  {
    city: "Phoenix",
    state: "AZ",
    keywords: "luxury cleaning services Phoenix AZ, professional house cleaning Phoenix, deep cleaning Phoenix Arizona"
  },
  {
    city: "Surprise",
    state: "AZ",
    keywords: "cleaning services Surprise AZ, luxury home cleaning Surprise, professional cleaners Surprise Arizona"
  },
  {
    city: "Chandler",
    state: "AZ",
    keywords: "premium cleaning Chandler AZ, house cleaning services Chandler, luxury cleaners Chandler Arizona"
  },
  {
    city: "Glendale",
    state: "AZ",
    keywords: "cleaning services Glendale AZ, professional home cleaning Glendale, deep cleaning Glendale Arizona"
  },
  {
    city: "Mesa",
    state: "AZ",
    keywords: "luxury cleaning Mesa AZ, professional house cleaning Mesa, high-end cleaning Mesa Arizona"
  },
  {
    city: "Scottsdale",
    state: "AZ",
    keywords: "premium cleaning Scottsdale AZ, luxury home cleaning Scottsdale, professional cleaners Scottsdale Arizona"
  },
  {
    city: "Tempe",
    state: "AZ",
    keywords: "cleaning services Tempe AZ, professional house cleaning Tempe, luxury cleaning Tempe Arizona"
  }
];

export const googleMyBusinessInfo = {
  businessName: "Millan Luxury Cleaning",
  address: "Phoenix, AZ",
  phone: "(623) 555-0147", // Using the phone from the design
  serviceAreas: serviceAreas.map(area => `${area.city}, ${area.state}`),
  businessType: "House Cleaning Service",
  description: "Premium luxury cleaning services serving Phoenix and surrounding areas with deep cleaning, move-in/move-out, and laundry services"
};

export const locationKeywords = [
  "luxury cleaning Phoenix",
  "premium house cleaning Arizona",
  "deep cleaning Surprise",
  "moving cleaning Chandler",
  "residential cleaning Glendale",
  "home cleaning Mesa",
  "professional cleaning Scottsdale",
  "move in out cleaning Tempe",
  ...serviceAreas.flatMap(area => area.keywords.split(", "))
];

export function getLocationsList(): string {
  return serviceAreas.map(area => `${area.city}, AZ`).join(", ");
}
