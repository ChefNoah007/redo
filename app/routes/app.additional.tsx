import { useEffect, useState, useCallback } from "react";
import { CSSProperties } from 'react';
import {
  Page,
  Layout,
  Text,
  Spinner,
  List,
  Select,
  Button,
  ButtonGroup,
  Card,
  Box,
} from "@shopify/polaris";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import { getVoiceflowSettings } from "../utils/voiceflow-settings.server";
import { VOICEFLOW_API_URL, APP_URL } from "../utils/env-config";
import ReactMarkdown from 'react-markdown';

// Define the type for our loader data
interface LoaderData {
  vf_key: string;
  vf_project_id: string;
}

// Loader function to fetch Voiceflow settings
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const settings = await getVoiceflowSettings(request);
  return json<LoaderData>({ 
    vf_key: settings.vf_key,
    vf_project_id: settings.vf_project_id
  });
};

// Fallback API URL für den Proxy-Server
const FALLBACK_API_URL = APP_URL;

interface Transcript {
  _id: string;
  sessionID: string; // Neu hinzugefügt
  createdAt: string; // Korrigiert: "created_at" zu "createdAt"
  projectID?: string; // Optionales Feld, falls benötigt
  browser?: string; // Optional, falls für spätere Zwecke benötigt
  device?: string;
  os?: string;
  updatedAt?: string;
  name?: string;
  image?: string;
}


interface TranscriptDetail {
  messages: Array<{
    sender: string;
    text: string;
  }>;
  platform?: string;
  tags?: string[];
  notes?: string;
}

export default function TranscriptViewer() {
  // Get Voiceflow settings from loader
  const { vf_key, vf_project_id } = useLoaderData<typeof loader>();
  const API_KEY = vf_key;
  const PROJECT_ID = vf_project_id;
  const [transcripts, setTranscripts] = useState<Transcript[]>([]); // Typ-Annotation hinzugefügt
  const [selectedTranscript, setSelectedTranscript] = useState<TranscriptDetail | null>(null); // Details eines Transkripts
  const [loading, setLoading] = useState(false);
  const [selectedID, setSelectedID] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'details'>('list');

  // API-Call 1: Transkriptübersicht
  const fetchTranscripts = async () => {
    setLoading(true);
    try {
      console.log("Transcript viewer - Fetching transcripts with API key:", API_KEY ? "Present (masked)" : "Missing");
      
      // Check if API key is available
      if (!API_KEY) {
        console.error("Transcript viewer - Missing API key");
        setTranscripts([]);
        return;
      }
      
      try {
        // Versuche zuerst, die Transkripte direkt von der Voiceflow API zu holen
        console.log(`Transcript viewer - Fetching from Voiceflow API: ${VOICEFLOW_API_URL}/transcripts/${PROJECT_ID}`);
        const response = await fetch(`${VOICEFLOW_API_URL}/transcripts/${PROJECT_ID}`, {
          method: "GET",
          headers: {
            Authorization: API_KEY,
            Accept: "application/json",
          },
        });
    
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Transcript viewer - API request failed: ${response.status} ${response.statusText}`, errorText);
          setTranscripts([]);
          return;
        }
    
        // Parse the response
        let data;
        try {
          data = await response.json();
          console.log("Transcript viewer - API Response:", data); // Debugging
        } catch (parseError) {
          console.error("Transcript viewer - Error parsing API response:", parseError);
          setTranscripts([]);
          return;
        }
        
        // Handle different response formats
        if (Array.isArray(data)) {
          console.log(`Transcript viewer - Received array with ${data.length} transcripts`);
          setTranscripts(data);
        } else if (data && Array.isArray(data.dailyTranscripts)) {
          // If the API returns an object with a dailyTranscripts array property
          console.log(`Transcript viewer - Received object with dailyTranscripts array (${data.dailyTranscripts.length} items)`);
          setTranscripts(data.dailyTranscripts);
        } else if (data && typeof data === 'object') {
          // Try to extract any array property from the response
          const arrayProps = Object.entries(data)
            .filter(([_, value]) => Array.isArray(value))
            .map(([key, value]) => ({ key, value: value as Transcript[] }));
          
          if (arrayProps.length > 0) {
            console.log(`Transcript viewer - Found array property '${arrayProps[0].key}' with ${arrayProps[0].value.length} items`);
            setTranscripts(arrayProps[0].value);
          } else {
            console.error("Transcript viewer - API response has no array properties:", data);
            setTranscripts([]);
          }
        } else {
          console.error("Transcript viewer - API did not return a valid response:", data);
          setTranscripts([]);
        }
      } catch (fetchError) {
        console.error("Transcript viewer - Error fetching transcripts:", fetchError);
        setTranscripts([]);
      }
    } catch (error) {
      console.error("Transcript viewer - Unexpected error:", error);
      setTranscripts([]);
    } finally {
      setLoading(false);
    }
  };

  // API-Call 2: Details eines Transkripts
  const fetchTranscriptDetails = async (transcriptID: string) => {
    console.log("Selected Transcript ID:", transcriptID);
    setSelectedID(transcriptID);
    setDetailsLoading(true); // Ladeanzeige starten
    try {
      // Versuche zuerst, die Transkript-Details direkt von der Voiceflow API zu holen
      console.log(`Transcript viewer - Fetching details from Voiceflow API: ${VOICEFLOW_API_URL}/transcripts/${PROJECT_ID}/${transcriptID}`);
      const response = await fetch(`${VOICEFLOW_API_URL}/transcripts/${PROJECT_ID}/${transcriptID}`, {
        method: "GET",
        headers: {
          Authorization: API_KEY,
          Accept: "application/json",
        },
      });
  
      if (!response.ok) {
        throw new Error(`Error fetching transcript: ${response.statusText}`);
      }
  
      const data = await response.json();
      console.log("Transcript details API response:", data);
  
      const messages = data
        .map((item: any) => {
          switch (item.type) {
            case "text":
              return {
                sender: "bot",
                text: item.payload?.payload?.message || null,
              };
            case "visual":
              if (item.payload?.payload?.visualType === "image" && item.payload?.payload?.image) {
                return {
                  sender: "bot",
                  text: `![visual message](${item.payload.payload.image})`,
                };
              }
              return null;
            case "request":
              return {
                sender: "user",
                text: item.payload?.payload?.label || item.payload?.payload?.query || null,
              };
            case "debug":
              // Falls es sich um einen Flow-Start handelt:
              if (item.payload?.payload?.type === "start") {
                return {
                  sender: "flow-start",
                  text: "Neue Seite geöffnet",
                };
              }
              return {
                sender: "debug",
                text: item.payload?.payload?.message || null,
              };
            default:
              return null;
          }
        })
        .filter((message: any) => message && message.text);
  
      if (messages.length === 0) {
        messages.push({ sender: "system", text: "No messages available for this transcript." });
      }
  
      setSelectedTranscript({ messages });
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error fetching transcript details:", error.message);
      } else {
        console.error("Unknown error fetching transcript details");
      }
      setSelectedTranscript(null);
    } finally {
      setDetailsLoading(false); // Ladeanzeige beenden
    }
  };
  

  // Media query for responsive design
  const checkIsMobile = useCallback(() => {
    setIsMobileView(window.innerWidth < 768);
  }, []);

  useEffect(() => {
    // Initial check
    checkIsMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkIsMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIsMobile);
  }, [checkIsMobile]);

  // Switch to details view when a transcript is selected on mobile
  useEffect(() => {
    if (isMobileView && selectedID) {
      setActiveView('details');
    }
  }, [selectedID, isMobileView]);

  // Get userID from URL parameters
  const [searchParams] = useSearchParams();
  const userIDParam = searchParams.get('userID');

  // Initiales Laden der Transkripte
  useEffect(() => {
    fetchTranscripts();
  }, []);
  
  useEffect(() => {
    console.log("Transcripts State:", transcripts); // Debugging
    
    // Automatically select transcript with matching sessionID if userID parameter exists
    if (userIDParam && transcripts.length > 0) {
      console.log("Searching for transcript with sessionID:", userIDParam);
      
      // Find transcript with matching sessionID
      const matchingTranscript = transcripts.find(
        (transcript) => transcript.sessionID === userIDParam
      );
      
      if (matchingTranscript) {
        console.log("Found matching transcript:", matchingTranscript._id);
        // Automatically select this transcript
        fetchTranscriptDetails(matchingTranscript._id);
      } else {
        console.log("No matching transcript found for sessionID:", userIDParam);
      }
    }
  }, [userIDParam, transcripts]);
  
  // Styles für Nachrichten
  const messageStyle = {
    padding: '10px 15px',
    borderRadius: '15px',
    margin: '5px 0',
    maxWidth: '75%',
    wordWrap: 'break-word' as 'break-word',
  };
  
  const userMessageStyle = {
    ...messageStyle,
    backgroundColor: '#cce5ff', // Hellblau
    color: '#004085', // Dunkelblau
    alignSelf: 'flex-end',
    fontSize: '0.9rem', // größere Schrift
  };
  
  const systemMessageStyle = {
    ...messageStyle,
    backgroundColor: '#f8f9fa', // Hellgrau
    color: '#495057', // Dunkelgrau
    alignSelf: 'flex-start',
    fontSize: '0.9rem', // größere Schrift
  };
    
  // 3. Einen eigenen Style für Debug-Nachrichten definieren:
  const debugMessageStyle = {
    ...messageStyle,
    backgroundColor: 'transparent', // kein Hintergrund
    color: '#a67c00',
    alignSelf: 'center',
    textAlign: 'center' as const,
    fontSize: '0.65rem', // kleinere Schrift
    margin: '2px 0', // reduce the gap
  };

  const flowStartMessageStyle = {
    display: "flex",
    alignItems: "center",
    margin: "10px 0",
  };
  
  const flowStartTextStyle = {
    flex: 1,
    height: "1px",
    background: "#e0e0e0",
  };
  
  const flowStartTextContainerStyle = {
    padding: "0 10px",
    color: "#888",
    fontSize: "0.65rem",
    whiteSpace: "nowrap",
  };
  
  const chatContainerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  };

  return (
    <Page 
      title="Transcripts"
      backAction={isMobileView && activeView === 'details' ? {
        onAction: () => setActiveView('list'),
        content: 'Back to List'
      } : undefined}
    >
      {isMobileView && (
        <div style={{ marginBottom: '16px' }}>
          <ButtonGroup>
            <Button 
              pressed={activeView === 'list'} 
              onClick={() => setActiveView('list')}
            >
              Transcript List
            </Button>
            <Button 
              pressed={activeView === 'details'} 
              onClick={() => setActiveView('details')}
              disabled={!selectedID}
            >
              Transcript Details
            </Button>
          </ButtonGroup>
        </div>
      )}
      
      <Layout>
        {/* Linke Seite: Liste der Transkripte */}
        {(!isMobileView || (isMobileView && activeView === 'list')) && (
          <Layout.Section variant = "oneThird">
          <Card>
          <Text as="h2" variant="headingMd">
            Transcripts ({transcripts.length})
          </Text>
            {loading && <Spinner size="small" />}
            <List>
              {transcripts.map((transcript) => (
                <List.Item key={transcript._id}>
                  <div
                    onClick={() => fetchTranscriptDetails(transcript._id)}
                    style={{
                      padding: '10px 15px',
                      margin: '5px 0',
                      borderBottom: '1px solid #e6e6e6',
                      cursor: 'pointer',
                      backgroundColor: selectedID === transcript._id ? '#f0f8ff' : 'transparent',
                      borderRadius: '5px',
                      boxShadow: selectedID === transcript._id ? '0 4px 8px rgba(0, 0, 0, 0.2) !important' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {/* Name des Users */}
                      <div style={{ marginBottom: '5px' }}>
                        <Text as="h2" variant="headingSm" fontWeight="bold">
                          {transcript.name || 'User'}
                        </Text>
                      </div>
                      {/* User ID */}
                      <div style={{ fontSize: '12px', color: '#888' }}>
                        <Text as="h3">
                          User ID: {transcript.sessionID || 'Unknown'}
                        </Text>
                      </div>
                      {/* Zeit und Datum */}
                      <Box paddingBlock="0" padding="100">
                        <Text as="h3">
                          {new Date(transcript.createdAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })},{' '}
                          {new Date(transcript.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: '2-digit',
                          })}
                        </Text>
                      </Box>
                    </div>
                  </div>
                </List.Item>
              ))}
            </List>
          </Card>
          </Layout.Section>
        )}

        {/* Rechte Seite: Details eines Transkripts */}
        {(!isMobileView || (isMobileView && activeView === 'details')) && (
          <Layout.Section>
          <Card>
            <Text as="h2" variant="headingMd">
              Transcript Details
            </Text>

            {selectedTranscript && (
              <div style={{ marginBottom: "10px" }}>
                <Button onClick={() => setShowDebug((prev) => !prev)} size="slim">
                  {showDebug ? "Hide Debug" : "Show Debug"}
                </Button>
              </div>
            )}

            {detailsLoading ? (
              <Text as="p">Loading ...</Text>
            ) : selectedTranscript ? (
              <div style={chatContainerStyle}>
                {selectedTranscript.messages
                  // Zeige Nachrichten, wobei "flow-start" immer durchgelassen wird.
                  .filter((msg) => msg.sender === "flow-start" || showDebug || msg.sender !== "debug")
                  .map((msg, idx) => {
                    if (msg.sender === "flow-start") {
                      // Spezielle Darstellung: eine Linie mit zentriertem Text.
                      return (
                        <div key={idx} style={flowStartMessageStyle}>
                          <div style={flowStartTextStyle}></div>
                          <div style={flowStartTextContainerStyle}>
                            {msg.text}
                          </div>
                          <div style={flowStartTextStyle}></div>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={idx}
                        style={
                          msg.sender === "user"
                            ? userMessageStyle
                            : msg.sender === "debug"
                            ? debugMessageStyle
                            : systemMessageStyle
                        }
                      >
                        <ReactMarkdown
                          components={{
                            img: ({ src, alt }) => (
                              <img
                                src={src || ""}
                                alt={alt || ""}
                                style={{ maxWidth: "200px" }}
                              />
                            ),
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <Text as="p">Select a transcript to view details</Text>
            )}
          </Card>
          </Layout.Section>
        )}
      </Layout>
    </Page>
  );
}
