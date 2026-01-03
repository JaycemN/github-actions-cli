import { RequestError } from "@octokit/request-error";

/**
 * Creates a RequestError from a failed fetch response with properly populated metadata
 * @param response - The failed fetch Response object
 * @param errorData - Optional error data from the response body
 * @returns A properly formatted RequestError
 */
async function createRequestError(
  response: Response,
  errorData?: unknown
): Promise<RequestError> {
  // Convert Headers object to plain object
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  // Try to parse error data if not provided
  let data = errorData;
  if (!data) {
    try {
      data = await response.clone().json();
    } catch {
      // If JSON parsing fails, try to get text
      try {
        data = await response.clone().text();
      } catch {
        data = {};
      }
    }
  }

  const message =
    typeof data === "object" && data !== null && "message" in data
      ? String(data.message)
      : response.statusText;

  return new RequestError(message, response.status, {
    response: {
      url: response.url,
      status: response.status,
      headers,
      data: data || {},
    },
    request: {
      method: "GET",
      url: response.url,
      headers: {},
    },
  });
}

export { createRequestError };
