// Vercel serverless function entry point
// This file exports the Express app for Vercel's serverless environment

import('../dist/index.js').then(module => {
  // The built server exports the Express app
  // Vercel automatically handles the serverless wrapper
}).catch(err => {
  console.error('Failed to load server:', err);
});

// Export a simple handler for Vercel
// The actual routes are handled by the Express app in dist/index.js
export default async function handler(req, res) {
  // This is a placeholder - you'll need to adapt your Express app
  // to work with Vercel's serverless environment
  res.status(200).json({ 
    message: 'Millan Luxury Cleaning API',
    note: 'Please see VERCEL_DEPLOYMENT.md for setup instructions'
  });
}
