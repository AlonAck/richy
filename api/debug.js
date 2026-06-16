module.exports = function handler(req, res) {
  var keys = Object.keys(process.env).filter(function(k) {
    return k.indexOf("ANTHROPIC") !== -1 || k.indexOf("NODE") !== -1 || k.indexOf("VERCEL") !== -1;
  });
  res.status(200).json({ envKeys: keys, hasKey: !!process.env.ANTHROPIC_API_KEY });
};
