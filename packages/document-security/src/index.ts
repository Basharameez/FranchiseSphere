export function validateFileName(filename: string): boolean {
  if (!filename) return false;
  // Prevent traversal patterns
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return false;
  }
  return true;
}

export function validateFileBuffer(buffer: Buffer, expectedMime: string): { isValid: boolean; error?: string } {
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  if (buffer.length > MAX_SIZE) {
    return { isValid: false, error: "File size exceeds 5MB limit" };
  }

  // Magic byte checks
  if (expectedMime === "application/pdf") {
    const isPdf = buffer.slice(0, 4).toString() === "%PDF";
    if (!isPdf) return { isValid: false, error: "Invalid PDF file signature" };
  } else if (expectedMime === "image/png") {
    const isPng = buffer.slice(0, 4).toString("hex") === "89504e47";
    if (!isPng) return { isValid: false, error: "Invalid PNG file signature" };
  } else if (expectedMime === "image/jpeg") {
    const isJpeg = buffer.slice(0, 3).toString("hex") === "ffd8ff";
    if (!isJpeg) return { isValid: false, error: "Invalid JPEG file signature" };
  } else if (expectedMime === "application/zip") {
    const isZip = buffer.slice(0, 4).toString() === "PK\x03\x04";
    if (!isZip) return { isValid: false, error: "Invalid ZIP file signature" };
  }

  return { isValid: true };
}

export function sanitizeSVG(svgContent: string): { isValid: boolean; sanitized?: string; error?: string } {
  if (!svgContent) {
    return { isValid: false, error: "Empty SVG content" };
  }

  // Reject active content / scripts
  const lower = svgContent.toLowerCase();
  if (lower.includes("<script") || lower.includes("javascript:") || lower.includes("onload=") || lower.includes("onclick=")) {
    return { isValid: false, error: "Active content or script tags are not allowed in SVG" };
  }

  // Reject external references
  if (lower.includes("xlink:href=\"http") || lower.includes("href=\"http") || lower.includes("<feimage")) {
    return { isValid: false, error: "External references or imports are not allowed in SVG" };
  }

  return { isValid: true, sanitized: svgContent };
}

export function validateZipArchive(buffer: Buffer): { isValid: boolean; error?: string } {
  const raw = buffer.toString("binary");

  // Basic zip validation checks
  if (!raw.startsWith("PK\x03\x04")) {
    return { isValid: false, error: "Invalid ZIP signature" };
  }

  // Detect path traversal patterns in directory names inside zip headers
  if (raw.includes("../") || raw.includes("..\\")) {
    return { isValid: false, error: "Path traversal detected in ZIP entries" };
  }

  // Check Zip Bomb ratio (uncompressed size versus compressed size simulation)
  // Let's search for central directory records or parse header metadata.
  // Standard zip central directory signature PK\x01\x02
  let offset = 0;
  let totalUncompressedSize = 0;

  while (true) {
    const localHeaderIdx = raw.indexOf("PK\x03\x04", offset);
    if (localHeaderIdx === -1) break;

    // Local file header fields: uncompressed size is at byte offset 22 (4 bytes)
    const uncompressedSize = buffer.readUInt32LE(localHeaderIdx + 22);
    totalUncompressedSize += uncompressedSize;

    offset = localHeaderIdx + 4;
  }

  const compressionRatio = totalUncompressedSize / buffer.length;
  if (compressionRatio > 100) {
    return { isValid: false, error: "ZIP bomb detected (excessive compression ratio)" };
  }

  return { isValid: true };
}
