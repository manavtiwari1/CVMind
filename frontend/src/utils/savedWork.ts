// AI tools save their page state as JSON in Work.htmlContent.
// Returns null when the content is not valid JSON.
export function parseSavedContent<T>(htmlContent: string): T | null {
  try {
    return JSON.parse(htmlContent) as T;
  } catch {
    return null;
  }
}
