import { NextResponse } from "next/server";

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
};

// GET /api/drive — returns a curated list of files from a specific Google Drive folder.
// Only works when GOOGLE_DRIVE_API_KEY and GOOGLE_DRIVE_FOLDER_ID are configured.
export async function GET() {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!apiKey || !folderId) {
    return NextResponse.json({
      configured: false,
      files: [],
    });
  }

  try {
    const url = new URL("https://www.googleapis.com/drive/v3/files");
    url.searchParams.set("q", `'${folderId}' in parents and trashed = false`);
    url.searchParams.set(
      "fields",
      "files(id,name,mimeType,size,modifiedTime,webViewLink,webContentLink,iconLink,thumbnailLink)"
    );
    url.searchParams.set("orderBy", "modifiedTime desc");
    url.searchParams.set("pageSize", "50");
    url.searchParams.set("key", apiKey);

    const res = await fetch(url.toString(), {
      next: { revalidate: 300 }, // cache for 5 minutes
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("Drive API error", res.status, text);
      return NextResponse.json(
        { configured: true, error: "Drive API error", files: [] },
        { status: 502 }
      );
    }

    const data = (await res.json()) as { files?: DriveFile[] };
    return NextResponse.json({
      configured: true,
      files: data.files ?? [],
    });
  } catch (err) {
    console.error("GET /api/drive error", err);
    return NextResponse.json(
      { configured: true, error: "Drive request failed", files: [] },
      { status: 500 }
    );
  }
}
