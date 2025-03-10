#!/usr/bin/env node

/**
 * This script generates a .env file by extracting values from the shopify.app.toml file
 * and prompting the user for any missing values.
 * 
 * Usage:
 * node scripts/generate-env.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from '@iarna/toml';
import inquirer from 'inquirer';

// Get the directory name using ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function generateEnvFile() {
  try {
    console.log('Generating .env file from shopify.app.toml...');
    
    // Read and parse the shopify.app.toml file
    const tomlPath = path.join(rootDir, 'shopify.app.toml');
    const tomlContent = fs.readFileSync(tomlPath, 'utf8');
    const tomlData = parse(tomlContent);
    
    // Extract values from the TOML file
    const shopifyApiKey = tomlData.client_id || '';
    const shopDomain = tomlData.build?.dev_store_url || '';
    const shopifyAppUrl = tomlData.application_url || '';
    
    // Check if .env file already exists
    const envPath = path.join(rootDir, '.env');
    let overwrite = true;
    
    if (fs.existsSync(envPath)) {
      const { confirmOverwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmOverwrite',
          message: '.env file already exists. Do you want to overwrite it?',
          default: false
        }
      ]);
      
      overwrite = confirmOverwrite;
      
      if (!overwrite) {
        console.log('Operation cancelled. .env file was not modified.');
        return;
      }
    }
    
    // Prompt for missing values
    const questions = [
      {
        type: 'input',
        name: 'shopifyApiSecret',
        message: 'Enter your Shopify API Secret (find it in the Shopify Partner Dashboard under App credentials):',
        validate: input => input.trim() !== '' ? true : 'Shopify API Secret is required'
      },
      {
        type: 'input',
        name: 'judgeApiToken',
        message: 'Enter your Judge.me API Token (optional, find it in Judge.me dashboard under Settings > API):',
      },
      {
        type: 'input',
        name: 'vfKey',
        message: 'Enter your Voiceflow API Key (optional):',
      },
      {
        type: 'input',
        name: 'vfProjectId',
        message: 'Enter your Voiceflow Project ID (optional):',
      },
      {
        type: 'input',
        name: 'vfVersionId',
        message: 'Enter your Voiceflow Version ID (optional):',
      }
    ];
    
    const answers = await inquirer.prompt(questions);
    
    // Create the .env file content
    const envContent = `# Shopify API credentials
SHOPIFY_API_KEY=${shopifyApiKey}
SHOPIFY_API_SECRET=${answers.shopifyApiSecret}
SHOP_DOMAIN=${shopDomain}
SHOPIFY_APP_URL=${shopifyAppUrl}

# Judge.me API token
JUDGE_ME_API_TOKEN=${answers.judgeApiToken}

# Voiceflow API credentials
VF_KEY=${answers.vfKey}
VF_PROJECT_ID=${answers.vfProjectId}
VF_VERSION_ID=${answers.vfVersionId}
`;
    
    // Write the .env file
    fs.writeFileSync(envPath, envContent);
    
    console.log('\n✅ .env file generated successfully!');
    console.log(`Path: ${envPath}`);
    
    // Display the values that were extracted from the TOML file
    console.log('\nValues extracted from shopify.app.toml:');
    console.log(`- SHOPIFY_API_KEY: ${shopifyApiKey}`);
    console.log(`- SHOP_DOMAIN: ${shopDomain}`);
    console.log(`- SHOPIFY_APP_URL: ${shopifyAppUrl}`);
    
  } catch (error) {
    console.error('Error generating .env file:', error);
    process.exit(1);
  }
}

generateEnvFile();
