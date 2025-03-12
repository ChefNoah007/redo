// app/routes/app.sync.tsx
import { TitleBar } from '@shopify/app-bridge-react';
import {
  Page,
  Layout,
  Card,
  Button,
  Toast,
  Frame,
  Checkbox,
  RadioButton,
  TextContainer,
  Text,
} from '@shopify/polaris';
import { useState } from 'react';
import { API_SYNCHRONIZE_ENDPOINT, API_SYNCHRONIZE_URLS_ENDPOINT } from '../utils/env-config';

export default function SyncPage() {
  const [isSynchronizing, setIsSynchronizing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [overwrite, setOverwrite] = useState(false);
  const [syncType, setSyncType] = useState('products');
  const [syncResult, setSyncResult] = useState<{ 
    success: boolean; 
    urlCount?: number;
    totalUrls?: number;
    failedCount?: number;
    failedUrls?: string[];
  } | null>(null);

  const handleSynchronize = async () => {
    setIsSynchronizing(true);
    setSyncResult(null);
    
    try {
      // Determine which endpoint to call based on the selected sync type
      const endpoint = syncType === 'products' 
        ? API_SYNCHRONIZE_ENDPOINT
        : API_SYNCHRONIZE_URLS_ENDPOINT;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ overwrite }),
      });
      
      const data = await response.json();

      if (data.success) {
        if (syncType === 'products') {
          setSyncResult({
            success: true,
            urlCount: data.urlCount
          });
          setToastMessage('Product synchronization successful!');
        } else {
          // For URL synchronization, we have more detailed information
          setSyncResult({
            success: true,
            urlCount: data.urlCount,
            totalUrls: data.totalUrls,
            failedCount: data.failedCount,
            failedUrls: data.failedUrls
          });
          
          if (data.failedCount && data.failedCount > 0) {
            setToastMessage(`URL synchronization partially successful. ${data.urlCount} of ${data.totalUrls} URLs synchronized.`);
          } else {
            setToastMessage(`URL synchronization successful! ${data.urlCount} URLs synchronized.`);
          }
        }
      } else {
        const errorMessage = typeof data.error === 'object' ? JSON.stringify(data.error) : data.error;
        setSyncResult({
          success: false,
          ...(data.urlCount && { urlCount: data.urlCount }),
          ...(data.totalUrls && { totalUrls: data.totalUrls }),
          ...(data.failedCount && { failedCount: data.failedCount }),
          ...(data.failedUrls && { failedUrls: data.failedUrls })
        });
        setToastMessage(`Synchronization failed: ${errorMessage}`);
      }
    } catch (error) {
      setToastMessage('An error occurred during synchronization.');
    }
    
    setIsSynchronizing(false);
    setShowToast(true);
  };

  return (
    <Frame>
      <Page title="Synchronize with Voiceflow">
        <TitleBar title="Sync with Voiceflow" />
        <Layout>
          <Layout.Section>
            <Card>
              <TextContainer>
                <Text as="h2" variant="headingMd">Select what to synchronize</Text>
                <div style={{ marginTop: '16px' }}>
                    <RadioButton
                      label="Synchronize Products"
                      checked={syncType === 'products'}
                      id="products"
                      name="syncType"
                      onChange={() => setSyncType('products')}
                    />
                    <RadioButton
                      label="Synchronize Shop URLs (max 190, no product URLs)"
                      checked={syncType === 'urls'}
                      id="urls"
                      name="syncType"
                      onChange={() => setSyncType('urls')}
                    />
                </div>
              </TextContainer>
              
              <div style={{ marginTop: '16px' }}>
                <Checkbox
                  label="Overwrite existing data in Voiceflow?"
                  checked={overwrite}
                  onChange={(newChecked) => setOverwrite(newChecked)}
                />
              </div>
              
              <div style={{ marginTop: '16px' }}>
                <Button
                  disabled={isSynchronizing}
                  onClick={handleSynchronize}
                >
                  {isSynchronizing ? 'Synchronizing...' : 'Synchronize'}
                </Button>
              </div>
              
              {syncResult && syncType === 'urls' && (
                <div style={{ marginTop: '16px' }}>
                  {syncResult.success ? (
                    <>
                      <p>
                        Successfully synchronized {syncResult.urlCount} of {syncResult.totalUrls} URLs with Voiceflow.
                      </p>
                      {syncResult.failedCount && syncResult.failedCount > 0 && (
                        <p>
                          Failed to synchronize {syncResult.failedCount} URLs.
                        </p>
                      )}
                    </>
                  ) : (
                    <p>
                      Failed to synchronize URLs with Voiceflow.
                    </p>
                  )}
                </div>
              )}
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <TextContainer>
                <Text as="h2" variant="headingMd">About Synchronization</Text>
                <p>
                  This tool allows you to synchronize your Shopify data with Voiceflow.
                </p>
                <div style={{ marginTop: '16px' }}>
                  <p><strong>Products Synchronization:</strong></p>
                  <p>
                    Sends all your active products to Voiceflow, including their details, 
                    descriptions, and availability.
                  </p>
                </div>
                <div style={{ marginTop: '16px' }}>
                  <p><strong>URLs Synchronization:</strong></p>
                  <p>
                    Sends up to 190 shop URLs (excluding product URLs) to Voiceflow. 
                    This includes pages, collections, blogs, and other non-product URLs.
                  </p>
                </div>
              </TextContainer>
            </Card>
          </Layout.Section>

          {/* Toast wird nur angezeigt, wenn showToast = true */}
          {showToast && (
            <Toast
              content={toastMessage}
              onDismiss={() => setShowToast(false)}
            />
          )}
        </Layout>
      </Page>
    </Frame>
  );
}
