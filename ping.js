const { configured, PASS } = require('./_db');
module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ auth: !!PASS, poll: true, db: configured() });
};
