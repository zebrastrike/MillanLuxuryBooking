import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ShoppingCart } from 'lucide-react';
import type { FragranceProduct } from '@shared/types';
import { useCart } from '@/contexts/CartContext';
import { useState } from 'react';

interface FragranceCardProps {
  product: FragranceProduct;
}

const CATEGORY_LABELS: Record<string, string> = {
  "candle-3wick": "3-Wick Candle",
  "candle-single": "Single Candle",
  "candle-mini": "Mini Candle",
  "car-diffuser": "Car Diffuser",
  "room-spray": "Room Spray",
  "cleaner": "All-Purpose Cleaner",
};

export function FragranceCard({ product }: FragranceCardProps) {
  const categoryLabel = CATEGORY_LABELS[product.category] || "Product";
  const { addItem } = useCart();
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = async () => {
    setIsAdding(true);
    try {
      await addItem(product.id, 1);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-[0_20px_50px_rgba(244,114,182,0.25)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-8 rounded-3xl bg-[radial-gradient(circle_at_top,_rgba(253,164,175,0.45),_rgba(252,211,77,0.22)_45%,_transparent_70%)] opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
      />
      <div className="relative z-10 flex h-full flex-col">
        {/* Product Image */}
        <div className="relative h-64 overflow-hidden bg-gradient-to-br from-rose-100 via-pink-100 to-amber-100">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted">
              <p className="text-muted-foreground">No image</p>
            </div>
          )}
          {product.featured && (
            <Badge className="absolute top-3 right-3 bg-gradient-to-r from-rose-500 to-amber-400">
              <Sparkles className="mr-1 h-3 w-3" />
              Featured
            </Badge>
          )}
        </div>

        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{categoryLabel}</Badge>
            {product.fragrance && (
              <Badge variant="secondary">{product.fragrance}</Badge>
            )}
          </div>
          <CardTitle className="text-xl">{product.name}</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {product.description}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Price - Only show if displayPrice is true */}
          {product.displayPrice && (
            <div className="flex items-center gap-2">
              {product.salePrice ? (
                <>
                  <span className="text-lg line-through text-muted-foreground">
                    ${Number(product.price).toFixed(2)}
                  </span>
                  <span className="text-2xl font-bold text-primary">
                    ${Number(product.salePrice).toFixed(2)}
                  </span>
                  <Badge variant="destructive" className="ml-2">Sale</Badge>
                </>
              ) : (
                <span className="text-2xl font-bold text-primary">
                  ${Number(product.price).toFixed(2)}
                </span>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter>
          <Button
            className="w-full transition-shadow group-hover:shadow-md"
            onClick={handleAddToCart}
            disabled={isAdding}
          >
            {isAdding ? "Adding..." : "Add to Cart"}
            <ShoppingCart className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </div>
    </Card>
  );
}
