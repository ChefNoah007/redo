import { useState, useCallback } from "react";
import {
  Page,
  Layout,
  LegacyCard,
  FormLayout,
  TextField,
  Button,
  Banner,
  Frame,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useActionData, useLoaderData, useSubmit } from "@remix-run/react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  // Fetch the current Voiceflow settings from metafields
  const response = await admin.graphql(
    `query {
      shop {
        metafield(namespace: "voiceflow_settings", key: "api_credentials") {
          value
        }
      }
    }`
  );

  const responseJson = await response.json();
  const metafield = responseJson.data.shop.metafield;
  
  let settings = {
    vf_key: "",
    vf_project_id: "",
    vf_version_id: ""
  };

  if (metafield) {
    try {
      settings = JSON.parse(metafield.value);
    } catch (e) {
      console.error("Error parsing metafield value:", e);
    }
  }

  return json({ settings });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const vf_key = formData.get("vf_key");
  const vf_project_id = formData.get("vf_project_id");
  const vf_version_id = formData.get("vf_version_id");
  
  // Save the settings to a metafield
  const settings = {
    vf_key,
    vf_project_id,
    vf_version_id
  };

  try {
    const response = await admin.graphql(
      `mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            key
            namespace
            value
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          metafields: [
            {
              namespace: "voiceflow_settings",
              key: "api_credentials",
              value: JSON.stringify(settings),
              type: "json",
            },
          ],
        },
      }
    );

    const responseJson = await response.json();
    const userErrors = responseJson.data.metafieldsSet.userErrors;
    
    if (userErrors.length > 0) {
      return json({ status: "error", errors: userErrors });
    }

    return json({ status: "success", settings });
  } catch (error) {
    console.error("Error saving metafields:", error);
    const errorMessage = error instanceof Error ? error.message : "Ein unbekannter Fehler ist aufgetreten";
    return json({ status: "error", message: errorMessage });
  }
};

// Define a type for our action data to help with type checking
type ActionData = 
  | { status: "success"; settings: any }
  | { status: "error"; message: string }
  | { status: "error"; errors: any[] }
  | undefined;

export default function VoiceflowSettings() {
  const { settings } = useLoaderData<typeof loader>();
  const actionData = useActionData() as ActionData;
  const submit = useSubmit();

  const [formState, setFormState] = useState({
    vf_key: settings.vf_key || "",
    vf_project_id: settings.vf_project_id || "",
    vf_version_id: settings.vf_version_id || "",
  });

  const handleChange = useCallback((value: string, name: string) => {
    setFormState((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(() => {
    submit(formState, { method: "post" });
  }, [submit, formState]);

  return (
    <Page
      title="Voiceflow Einstellungen"
      subtitle="Verwalten Sie Ihre Voiceflow API-Schlüssel und Projekt-IDs"
    >
      <Frame>
        {actionData?.status === "success" && (
          <Banner
            title="Einstellungen gespeichert"
            tone="success"
            onDismiss={() => {}}
          />
        )}
        {actionData?.status === "error" && (
          <Banner
            title="Fehler beim Speichern der Einstellungen"
            tone="critical"
            onDismiss={() => {}}
          >
            <p>{actionData?.status === "error" && "message" in actionData 
                ? actionData.message 
                : "Bitte versuchen Sie es erneut."}</p>
          </Banner>
        )}

        <Layout>
          <Layout.Section>
            <LegacyCard sectioned>
              <FormLayout>
                <TextField
                  label="Voiceflow API-Schlüssel"
                  value={formState.vf_key}
                  onChange={(value) => handleChange(value, "vf_key")}
                  autoComplete="off"
                  helpText="Der API-Schlüssel für die Voiceflow-Integration (VF_KEY)"
                />
                <TextField
                  label="Voiceflow Projekt-ID"
                  value={formState.vf_project_id}
                  onChange={(value) => handleChange(value, "vf_project_id")}
                  autoComplete="off"
                  helpText="Die Projekt-ID für Ihr Voiceflow-Projekt (VF_PROJECT_ID)"
                />
                <TextField
                  label="Voiceflow Versions-ID"
                  value={formState.vf_version_id}
                  onChange={(value) => handleChange(value, "vf_version_id")}
                  autoComplete="off"
                  helpText="Die Versions-ID für Ihr Voiceflow-Projekt (VF_VERSION_ID)"
                />
                <Button variant="primary" onClick={handleSubmit}>
                  Einstellungen speichern
                </Button>
              </FormLayout>
            </LegacyCard>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <LegacyCard sectioned title="Hilfe">
              <p>
                Diese Einstellungen werden für die Verbindung mit der Voiceflow-API benötigt.
                Sie können diese Werte in Ihrem Voiceflow-Dashboard finden.
              </p>
              <p>
                Nach dem Speichern werden diese Einstellungen automatisch in Ihrem Chat-Widget verwendet.
              </p>
            </LegacyCard>
          </Layout.Section>
        </Layout>
      </Frame>
    </Page>
  );
}