import { extractText, getDocumentProxy } from "unpdf";

export const MAX_PDF_BYTES = 4 * 1024 * 1024; // 4 MB (Vercel tillåter max ~4,5 MB per anrop)

// Läser ut texten ur en PDF på servern. Själva PDF-filen sparas inte –
// bara texten, som hamnar i cv_text och används av AI-bedömningen.
export async function pdfToText(file: File): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
  const { text } = await extractText(pdf, { mergePages: true });
  return text
    .replace(/[ \t]+/g, " ") // dubbla mellanslag
    .replace(/\n{3,}/g, "\n\n") // många tomrader
    .trim();
}