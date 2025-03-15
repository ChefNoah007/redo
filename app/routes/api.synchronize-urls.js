import { json } from "@remix-run/node";
import axios from "axios";
import { parseStringPromise } from "xml2js";
import { getVoiceflowSettings } from "../utils/voiceflow-settings.server";
import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  // Get Voiceflow settings from metafields
  const settings = await getVoiceflowSettings(request);
  
  try {
    const body = await request.json();
    const overwrite = body.overwrite === true;

    // Authenticate with Shopify and get the admin API client
    const authResult = await authenticate.admin(request);
    if (!authResult) {
      throw new Error("Authentication failed");
    }

    // Log the structure of the authResult to understand what's available
    console.log("Auth result structure in URL sync:", Object.keys(authResult));
    
    // Get the session from the auth result
    const { session } = authResult;
    if (!session) {
      throw new Error("No session found in auth result");
    }

    // Get the shop domain from the session
    const shopDomain = session.shop;
    if (!shopDomain) {
      throw new Error("No shop found in session");
    }
    
    // Fetch the sitemap
    const sitemapUrl = `https://${shopDomain}/sitemap.xml`;
    const sitemapResponse = await axios.get(sitemapUrl);
    
    if (!sitemapResponse.data) {
      throw new Error("Failed to fetch sitemap");
    }
    
    // Parse the XML sitemap
    const parsedSitemap = await parseStringPromise(sitemapResponse.data);
    
    // Extract URLs from the sitemap
    let allUrls = [];
    
    // Handle different sitemap formats
    if (parsedSitemap.urlset && parsedSitemap.urlset.url) {
      // Standard sitemap
      allUrls = parsedSitemap.urlset.url.map(url => url.loc[0]);
    } else if (parsedSitemap.sitemapindex && parsedSitemap.sitemapindex.sitemap) {
      // Sitemap index - we need to fetch each individual sitemap
      const sitemapUrls = parsedSitemap.sitemapindex.sitemap.map(sitemap => sitemap.loc[0]);
      
      // Fetch each sitemap (excluding product sitemaps)
      for (const sitemapUrl of sitemapUrls) {
        // Skip product sitemaps
        if (sitemapUrl.includes('/products_')) {
          continue;
        }
        
        try {
          const subSitemapResponse = await axios.get(sitemapUrl);
          const parsedSubSitemap = await parseStringPromise(subSitemapResponse.data);
          
          if (parsedSubSitemap.urlset && parsedSubSitemap.urlset.url) {
            const urls = parsedSubSitemap.urlset.url.map(url => url.loc[0]);
            allUrls = [...allUrls, ...urls];
          }
        } catch (error) {
          console.error(`Error fetching sub-sitemap ${sitemapUrl}:`, error);
        }
      }
    }
    
    // Filter out product URLs and limit to 190 URLs
    const filteredUrls = allUrls
      .filter(url => !url.includes('/products/'))
      .slice(0, 190);
    
    // Prepare data for Voiceflow
    const normalizedItems = filteredUrls.map(url => {
      // Extract page title from URL
      const urlObj = new URL(url);
      const pathSegments = urlObj.pathname.split('/').filter(segment => segment);
      let pageTitle = pathSegments.length > 0 
        ? pathSegments[pathSegments.length - 1].replace(/-/g, ' ') 
        : 'Home';
      
      // Capitalize first letter of each word
      pageTitle = pageTitle
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      // Determine page type
      let pageType = "Page";
      if (url.includes('/collections/')) {
        pageType = "Collection";
      } else if (url.includes('/pages/')) {
        pageType = "Information";
      } else if (url.includes('/blogs/')) {
        pageType = "Blog";
      } else if (url === `https://${shopDomain}/` || url === `https://${shopDomain}`) {
        pageType = "Homepage";
        pageTitle = "Homepage";
      }
      
      return {
        PageURL: url,
        PageTitle: pageTitle,
        PageType: pageType,
        LastModified: new Date().toISOString().split('T')[0] // Current date as YYYY-MM-DD
      };
    });
    
    // Voiceflow URL with optional overwrite parameter
    let voiceflowUrl = "https://api.voiceflow.com/v1/knowledge-base/docs/upload";
    if (overwrite) {
      voiceflowUrl += "?overwrite=true";
    }
    
    // The document API requires one URL per call, so we need to make multiple calls
    const uploadResults = [];
    const failedUrls = [];
    let successCount = 0;
    
    // Process URLs in batches to avoid overwhelming the API
    const batchSize = 5; // Process 5 URLs at a time
    for (let i = 0; i < filteredUrls.length; i += batchSize) {
      const batch = filteredUrls.slice(i, i + batchSize);
      
      // Process each URL in the batch concurrently
      const batchPromises = batch.map(async (url) => {
        try {
          const voiceflowData = {
            data: {
              type: "url",
              url: url
            }
          };
          
          const response = await fetch(voiceflowUrl, {
            method: "POST",
            headers: {
              Authorization: settings.vf_key,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(voiceflowData),
          });
          
          if (response.ok) {
            const result = await response.json();
            successCount++;
            return { success: true, url, result };
          } else {
            const errorDetails = await response.json();
            failedUrls.push(url);
            return { success: false, url, error: errorDetails };
          }
        } catch (error) {
          failedUrls.push(url);
          return { success: false, url, error: error.message };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      uploadResults.push(...batchResults);
      
      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < filteredUrls.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return json({
      success: successCount > 0,
      urlCount: successCount,
      totalUrls: filteredUrls.length,
      failedCount: failedUrls.length,
      failedUrls: failedUrls.length > 0 ? failedUrls : undefined
    });
  } catch (error) {
    console.error("URL synchronization error:", error);
    return json({ success: false, error: error.message });
  }
};
