const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { requireOrgAccess } = require('../middleware/requireRole');

// GET /api/orgs?type=greek|club
router.get('/', async (req, res, next) => {
  try {
    const { type } = req.query;
    const where = type ? { type } : {};
    const orgs = await prisma.organization.findMany({
      where,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, type: true, slug: true, logoUrl: true },
    });
    res.json(orgs);
  } catch (err) {
    next(err);
  }
});

// GET /api/orgs/:slug
router.get('/:slug', async (req, res, next) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { slug: req.params.slug },
      select: {
        id: true,
        name: true,
        type: true,
        slug: true,
        logoUrl: true,
        documents: {
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            docType: true,
            title: true,
            content: true,
            fileUrl: true,
            version: true,
            updatedAt: true,
            updatedById: true,
          },
        },
      },
    });
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    res.json(org);
  } catch (err) {
    next(err);
  }
});

// POST /api/orgs/:slug/documents
router.post('/:slug/documents', requireAuth, requireOrgAccess, async (req, res, next) => {
  try {
    const { docType, title, content, fileUrl } = req.body;
    if (!docType || !title || !content) {
      return res.status(400).json({ error: 'docType, title, and content are required' });
    }
    if (!['constitution', 'bylaws'].includes(docType)) {
      return res.status(400).json({ error: 'docType must be constitution or bylaws' });
    }

    const org = req.org || await prisma.organization.findUnique({ where: { slug: req.params.slug } });
    const doc = await prisma.document.create({
      data: {
        orgId: org.id,
        docType,
        title,
        content,
        fileUrl: fileUrl || null,
        updatedById: req.user.id,
      },
    });
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
