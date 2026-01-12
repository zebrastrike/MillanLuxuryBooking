export interface Fragrance {
  id: string;
  name: string;
  description: string;
  category: 'candle' | 'air-freshener' | 'car-freshener' | 'incense' | 'linen-spray';
  price: string;  // Display price (e.g., "$24.99")
  imageUrl: string;
  squareUrl: string;  // Link to Square product page
  featured?: boolean;
  scentNotes?: string[];
}

export const fragrances: Fragrance[] = [
  // PLACEHOLDER - Replace with real products from Square
  {
    id: '1',
    name: 'Lavender Dreams Candle',
    description: 'Handmade 100% organic soy candle with natural lavender scent',
    category: 'candle',
    price: '$24.99',
    imageUrl: '/placeholder-candle.jpg',
    squareUrl: 'https://millanluxurycleaning.square.site/',
    featured: true,
    scentNotes: ['Lavender', 'Vanilla', 'Cedar'],
  },
  {
    id: '2',
    name: 'Citrus Burst Air Freshener',
    description: 'Natural citrus blend for lasting freshness in any room',
    category: 'air-freshener',
    price: '$12.99',
    imageUrl: '/placeholder-air-freshener.jpg',
    squareUrl: 'https://millanluxurycleaning.square.site/',
    scentNotes: ['Orange', 'Lemon', 'Grapefruit'],
  },
  {
    id: '3',
    name: 'Ocean Breeze Car Freshener',
    description: 'Keep your car smelling fresh with natural ocean scents',
    category: 'car-freshener',
    price: '$8.99',
    imageUrl: '/placeholder-car-freshener.jpg',
    squareUrl: 'https://millanluxurycleaning.square.site/',
    scentNotes: ['Sea Salt', 'Jasmine', 'Driftwood'],
  },
  {
    id: '4',
    name: 'Sandalwood Incense',
    description: 'Premium sandalwood incense for meditation and relaxation',
    category: 'incense',
    price: '$15.99',
    imageUrl: '/placeholder-incense.jpg',
    squareUrl: 'https://millanluxurycleaning.square.site/',
    scentNotes: ['Sandalwood', 'Amber', 'Patchouli'],
  },
  {
    id: '5',
    name: 'Fresh Linen Spray',
    description: 'Natural linen spray for bedding and fabrics',
    category: 'linen-spray',
    price: '$16.99',
    imageUrl: '/placeholder-linen-spray.jpg',
    squareUrl: 'https://millanluxurycleaning.square.site/',
    scentNotes: ['Clean Cotton', 'White Tea', 'Bergamot'],
  },
  {
    id: '6',
    name: 'Vanilla Spice Candle',
    description: 'Warm and cozy vanilla spice blend perfect for any season',
    category: 'candle',
    price: '$24.99',
    imageUrl: '/placeholder-candle-2.jpg',
    squareUrl: 'https://millanluxurycleaning.square.site/',
    featured: true,
    scentNotes: ['Vanilla', 'Cinnamon', 'Clove'],
  },
];

export const categories = [
  { id: 'all', label: 'All Products' },
  { id: 'candle', label: 'Candles' },
  { id: 'air-freshener', label: 'Air Fresheners' },
  { id: 'car-freshener', label: 'Car Fresheners' },
  { id: 'incense', label: 'Incense' },
  { id: 'linen-spray', label: 'Linen Sprays' },
];
