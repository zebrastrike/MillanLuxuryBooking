import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { Post } from "@shared/types";
import { ApiError } from "@/lib/queryClient";

const formatDate = (value?: string | Date | null) => {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
};

export default function BlogPost({ params }: { params: { slug: string } }) {
  const { data: post, isLoading, error } = useQuery<Post>({
    queryKey: [`/api/blog/${params.slug}`],
    retry: false,
  });

  const notFound = error instanceof ApiError && error.status === 404;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-12 max-w-3xl">
        <div className="mb-6 text-sm">
          <Link href="/blog" className="text-primary hover:underline">
            ← Back to blog
          </Link>
        </div>

        {isLoading && <p className="text-muted-foreground">Loading post...</p>}

        {notFound && <p className="text-destructive">Post not found.</p>}

        {!isLoading && !notFound && post && (
          <article className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{formatDate(post.createdAt)}</p>
              <h1 className="text-4xl font-serif font-semibold leading-tight">{post.title}</h1>
            </div>
            <p className="text-lg text-muted-foreground">{post.excerpt}</p>
            {post.imageUrl && (
              <div className="overflow-hidden rounded-lg border border-primary/10">
                <img src={post.imageUrl} alt={post.title} className="w-full h-80 object-cover" />
              </div>
            )}
            <div className="prose prose-invert max-w-none whitespace-pre-wrap">
              {post.body}
            </div>
          </article>
        )}

        {error && !notFound && !isLoading && (
          <p className="text-destructive">Failed to load post.</p>
        )}
      </div>
    </div>
  );
}
