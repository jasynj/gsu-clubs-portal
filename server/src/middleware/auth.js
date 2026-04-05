const jwt = require('jsonwebtoken');

/**
 * Verifies the JWT passed in the Authorization header.
 * Populates req.user with { orgId, slug, role } (role: 'org_admin' or 'super_admin').
 */
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const token = authHeader.slice(7);
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = { requireAuth };
