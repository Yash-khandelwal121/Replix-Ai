import { useEffect, useState, useRef } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useActionData, useLoaderData } from "@remix-run/react";
import {
  AppProvider as PolarisAppProvider,
  Button,
  Card,
  FormLayout,
  Page,
  Text,
  TextField,
} from "@shopify/polaris";
import polarisTranslations from "@shopify/polaris/locales/en.json";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

import { login } from "../../shopify.server";

import { loginErrorMessage } from "./error.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const errors = loginErrorMessage(await login(request));

  return { errors, polarisTranslations };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const errors = loginErrorMessage(await login(request));

  return {
    errors,
  };
};

export default function Auth() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [shop, setShop] = useState("");
  const { errors } = actionData || loaderData;
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // If we are running inside the Shopify Admin iframe, we can automatically get the shop domain
    // from App Bridge and auto-submit the login form to resume the authentication flow.
    const urlParams = new URLSearchParams(window.location.search);
    let shopDomain = urlParams.get("shop");
    
    // Fallback to App Bridge config if available
    if (!shopDomain && window.shopify && window.shopify.config && window.shopify.config.shop) {
      shopDomain = window.shopify.config.shop;
    }

    if (shopDomain && !errors.shop) {
      setShop(shopDomain);
      
      // Auto-submit after setting the shop using native form submission
      // to ensure target="_top" is respected and we break out of the iframe
      const timer = setTimeout(() => {
        if (formRef.current) {
          formRef.current.submit();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [errors.shop]);

  return (
    <PolarisAppProvider i18n={loaderData.polarisTranslations}>
      <Page>
        <Card>
          <form method="post" action="/auth/login" target="_top" ref={formRef}>
            <FormLayout>
              <Text variant="headingMd" as="h2">
                Log in
              </Text>
              <TextField
                type="text"
                name="shop"
                label="Shop domain"
                helpText="example.myshopify.com"
                value={shop}
                onChange={setShop}
                autoComplete="on"
                error={errors.shop}
              />
              <Button submit>Log in</Button>
            </FormLayout>
          </form>
        </Card>
      </Page>
    </PolarisAppProvider>
  );
}
