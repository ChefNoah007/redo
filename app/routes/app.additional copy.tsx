// app/routes/app.additional copy.tsx
import { TitleBar } from '@shopify/app-bridge-react';
import {
  Box,
  Button,
  Card,
  Layout,
  Link,
  List,
  Page,
  Spinner,
  Text,
  BlockStack,
  Toast,
  Frame,
} from '@shopify/polaris';
import { useState } from 'react';

export default function SyncPage() {
  const [isSynchronizing, setIsSynchronizing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleSynchronize = async () => {
    setIsSynchronizing(true);
    try {
      const response = await fetch('https://redo-ia4o.onrender.com/api/synchronize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();

      if (data.success) {
        setToastMessage('Synchronization successful!');
      } else {
        setToastMessage('Synchronization failed: ' + data.error);
      }
    } catch (error) {
      setToastMessage('An error occurred during synchronization.');
    }
    setIsSynchronizing(false);
    setShowToast(true);
  };

  return (
    <Frame>
      <Page>
        <TitleBar title="Sync your Products" />
        <Layout>
          <Layout.Section>
            <Card>
              <Button
                disabled={isSynchronizing}
                onClick={handleSynchronize}
              >
                {isSynchronizing ? 'Synchronizing...' : 'Synchronize'}
              </Button>
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