// app/routes/app.additional copy.tsx
import { TitleBar } from '@shopify/app-bridge-react';
import {
  Page,
  Layout,
  Card,
  Button,
  Toast,
  Frame,
  Checkbox, // <-- wir importieren Checkbox
} from '@shopify/polaris';
import { useState } from 'react';

export default function SyncPage() {
  const [isSynchronizing, setIsSynchronizing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [overwrite, setOverwrite] = useState(false); 
  // ⬆️ State für die Checkbox

  const handleSynchronize = async () => {
    setIsSynchronizing(true);
    try {
      // ⬇️ Body enthält jetzt { overwrite }
      const response = await fetch('https://redo-ia4o.onrender.com/api/synchronize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ overwrite }), // wichtig!
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
              {/* Checkbox, um Overwrite zu wählen */}
              <Checkbox
                label="Overwrite existing data in Voiceflow?"
                checked={overwrite}
                onChange={(newChecked) => setOverwrite(newChecked)}
              />
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