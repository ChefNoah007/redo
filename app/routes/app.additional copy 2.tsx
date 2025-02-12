// pages/settings.tsx
import { useState, useEffect } from 'react';
import { Page, Layout, Card, TextField, Checkbox, Button, FormLayout, Toast, Frame } from '@shopify/polaris';
import { TitleBar } from '@shopify/app-bridge-react';

export default function SettingsPage() {
  // Zustand für alle Felder
  const [hideOnDesktop, setHideOnDesktop] = useState(false);
  const [hideOnMobile, setHideOnMobile] = useState(false);
  const [pageSlug, setPageSlug] = useState('');
  const [botBackgroundColour, setBotBackgroundColour] = useState('#FFFFFF');
  const [botTextColour, setBotTextColour] = useState('#1A1E23');
  const [userBackgroundColour, setUserBackgroundColour] = useState('#FECF02');
  const [userTextColour, setUserTextColour] = useState('#FFFAE5');
  const [chatHeading, setChatHeading] = useState('KI-Beratung');
  const [sendLabel, setSendLabel] = useState('Abschicken');
  const [typeHereLabel, setTypeHereLabel] = useState('Tippe hier dein Anliegen ein ...');
  const [outerRadius, setOuterRadius] = useState(0);
  const [chatBubbleRadius, setChatBubbleRadius] = useState(0);
  const [inputButtonRadius, setInputButtonRadius] = useState(0);

  const [toastActive, setToastActive] = useState(false);
  const [toastContent, setToastContent] = useState('');

  // Beim Laden der Seite sollen vorhandene Einstellungen aus Shopify geladen werden
  useEffect(() => {
    fetch('/api/get-settings')
      .then((res) => res.json())
      .then((data) => {
         if(data.settings) {
           setHideOnDesktop(data.settings.hide_on_desktop);
           setHideOnMobile(data.settings.hide_on_mobile);
           setPageSlug(data.settings.page_slug);
           setBotBackgroundColour(data.settings.bot_background_colour);
           setBotTextColour(data.settings.bot_text_colour);
           setUserBackgroundColour(data.settings.user_background_colour);
           setUserTextColour(data.settings.user_text_colour);
           setChatHeading(data.settings.chat_heading);
           setSendLabel(data.settings.send_label);
           setTypeHereLabel(data.settings.type_here_label);
           setOuterRadius(data.settings.outer_radius);
           setChatBubbleRadius(data.settings.chat_bubble_radius);
           setInputButtonRadius(data.settings.input_button_radius);
         }
      });
  }, []);

  const handleSave = async () => {
    const settings = {
      hide_on_desktop: hideOnDesktop,
      hide_on_mobile: hideOnMobile,
      page_slug: pageSlug,
      bot_background_colour: botBackgroundColour,
      bot_text_colour: botTextColour,
      user_background_colour: userBackgroundColour,
      user_text_colour: userTextColour,
      chat_heading: chatHeading,
      send_label: sendLabel,
      type_here_label: typeHereLabel,
      outer_radius: outerRadius,
      chat_bubble_radius: chatBubbleRadius,
      input_button_radius: inputButtonRadius,
    };

    const response = await fetch('/api/save-settings', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ settings }),
    });
    const result = await response.json();
    if(result.success) {
      setToastContent('Einstellungen gespeichert!');
      setToastActive(true);
    } else {
      setToastContent('Fehler beim Speichern!');
      setToastActive(true);
    }
  };

  const toastMarkup = toastActive ? (
    <Toast content={toastContent} onDismiss={() => setToastActive(false)} />
  ) : null;

  return (
    <Frame>
      <Page>
        <TitleBar title="Globale Einstellungen" />
        <Layout>
          <Layout.Section>
            <Card>
              <FormLayout>
                <Checkbox label="Chat-Bubble auf Desktop ausblenden" checked={hideOnDesktop} onChange={setHideOnDesktop} />
                <Checkbox label="Chat-Bubble auf Mobilgeräten ausblenden" checked={hideOnMobile} onChange={setHideOnMobile} />
                <TextField label="Page Slug" value={pageSlug} onChange={setPageSlug} autoComplete="off" />
                <TextField label="Bot Hintergrundfarbe" value={botBackgroundColour} onChange={setBotBackgroundColour} autoComplete="off"  />
                <TextField label="Bot Textfarbe" value={botTextColour} onChange={setBotTextColour} autoComplete="off" />
                <TextField label="User Hintergrundfarbe" value={userBackgroundColour} onChange={setUserBackgroundColour} autoComplete="off" />
                <TextField label="User Textfarbe" value={userTextColour} onChange={setUserTextColour} autoComplete="off" />
                <TextField label="Chat Heading" value={chatHeading} onChange={setChatHeading} autoComplete="off" />
                <TextField label="Send Button Label" value={sendLabel} onChange={setSendLabel} autoComplete="off" />
                <TextField label="Type Box Placeholder" value={typeHereLabel} onChange={setTypeHereLabel} autoComplete="off" />
                <TextField type="number" label="Äußerer Container – Border Radius (px)" value={outerRadius.toString()} onChange={(value)=> setOuterRadius(Number(value))} autoComplete="off" />
                <TextField type="number" label="Chat-Bubbles – Border Radius (px)" value={chatBubbleRadius.toString()} onChange={(value)=> setChatBubbleRadius(Number(value))} autoComplete="off" />
                <TextField type="number" label="Eingabefeld & Button – Border Radius (px)" value={inputButtonRadius.toString()} onChange={(value)=> setInputButtonRadius(Number(value))} autoComplete="off" />
                <Button onClick={handleSave}>Speichern</Button>
              </FormLayout>
            </Card>
          </Layout.Section>
        </Layout>
        {toastMarkup}
      </Page>
    </Frame>
  );
}
