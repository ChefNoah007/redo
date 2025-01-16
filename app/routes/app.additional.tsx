import { useEffect, useState } from "react";
import { CSSProperties } from 'react';
import {
  Page,
  Layout,
  Text,
  Spinner,
  List,
  Select,
  Button,
  Card,
  Box,
} from "@shopify/polaris";

const API_KEY = "VF.DM.670508f0cd8f2c59f1b534d4.t6mfdXeIfuUSTqUi";
const PROJECT_ID = "6703af9afcd0ea507e9c5369";
const API_URL = "https://redo-ia4o.onrender.com";

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
  const [transcripts, setTranscripts] = useState<Transcript[]>([]); // Typ-Annotation hinzugefügt
  const [selectedTranscript, setSelectedTranscript] = useState<TranscriptDetail | null>(null); // Details eines Transkripts
  const [loading, setLoading] = useState(false);
  const [selectedID, setSelectedID] = useState<string | null>(null);

  // API-Call 1: Transkriptübersicht
  const fetchTranscripts = async () => {
    setLoading(true);
    try {
      const response = await fetch("https://redo-ia4o.onrender.com/transcripts", {
        method: "GET",
        headers: {
          Authorization: `${API_KEY}`,
          Accept: "application/json",
        },
      });
  
      if (!response.ok) {
        throw new Error("Failed to fetch transcripts");
      }
  
      const data = await response.json();
      console.log("API Response:", data); // Debugging
      setTranscripts(data); // Nutzt das "transcripts"-Feld aus der API-Antwort
    } catch (error) {
      console.error("Error fetching transcripts:", error);
      setTranscripts([]);
    } finally {
      setLoading(false);
    }
  };  

  // API-Call 2: Details eines Transkripts
  const fetchTranscriptDetails = async (transcriptID: string) => {
    console.log("Selected Transcript ID:", transcriptID);
    setSelectedID(transcriptID); // Setzt die ID für den Schatten
    try {
      const response = await fetch(`https://redo-ia4o.onrender.com/transcripts/${transcriptID}`, {
        method: "GET",
        headers: {
          Authorization: "VF.DM.670508f0cd8f2c59f1b534d4.t6mfdXeIfuUSTqUi",
          Accept: "application/json",
        },
      });
  
      if (!response.ok) {
        throw new Error(`Error fetching transcript: ${response.statusText}`);
      }
  
      const data = await response.json();
  
      console.log("Transcript details API response:", data);
  
      // Nur unterstützte Nachrichtentypen verarbeiten
      const messages = data
        .map((item: any) => {
          switch (item.type) {
            case "text":
              return {
                sender: "bot",
                text: item.payload?.payload?.message || null,
              };        
  
            case "request":
              return {
                sender: "user",
                text: item.payload?.payload?.query || null,
              };
  
            default:
              return null; // Überspringt unsupported Typen
          }
        })
        .filter((message: any) => message && message.text); // Entfernt leere Nachrichten
  
      // Fallback für leere Nachrichtenliste
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
      setSelectedTranscript(null); // Fehlerbehandlung
    }
  };
  

  // Initiales Laden der Transkripte
  useEffect(() => {
    fetchTranscripts();
  }, []);
  
  useEffect(() => {
    console.log("Transcripts State:", transcripts); // Debugging
  }, [transcripts]);
  
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
  };
  
  const systemMessageStyle = {
    ...messageStyle,
    backgroundColor: '#f8f9fa', // Hellgrau
    color: '#495057', // Dunkelgrau
    alignSelf: 'flex-start',
  };
    
  const chatContainerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  };

  return (
    <Page title="Transcripts">
      <Layout>
        {/* Linke Seite: Liste der Transkripte */}
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

        {/* Rechte Seite: Details eines Transkripts */}
        <Layout.Section>
          <Card>
            <Text as="h2" variant="headingMd">
              Transcript Details
            </Text>
            {loading ? (
              <Spinner size="small" />
            ) : selectedTranscript ? (
              <div style={chatContainerStyle}>
                {selectedTranscript.messages.map((msg, idx) => (
                  <div
                    key={idx}
                    style={msg.sender === "user" ? userMessageStyle : systemMessageStyle}
                  >
                    {msg.text}
                  </div>
                ))}
              </div>
            ) : (
              <Text as="p">Select a transcript to view details</Text>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
