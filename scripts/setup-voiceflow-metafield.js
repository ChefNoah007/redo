#!/usr/bin/env node

/**
 * This script creates a metafield for the Voiceflow API credentials in the Shopify store.
 * It uses the Shopify Admin API to create the metafield.
 * 
 * Usage:
 * 1. Make sure you have the required environment variables set:
 *    - SHOPIFY_API_KEY: Your Shopify API key
 *    - SHOPIFY_API_SECRET: Your Shopify API secret
 *    - SHOP_DOMAIN: Your shop domain (e.g., your-store.myshopify.com)
 *    - VF_KEY: Your Voiceflow API key
 *    - VF_PROJECT_ID: Your Voiceflow project ID
 *    - VF_VERSION_ID: Your Voiceflow version ID
 * 
 * 2. Run the script:
 *    node scripts/setup-voiceflow-metafield.js
 */

import { shopifyApi, LATEST_API_VERSION } from "@shopify/shopify-api";
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const {
  SHOPIFY_API_KEY,
  SHOPIFY_API_SECRET,
  SHOP_DOMAIN,
  VF_KEY,
  VF_PROJECT_ID,
  VF_VERSION_ID
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

if (!VF_KEY || !VF_PROJECT_ID || !VF_VERSION_ID) {
  console.warn('Warning: One or more Voiceflow credentials are not set. The metafield will be created with empty or partial values.');
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

async function createVoiceflowMetafield() {
  try {
    // Create an offline session
    const session = shopify.session.customAppSession(SHOP_DOMAIN);
    
    // Create a REST client
    const client = new shopify.clients.Rest({ session });
    
    // Prepare the Voiceflow settings object
    const voiceflowSettings = {
      vf_key: VF_KEY || '',
      vf_project_id: VF_PROJECT_ID || '',
      vf_version_id: VF_VERSION_ID || ''
    };
    
    // Check if the metafield already exists
    console.log('Checking if Voiceflow metafield already exists...');
    const response = await client.get({
      path: 'metafields',
      query: {
        namespace: 'voiceflow_settings',
        key: 'api_credentials'
      }
    });
    
    const metafields = response.body.metafields;
    
    if (metafields && metafields.length > 0) {
      console.log('Voiceflow metafield already exists. Updating...');
      const metafieldId = metafields[0].id;
      
      // Update the existing metafield
      await client.put({
        path: `metafields/${metafieldId}`,
        data: {
          metafield: {
            id: metafieldId,
            value: JSON.stringify(voiceflowSettings),
            type: 'json_string'
          }
        }
      });
      
      console.log('Voiceflow metafield updated successfully!');
    } else {
      console.log('Creating new Voiceflow metafield...');
      
      // Create a new metafield
      await client.post({
        path: 'metafields',
        data: {
          metafield: {
            namespace: 'voiceflow_settings',
            key: 'api_credentials',
            value: JSON.stringify(voiceflowSettings),
            type: 'json_string'
          }
        }
      });
      
      console.log('Voiceflow metafield created successfully!');
    }
    
    // Create project_id metafield for liquid templates
    console.log('Checking if Voiceflow project_id metafield exists...');
    const projectIdResponse = await client.get({
      path: 'metafields',
      query: {
        namespace: 'voiceflow_settings',
        key: 'project_id'
      }
    });
    
    const projectIdMetafields = projectIdResponse.body.metafields;
    
    if (projectIdMetafields && projectIdMetafields.length > 0) {
      console.log('Voiceflow project_id metafield already exists. Updating...');
      const metafieldId = projectIdMetafields[0].id;
      
      // Update the existing metafield
      await client.put({
        path: `metafields/${metafieldId}`,
        data: {
          metafield: {
            id: metafieldId,
            value: VF_PROJECT_ID || '',
            type: 'string'
          }
        }
      });
      
      console.log('Voiceflow project_id metafield updated successfully!');
    } else {
      console.log('Creating new Voiceflow project_id metafield...');
      
      // Create a new metafield
      await client.post({
        path: 'metafields',
        data: {
          metafield: {
            namespace: 'voiceflow_settings',
            key: 'project_id',
            value: VF_PROJECT_ID || '',
            type: 'string'
          }
        }
      });
      
      console.log('Voiceflow project_id metafield created successfully!');
    }
    
    console.log('Done!');
  } catch (error) {
    console.error('Error creating/updating Voiceflow metafield:', error.message);
    if (error.response) {
      console.error('Response:', error.response.body);
    }
    process.exit(1);
  }
}

createVoiceflowMetafield();
