const jwt = require('jsonwebtoken');

/**
 * Like requireAuth, but does not 401 when the header is missing or invalid.
 * Sets req.user on success, leaves req.user = null otherwise.
 */
const optionalAuth = (req, _res, next) => {
  req.user = null;
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  const token = authHeader.slice(7);
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    req.user = null;
  }
  next();
};

module.exports = { optionalAuth };
