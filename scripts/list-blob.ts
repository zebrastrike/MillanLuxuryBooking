import { list } from '@vercel/blob';
import { config } from 'dotenv';

// Load environment variables
config();

async function listAllBlobs() {
  try {
    console.log('Listing all blobs in Vercel Blob storage...\n');

    const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.Blob_Evans_READ_WRITE_TOKEN;
    if (!token) {
      throw new Error('No blob token found in environment variables');
    }

    const { blobs } = await list({ token });

    if (blobs.length === 0) {
      console.log('No blobs found in storage.');
      return;
    }

    console.log(`Found ${blobs.length} files:\n`);

    blobs.forEach((blob, index) => {
      console.log(`${index + 1}. ${blob.pathname}`);
      console.log(`   URL: ${blob.url}`);
      console.log(`   Size: ${(blob.size / 1024).toFixed(2)} KB`);
      console.log(`   Uploaded: ${new Date(blob.uploadedAt).toLocaleString()}`);
      console.log('');
    });
  } catch (error) {
    console.error('Error listing blobs:', error);
  }
}

listAllBlobs();
