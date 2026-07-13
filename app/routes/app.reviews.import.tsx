import { json, type ActionFunctionArgs, type LoaderFunctionArgs, unstable_createMemoryUploadHandler, unstable_parseMultipartFormData } from "@remix-run/node";
import { useActionData, useNavigation, useSubmit, useNavigate } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { Page, Layout, Card, BlockStack, Text, Button, DropZone, Banner } from "@shopify/polaris";
import { useState, useCallback } from "react";
import Papa from "papaparse";
import { detectSentiment } from "../lib/sentiment.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  const uploadHandler = unstable_createMemoryUploadHandler({ maxPartSize: 50_000_000 });
  const formData = await unstable_parseMultipartFormData(request, uploadHandler);
  
  const file = formData.get("file") as File;
  if (!file) {
    return json({ error: "No file uploaded." }, { status: 400 });
  }

  const text = await file.text();
  
  return new Promise((resolve) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as any[];
          if (!rows || rows.length === 0) {
            resolve(json({ error: "CSV is empty or invalid." }, { status: 400 }));
            return;
          }

          let successCount = 0;
          let errors = 0;

          // Record the import
          await db.cSVImport.create({
            data: {
              shop: session.shop,
              filename: file.name,
              rowCount: rows.length,
              status: "completed"
            }
          });

          for (const row of rows) {
            const customerName = row["Customer Name"] || row["customerName"] || row["Name"] || "Anonymous";
            const product = row["Product"] || row["product"] || null;
            const reviewText = row["Review"] || row["review"] || row["Body"] || "";
            const ratingRaw = row["Rating"] || row["rating"] || "5";
            let rating = parseInt(ratingRaw, 10);
            if (isNaN(rating) || rating < 1 || rating > 5) rating = 5;

            if (!reviewText) {
              errors++;
              continue;
            }

            await db.review.create({
              data: {
                shop: session.shop,
                customerName,
                productName: product,
                rating,
                body: reviewText,
                status: "pending",
                provider: "csv",
                sentiment: detectSentiment(reviewText, rating),
              }
            });

            successCount++;
          }

          resolve(json({ success: true, count: successCount, errors }));
        } catch (err: any) {
          resolve(json({ error: err.message || "Failed to process CSV." }, { status: 500 }));
        }
      },
      error: (err: any) => {
        resolve(json({ error: err.message || "Failed to parse CSV." }, { status: 400 }));
      }
    });
  });
};

export default function CSVImportPage() {
  const submit = useSubmit();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const actionData = useActionData<any>();

  const [file, setFile] = useState<File | null>(null);
  
  const isUploading = navigation.state === "submitting";

  const handleDropZoneDrop = useCallback(
    (_dropFiles: File[], acceptedFiles: File[], _rejectedFiles: File[]) =>
      setFile(acceptedFiles[0]),
    [],
  );

  const handleImport = () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    submit(formData, { method: "post", encType: "multipart/form-data" });
  };

  const fileUpload = !file && <DropZone.FileUpload />;
  const uploadedFile = file && (
    <BlockStack gap="200" inlineAlign="center">
      <Text as="p" variant="bodyMd" fontWeight="bold">
        {file.name}
      </Text>
      <Text as="p" variant="bodySm" tone="subdued">
        {Math.round(file.size / 1024)} KB
      </Text>
    </BlockStack>
  );

  return (
    <Page
      backAction={{ content: "Reviews", onAction: () => navigate("/app/reviews") }}
      title="Import Reviews via CSV"
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="p" variant="bodyMd">
                Upload a CSV file to bulk import your existing reviews. Ensure your CSV has headers for <strong>Customer Name</strong>, <strong>Product</strong>, <strong>Rating</strong>, and <strong>Review</strong>.
              </Text>

              {actionData?.error && (
                <Banner tone="critical">
                  <p>{actionData.error}</p>
                </Banner>
              )}

              {actionData?.success && (
                <Banner tone="success">
                  <p>Successfully imported {actionData.count} reviews. {actionData.errors > 0 ? `(${actionData.errors} rows skipped due to missing data)` : ""}</p>
                </Banner>
              )}

              <div style={{ height: 200, marginTop: 16, marginBottom: 16 }}>
                <DropZone allowMultiple={false} onDrop={handleDropZoneDrop} accept=".csv">
                  {uploadedFile}
                  {fileUpload}
                </DropZone>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <Button onClick={() => setFile(null)} disabled={!file || isUploading}>Clear</Button>
                <Button variant="primary" onClick={handleImport} disabled={!file || isUploading} loading={isUploading}>
                  Upload & Import
                </Button>
              </div>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
