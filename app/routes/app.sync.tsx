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

export default function SyncPage() {
  const [isSynchronizing, setIsSynchronizing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [overwrite, setOverwrite] = useState(false);
  const [syncType, setSyncType] = useState('products');
  const [syncResult, setSyncResult] = useState<{ success: boolean; urlCount?: number } | null>(null);

  const handleSynchronize = async () => {
    setIsSynchronizing(true);
    setSyncResult(null);
    
    try {
      // Determine which endpoint to call based on the selected sync type
      const endpoint = syncType === 'products' 
        ? 'https://redo-ia4o.onrender.com/api/synchronize'
        : 'https://redo-ia4o.onrender.com/api/synchronize-urls';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ overwrite }),
      });
      
      const data = await response.json();

      if (data.success) {
        setSyncResult({
          success: true,
          urlCount: data.urlCount
        });
        setToastMessage(
          syncType === 'products' 
            ? 'Product synchronization successful!' 
            : `URL synchronization successful! ${data.urlCount || 0} URLs synchronized.`
        );
      } else {
        const errorMessage = typeof data.error === 'object' ? JSON.stringify(data.error) : data.error;
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
              
              {syncResult && syncResult.success && syncType === 'urls' && (
                <div style={{ marginTop: '16px' }}>
                  <p>
                    Successfully synchronized {syncResult.urlCount} URLs with Voiceflow.
                  </p>
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
