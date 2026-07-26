import { google } from "googleapis";
import { JWT } from "google-auth-library";

let authClient: JWT | null = null;

function getAuth() {
  if (authClient) return authClient;

  const key = process.env.GOOGLE_PRIVATE_KEY;
  const email = process.env.GOOGLE_CLIENT_EMAIL;

  if (!key || !email) throw new Error("Google Sheets credentials not configured");

  authClient = new JWT({
    email,
    key: key.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return authClient;
}

function getSheetId() {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error("GOOGLE_SHEET_ID not configured");
  return id;
}

export async function appendRows(sheetTitle: string, rows: unknown[][]) {
  const auth = getAuth();
  const spreadsheetId = getSheetId();

  const service = google.sheets({ version: "v4", auth: auth as any });

  // Ensure sheet exists, create if not
  const meta = await service.spreadsheets.get({ spreadsheetId });
  const existing = meta.data.sheets?.map((s) => s.properties?.title) ?? [];
  if (!existing.includes(sheetTitle)) {
    await service.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: sheetTitle } } }],
      },
    });
  }

  await service.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetTitle}!A:Z`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: rows },
  });
}

export async function clearSheet(sheetTitle: string) {
  const auth = getAuth();
  const spreadsheetId = getSheetId();
  const service = google.sheets({ version: "v4", auth: auth as any });

  await service.spreadsheets.values.clear({
    spreadsheetId,
    range: `${sheetTitle}!A:Z`,
  });
}

export async function ensureHeaders(sheetTitle: string, headers: string[]) {
  const auth = getAuth();
  const spreadsheetId = getSheetId();
  const service = google.sheets({ version: "v4", auth: auth as any });

  const meta = await service.spreadsheets.get({ spreadsheetId });
  const existing = meta.data.sheets?.map((s) => s.properties?.title) ?? [];

  if (!existing.includes(sheetTitle)) {
    await service.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: sheetTitle } } }],
      },
    });
    await service.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetTitle}!A1:Z1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [headers] },
    });
  }
}

export async function upsertRows(
  sheetTitle: string,
  rows: unknown[][],
  lookupCol: number,
) {
  const auth = getAuth();
  const spreadsheetId = getSheetId();
  const service = google.sheets({ version: "v4", auth: auth as any });

  const existing = await service.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetTitle}!A:Z`,
  });
  const existingRows = existing.data.values ?? [];

  for (const row of rows) {
    const key = String(row[lookupCol] ?? "");
    if (!key) {
      await appendRowsLocal(service, spreadsheetId, sheetTitle, [row]);
      continue;
    }

    const matchIdx = existingRows.findIndex(
      (r) => String(r[lookupCol] ?? "") === key,
    );

    if (matchIdx >= 0) {
      const rowNum = matchIdx + 1;
      await service.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetTitle}!A${rowNum}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [row] },
      });
      existingRows[matchIdx] = row as string[];
    } else {
      await appendRowsLocal(service, spreadsheetId, sheetTitle, [row]);
      existingRows.push(row as string[]);
    }
  }
}

async function appendRowsLocal(
  service: any,
  spreadsheetId: string,
  sheetTitle: string,
  rows: unknown[][],
) {
  await service.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetTitle}!A:Z`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: rows },
  });
}
