import { json } from "@remix-run/node";

export async function loader({ request }) {
  // Einfach mit einem Erfolg antworten
  return json({ success: true, timestamp: new Date().toISOString() });
}
