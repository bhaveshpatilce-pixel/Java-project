const jwt = require('jsonwebtoken');

/**
 * JWT authentication middleware.
 * Extracts Bearer token from Authorization header,
 * verifies it, and attaches decoded payload to req.user.
 */
const auth = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided. Authorization denied.' });
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role }
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token is invalid or expired.' });
  }
};

module.exports = auth;
