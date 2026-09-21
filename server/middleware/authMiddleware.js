const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'qbank-admin-secret-token-session-key';

export const requireAdminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Admin login required.'
    });
  }

  const parts = authHeader.split(' ');
  const token = parts.length === 2 ? parts[1] : authHeader;

  if (token !== ADMIN_TOKEN) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or expired admin session.'
    });
  }

  req.isAdmin = true;
  next();
};

export { ADMIN_TOKEN };
