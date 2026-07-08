export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(triggerGitHubAction(env, controller));
  },

  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname !== "/trigger") {
      return new Response("OK", { status: 200 });
    }

    const result = await triggerGitHubAction(env, {
      cron: "manual",
      scheduledTime: Date.now(),
    });

    return new Response(JSON.stringify(result, null, 2), {
      status: result.ok ? 200 : 500,
      headers: { "content-type": "application/json" },
    });
  },
};

async function triggerGitHubAction(env, controller) {
  const owner = env.GITHUB_OWNER;
  const repo = env.GITHUB_REPO;
  const workflowFile = env.GITHUB_WORKFLOW_FILE;
  const ref = env.GITHUB_REF || "main";

  const endpoint =
    `https://api.github.com/repos/${owner}/${repo}` +
    `/actions/workflows/${workflowFile}/dispatches`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2026-03-10",
      "User-Agent": "jc-lightchecker-cloudflare-worker",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ref,
    }),
  });

  const text = await response.text();

  if (!response.ok) {
    console.error("GitHub workflow_dispatch failed", {
      status: response.status,
      body: text,
    });

    return {
      ok: false,
      status: response.status,
      body: text,
    };
  }

  console.log("GitHub workflow_dispatch succeeded", {
    status: response.status,
    body: text,
  });

  return {
    ok: true,
    status: response.status,
    body: text,
  };
}
