import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import { json } from "@remix-run/node";
import { useEffect } from "react";
import { initializeEnv } from "./utils/env-config";
import "./styles/skeleton.css";

export const loader = () => {
  return json({
    env: {
      APP_URL: process.env.SHOPIFY_APP_URL || '',
    }
  });
};

export default function App() {
  const { env } = useLoaderData<typeof loader>();
  
  useEffect(() => {
    // Initialize client-side environment variables
    initializeEnv(env);
  }, [env]);
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
