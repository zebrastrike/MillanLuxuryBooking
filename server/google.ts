import { OAuth2Client } from 'google-auth-library';
import { loadEnv } from './env.js';

const env = loadEnv();

let oauth2Client: OAuth2Client | null = null;

if (env.googleOAuthEnabled) {
  oauth2Client = new OAuth2Client(
    env.google.clientId,
    env.google.clientSecret,
    env.google.redirectUri
  );
}

const SCOPES = ['https://www.googleapis.com/auth/business.manage'];

export function getGoogleAuthUrl(): string {
  if (!oauth2Client) {
    throw new Error('Google OAuth not configured');
  }
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
}

export async function exchangeCodeForTokens(code: string) {
  if (!oauth2Client) {
    throw new Error('Google OAuth not configured');
  }
  const { tokens } = await oauth2Client.getToken(code);
  return {
    accessToken: tokens.access_token!,
    refreshToken: tokens.refresh_token || null,
    expiresAt: new Date(tokens.expiry_date!),
  };
}

export async function refreshAccessToken(refreshToken: string) {
  if (!oauth2Client) {
    throw new Error('Google OAuth not configured');
  }
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2Client.refreshAccessToken();
  return {
    accessToken: credentials.access_token!,
    expiresAt: new Date(credentials.expiry_date!),
  };
}

export async function fetchGoogleReviews(accessToken: string) {
  // Fetch reviews from Google Business Profile API
  // https://developers.google.com/my-business/content/review-data

  const response = await fetch(
    `https://mybusinessaccountmanagement.googleapis.com/v1/accounts`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Google API error: ${response.statusText}`);
  }

  const accounts = await response.json();
  // Get first account (usually only one)
  const account = accounts.accounts[0];

  // Fetch locations
  const locationsResponse = await fetch(
    `https://mybusiness.googleapis.com/v4/${account.name}/locations`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const locations = await locationsResponse.json();
  const location = locations.locations[0];

  // Fetch reviews
  const reviewsResponse = await fetch(
    `https://mybusiness.googleapis.com/v4/${location.name}/reviews`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const reviewsData = await reviewsResponse.json();

  return {
    reviews: (reviewsData.reviews || []).map((r: any) => ({
      externalId: r.reviewId,
      author: r.reviewer.displayName,
      content: r.comment || '',
      rating: r.starRating === 'FIVE' ? 5 :
              r.starRating === 'FOUR' ? 4 :
              r.starRating === 'THREE' ? 3 :
              r.starRating === 'TWO' ? 2 : 1,
      sourceUrl: `https://www.google.com/maps/contrib/${r.reviewer.profilePhotoUrl}`,
      createdAt: r.createTime,
    })),
  };
}
