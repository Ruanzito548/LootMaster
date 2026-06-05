import { promises as fs } from "node:fs";
import path from "node:path";

import { NextResponse } from "next/server";

const SUPPORTED_EXTENSIONS = new Set([".webm", ".mp4", ".gif", ".json", ".png", ".jpg", ".jpeg", ".webp", ".avif"]);

function getFormatPriority(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();

  switch (extension) {
    case ".webm":
      return 0;
    case ".mp4":
      return 1;
    case ".gif":
      return 2;
    case ".json":
      return 3;
    default:
      return 4;
  }
}

export async function GET() {
  const animationsDirectory = path.join(process.cwd(), "public", "animations");

  try {
    const entries = await fs.readdir(animationsDirectory, { withFileTypes: true });

    const files = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => SUPPORTED_EXTENSIONS.has(path.extname(name).toLowerCase()))
      .sort((a, b) => getFormatPriority(a) - getFormatPriority(b));

    return NextResponse.json({
      files,
      publicBasePath: "/animations",
    });
  } catch {
    return NextResponse.json(
      {
        files: [],
        publicBasePath: "/animations",
      },
      { status: 200 },
    );
  }
}
