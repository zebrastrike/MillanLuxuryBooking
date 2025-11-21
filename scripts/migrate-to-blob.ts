import { put } from '@vercel/blob';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface BlobUploadResult {
  url: string;
  pathname: string;
  contentType: string;
  downloadUrl: string;
}

interface MigrationResults {
  static: Record<string, string>;
  gallery: Record<string, string>;
  errors: Array<{ file: string; error: string }>;
}

async function uploadToBlob(filePath: string, fileName: string): Promise<BlobUploadResult> {
  const fileBuffer = fs.readFileSync(filePath);
  const blob = await put(fileName, fileBuffer, {
    access: 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN!,
  });
  
  return blob;
}

async function migrateImages() {
  const results: MigrationResults = {
    static: {},
    gallery: {},
    errors: []
  };

  const assetsDir = path.join(__dirname, '..', 'attached_assets');
  
  // Static assets to migrate
  const staticAssets = [
    { local: 'generated_images/Dark_botanical_hero_background_18ef14b3.png', blob: 'static/dark-botanical-bg.png', key: 'darkBotanicalBg' },
    { local: 'generated_images/Light_botanical_section_background_e6c03f5a.png', blob: 'static/light-botanical-bg.png', key: 'lightBotanicalBg' },
    { local: 'generated_images/Gold_crown_logo_c3af8ae9.png', blob: 'static/millan-logo.png', key: 'millanLogo' },
    { local: 'IMG_3773_1763679613585.jpeg', blob: 'static/owner-photo.jpg', key: 'ownerPhoto' },
  ];

  console.log('🚀 Starting image migration to Vercel Blob...\n');

  // Upload static assets
  console.log('📦 Uploading static assets...');
  for (const asset of staticAssets) {
    try {
      const filePath = path.join(assetsDir, asset.local);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Skipping ${asset.local} - file not found`);
        results.errors.push({ file: asset.local, error: 'File not found' });
        continue;
      }

      const blob = await uploadToBlob(filePath, asset.blob);
      results.static[asset.key] = blob.url;
      console.log(`✅ Uploaded ${asset.key}: ${blob.url}`);
    } catch (error) {
      console.error(`❌ Failed to upload ${asset.local}:`, error);
      results.errors.push({ file: asset.local, error: String(error) });
    }
  }

  // Upload gallery screenshots
  console.log('\n📸 Uploading gallery screenshots...');
  const galleryFiles = fs.readdirSync(assetsDir).filter(file => 
    file.startsWith('Screenshot') && file.endsWith('.png')
  );

  for (const file of galleryFiles) {
    try {
      const filePath = path.join(assetsDir, file);
      const blobName = `gallery/${file}`;
      const blob = await uploadToBlob(filePath, blobName);
      results.gallery[file] = blob.url;
      console.log(`✅ Uploaded gallery image: ${file}`);
    } catch (error) {
      console.error(`❌ Failed to upload ${file}:`, error);
      results.errors.push({ file, error: String(error) });
    }
  }

  // Save results to JSON file
  const resultsPath = path.join(__dirname, 'blob-migration-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  
  console.log(`\n✨ Migration complete! Results saved to ${resultsPath}`);
  console.log(`\n📊 Summary:`);
  console.log(`   Static assets: ${Object.keys(results.static).length}`);
  console.log(`   Gallery images: ${Object.keys(results.gallery).length}`);
  console.log(`   Errors: ${results.errors.length}`);

  return results;
}

// Run migration
migrateImages().catch(console.error);
