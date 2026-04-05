const prisma = require('../lib/prisma');

/**
 * Requires the logged-in user to own the org (JWT orgId matches) OR be a super_admin.
 * Expects req.params.slug. Attaches req.org on success.
 */
const requireOrgAccess = async (req, res, next) => {
  try {
    if (req.user.role === 'super_admin') return next();

    const org = await prisma.organization.findUnique({
      where: { slug: req.params.slug },
      select: { id: true, name: true, slug: true, type: true, logoUrl: true },
    });
    if (!org) return res.status(404).json({ error: 'Organization not found' });

    if (req.user.orgId !== org.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    req.org = org;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requireOrgAccess };
