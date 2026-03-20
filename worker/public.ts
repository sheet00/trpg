interface Env {
  AI_PROXY: Fetcher;
  ASSETS: Fetcher;
}

function buildServiceRequest(request: Request) {
  const url = new URL(request.url);
  return new Request("https://trpg-worker.internal" + url.pathname + url.search, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });
}

async function handleApiRequest(request: Request, env: Env) {
  if (request.method === "OPTIONS") {
    return env.AI_PROXY.fetch(buildServiceRequest(request));
  }

  if (request.method !== "POST" && request.method !== "GET") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: {
        Allow: "GET, POST, OPTIONS",
      },
    });
  }

  return env.AI_PROXY.fetch(buildServiceRequest(request));
}

async function handleAssetRequest(request: Request, env: Env) {
  const response = await env.ASSETS.fetch(request);

  if (response.status !== 404) {
    return response;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return response;
  }

  const url = new URL(request.url);
  if (url.pathname.includes(".")) {
    return response;
  }

  const indexRequest = new Request(new URL("/index.html", url), request);
  return env.ASSETS.fetch(indexRequest);
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    if (url.pathname === "/api") {
      return handleApiRequest(request, env);
    }

    return handleAssetRequest(request, env);
  },
};
