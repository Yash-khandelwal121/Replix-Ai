import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import customStyles from "../styles/custom.css?url";
import AppSidebar from "../components/layout/AppSidebar";
import { ToastProvider } from "../components/common/ToastProvider";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";

export const links = () => [
  { rel: "stylesheet", href: polarisStyles },
  { rel: "stylesheet", href: customStyles }
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopSettings = await db.shopSettings.findUnique({ where: { shop: session.shop } });
  const plan = shopSettings?.plan || "free";

  return { 
    apiKey: process.env.SHOPIFY_API_KEY || "", 
    shop: session.shop,
    plan 
  };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <ToastProvider>
        <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-bg)" }}>
          <AppSidebar />
          <main style={{ flex: 1, overflowY: "auto", position: "relative" }}>
            <Outlet />
          </main>
        </div>
      </ToastProvider>
    </AppProvider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError() as any;
  return (
    <div style={{ padding: "20px" }}>
      <h1>Error in App</h1>
      <pre>{error?.message || error?.statusText || "Unknown error"}</pre>
    </div>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
