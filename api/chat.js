module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  var apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: { type: "config_error", message: "ANTHROPIC_API_KEY is not set in environment variables." } });
    return;
  }

  var body = req.body;
  var messages = body.messages || [];
  var system = body.system || "";
  var maxTokens = body.maxTokens || 800;
  // Callers may request a specific model (e.g. Opus for the deep stock scout,
  // Sonnet for everything else). Whitelist to keep the proxy from being turned
  // into an open relay for arbitrary model strings.
  var ALLOWED_MODELS = { "claude-sonnet-4-6": 1, "claude-opus-4-8": 1, "claude-sonnet-5": 1 };
  var model = (body.model && ALLOWED_MODELS[body.model]) ? body.model : "claude-sonnet-4-6";

  try {
    var response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: model,
        max_tokens: maxTokens,
        system: system,
        messages: messages
      })
    });

    var data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: { type: "proxy_error", message: err.message || "Unknown error" } });
  }
};
