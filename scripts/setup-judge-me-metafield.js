#!/usr/bin/env node

/**
 * This script creates a metafield for the Judge.me API token in the Shopify store.
 * It uses the Shopify Admin API to create the metafield.
 * 
 * Usage:
 * 1. Make sure you have the required environment variables set:
 *    - SHOPIFY_API_KEY: Your Shopify API key
 *    - SHOPIFY_API_SECRET: Your Shopify API secret
 *    - SHOP_DOMAIN: Your shop domain (e.g., your-store.myshopify.com)
 *    - JUDGE_ME_API_TOKEN: Your Judge.me API token
 * 
 * 2. Run the script:
 *    node scripts/setup-judge-me-metafield.js
 */

import { shopifyApi, LATEST_API_VERSION } from "@shopify/shopify-api";
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const {
  SHOPIFY_API_KEY,
  SHOPIFY_API_SECRET,
  SHOP_DOMAIN,
  JUDGE_ME_API_TOKEN
} = process.env;

// Validate required environment variables
if (!SHOPIFY_API_KEY || !SHOPIFY_API_SECRET || !SHOP_DOMAIN) {
  console.error('Error: Missing required environment variables.');
  console.error('Please make sure the following variables are set:');
  console.error('- SHOPIFY_API_KEY');
  console.error('- SHOPIFY_API_SECRET');
  console.error('- SHOP_DOMAIN');
  process.exit(1);
}

if (!JUDGE_ME_API_TOKEN) {
  console.warn('Warning: JUDGE_ME_API_TOKEN is not set. The metafield will be created with an empty value.');
}

// Initialize the Shopify API client
const shopify = shopifyApi({
  apiKey: SHOPIFY_API_KEY,
  apiSecretKey: SHOPIFY_API_SECRET,
  scopes: ['write_metafields'],
  hostName: SHOP_DOMAIN.replace('.myshopify.com', ''),
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true,
});

async function createJudgeMeMetafield() {
  try {
    // Create an offline session
    const session = shopify.session.customAppSession(SHOP_DOMAIN);
    
    // Create a REST client
    const client = new shopify.clients.Rest({ session });
    
    // Check if the metafield already exists
    console.log('Checking if Judge.me metafield already exists...');
    const response = await client.get({
      path: 'metafields',
      query: {
        namespace: 'judge_me',
        key: 'api_token'
      }
    });
    
    const metafields = response.body.metafields;
    
    if (metafields && metafields.length > 0) {
      console.log('Judge.me metafield already exists. Updating...');
      const metafieldId = metafields[0].id;
      
      // Update the existing metafield
      await client.put({
        path: `metafields/${metafieldId}`,
        data: {
          metafield: {
            id: metafieldId,
            value: JUDGE_ME_API_TOKEN || '',
            type: 'string'
          }
        }
      });
      
      console.log('Judge.me metafield updated successfully!');
    } else {
      console.log('Creating new Judge.me metafield...');
      
      // Create a new metafield
      await client.post({
        path: 'metafields',
        data: {
          metafield: {
            namespace: 'judge_me',
            key: 'api_token',
            value: JUDGE_ME_API_TOKEN || '',
            type: 'string'
          }
        }
      });
      
      console.log('Judge.me metafield created successfully!');
    }
    
    console.log('Done!');
  } catch (error) {
    console.error('Error creating/updating Judge.me metafield:', error.message);
    if (error.response) {
      console.error('Response:', error.response.body);
    }
    process.exit(1);
  }
}

createJudgeMeMetafield();
