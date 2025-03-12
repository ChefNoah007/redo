/**
 * Centralized environment configuration
 * This file provides access to environment variables used throughout the application
 */

// App URLs
export const APP_URL = process.env.SHOPIFY_APP_URL || '';
export const SHOP_URL = process.env.SHOPIFY_SHOP_URL || '';

// API endpoints
export const API_SYNCHRONIZE_ENDPOINT = `${APP_URL}/api/synchronize`;
export const API_SYNCHRONIZE_URLS_ENDPOINT = `${APP_URL}/api/synchronize-urls`;
export const API_AUTH_ENDPOINT = `${APP_URL}/api/auth`;

// Voiceflow API
export const VOICEFLOW_API_URL = "https://api.voiceflow.com/v2";

// Shop domain for offline sessions
export const getShopDomain = () => SHOP_URL;
