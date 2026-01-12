import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Sparkles } from 'lucide-react';
import type { FragranceProduct } from '@shared/types';

interface FragranceCardProps {
  product: FragranceProduct;
}

export function FragranceCard({ product }: FragranceCardProps) {
  return (
    <Card className="overflow-hidden group hover:shadow-lg transition-shadow">
      {/* Product Image */}
      <div className="relative h-64 overflow-hidden bg-gradient-to-br from-purple-100 to-pink-100">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <p className="text-muted-foreground">No image</p>
          </div>
        )}
        {product.featured && (
          <Badge className="absolute top-3 right-3 bg-gradient-to-r from-purple-500 to-pink-500">
            <Sparkles className="w-3 h-3 mr-1" />
            Featured
          </Badge>
        )}
      </div>

      <CardHeader>
        <CardTitle className="text-xl">{product.name}</CardTitle>
        <CardDescription>{product.description}</CardDescription>
      </CardHeader>

      <CardContent>
        {/* Fragrance Info */}
        <div className="mb-4">
          <Badge variant="outline" className="mb-2">
            {product.fragrance}
          </Badge>
        </div>

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
          asChild
          className="w-full group-hover:shadow-md transition-shadow"
        >
          <a
            href={product.squareUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Shop Now
            <ExternalLink className="w-4 h-4 ml-2" />
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}
