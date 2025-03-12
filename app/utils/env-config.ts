/**
 * Client-safe environment configuration
 * This file provides access to constants that are safe to use in client-side code
 * No direct access to process.env variables here
 */

// Voiceflow API
export const VOICEFLOW_API_URL = "https://api.voiceflow.com/v2";

// These values will be populated by data from loaders, not directly from process.env
// They are declared as let so they can be set by the application
export let APP_URL = '';
export let API_SYNCHRONIZE_ENDPOINT = '';
export let API_SYNCHRONIZE_URLS_ENDPOINT = '';
export let API_AUTH_ENDPOINT = '';

// Initialize environment values from loader data
// This should be called in your root component with data from the loader
export function initializeEnv(envData: {
  APP_URL: string;
}) {
  APP_URL = envData.APP_URL;
  API_SYNCHRONIZE_ENDPOINT = `${APP_URL}/api/synchronize`;
  API_SYNCHRONIZE_URLS_ENDPOINT = `${APP_URL}/api/synchronize-urls`;
  API_AUTH_ENDPOINT = `${APP_URL}/api/auth`;
}
