# SEO & Google Console Setup for Millan Luxury Cleaning

## Files Created for SEO

### 1. **robots.txt** (`/robots.txt`)
- Located in public folder and automatically served at domain root
- Instructs search engines which pages to crawl
- Points to sitemap.xml
- Allows all major search engines (Google, Bing, etc.)

### 2. **sitemap.xml** (`/sitemap.xml`)
- XML sitemap listing all important pages and sections
- Includes image sitemap for gallery images
- Specifies change frequency and priority for each page
- Helps Google index pages faster

### 3. **Meta Tags** (in `client/index.html`)
- **Page Title:** Optimized for 7 Arizona cities
- **Meta Description:** Clearly describes services and locations
- **Keywords:** 20+ targeted keywords for luxury cleaning services
- **Open Graph:** Social media sharing preview
- **Twitter Cards:** Twitter-specific sharing
- **JSON-LD Structured Data:** LocalBusiness schema for rich search results
- **Canonical URL:** Prevents duplicate content issues
- **Geo-targeting:** Location-specific meta tags (Phoenix, AZ)

## Primary Keywords

The site targets these high-value keywords:
- Luxury cleaning services Phoenix AZ
- Premium house cleaning Arizona
- Deep cleaning Phoenix
- Professional home cleaners (cities)
- Move-in cleaning Phoenix
- Move-out cleaning Phoenix
- Residential cleaning services

**Cities Covered:** Phoenix, Surprise, Chandler, Glendale, Mesa, Scottsdale, Tempe

## Google Console Setup Steps

### Step 1: Add Property to Google Search Console
1. Go to [Google Search Console](https://search.google.com/search-console/)
2. Click **"Add Property"**
3. Enter your domain: `https://millanluxurycleaning.com`
4. Verify ownership (choose your preferred method: DNS, HTML file, or Google Analytics)

### Step 2: Submit Sitemap
1. In Google Search Console, go to **Sitemaps**
2. Click **"Add/Test Sitemaps"**
3. Enter: `sitemap.xml`
4. Click **Submit**
5. Wait for Google to crawl and index (can take 24-48 hours)

### Step 3: Check Robots.txt
1. Go to **Settings** → **Crawling**
2. Under "User-agents" you should see your robots.txt is properly configured
3. Click **"Test robots.txt"** to verify crawlability

### Step 4: Monitor Performance
1. Go to **Performance** tab
2. Monitor clicks, impressions, and average position
3. Track which keywords drive traffic

### Step 5: Fix Mobile Issues (if any)
1. Go to **Mobile Usability** report
2. Fix any issues Google reports
3. Request re-crawl when fixed

### Step 6: Check Indexing Status
1. Go to **Coverage** report
2. Ensure pages show as "Indexed" or "Crawled"
3. Fix any errors or warnings

## Verifying SEO Setup

### Test Robots.txt
```
Visit: https://millanluxurycleaning.com/robots.txt
Should display proper robots.txt content
```

### Test Sitemap
```
Visit: https://millanluxurycleaning.com/sitemap.xml
Should display XML sitemap with URLs
```

### Verify Meta Tags
Use [Google Mobile-Friendly Test](https://search.google.com/test/mobile-friendly):
1. Enter your URL
2. Tool will show meta tags and structured data

### Check Structured Data
Use [Google Rich Results Test](https://search.google.com/test/rich-results):
1. Enter your URL
2. Verify LocalBusiness schema is properly implemented
3. Check for any errors or warnings

## Important Notes for Vercel Deployment

- All files (robots.txt, sitemap.xml) are served from `/public` folder
- They're automatically available at domain root on Vercel
- Blob images have proper public URLs for Open Graph preview
- Canonical URL points to main domain to avoid duplicate indexing

## Next Steps

1. **Deploy to Vercel** - Ensure domain is properly connected
2. **Add to Google Search Console** - Submit within 24 hours of deployment
3. **Monitor Performance** - Check Google Search Console weekly for first month
4. **Create Content** - Blog posts about cleaning services will help SEO
5. **Build Backlinks** - Get mentions on local Arizona business directories

## Local Citation Building

Improve local SEO by listing in:
- Google Business Profile (critical)
- Yelp
- Arizona Better Business Bureau
- Local Phoenix business directories

Ensure NAP (Name, Address, Phone) is consistent across all listings.
