import { getAuthorizedClient } from "./auth.mjs";

function extractItems(data, preferredKey) {
  if (preferredKey) {
    const preferred = data[preferredKey];
    if (Array.isArray(preferred)) {
      return preferred;
    }
  }

  const firstArray = Object.values(data).find((value) => Array.isArray(value));
  return Array.isArray(firstArray) ? firstArray : [];
}

export async function googleApiRequest({
  method = "GET",
  url,
  params,
  data,
}) {
  const client = await getAuthorizedClient();
  const response = await client.request({
    url,
    method,
    params,
    data,
  });

  return response.data;
}

export async function listAllPages(options) {
  const items = [];
  let pageToken;

  do {
    const page = await googleApiRequest({
      url: options.url,
      params: {
        ...options.params,
        pageToken,
      },
    });
    items.push(...extractItems(page, options.itemsKey));
    pageToken = typeof page.nextPageToken === "string" ? page.nextPageToken : undefined;
  } while (pageToken);

  return items;
}
