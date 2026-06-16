module.exports = function handler(req, res) {
  res.status(200).json({
    hasKey: !!process.env.ANTHROPIC_API_KEY,
    projectName: process.env.VERCEL_PROJECT_NAME,
    projectUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    env: process.env.VERCEL_ENV
  });
};
