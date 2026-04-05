const router = require('express').Router();
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

// Helper: check if the current user can write to a document's org.
async function canWrite(user, orgId) {
  if (user.role === 'super_admin') return true;
  const mapping = await prisma.orgAdmin.findUnique({
    where: { supabaseUserId_orgId: { supabaseUserId: user.id, orgId } },
  });
  return !!mapping;
}

// PATCH /api/documents/:id
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    if (!(await canWrite(req.user, doc.orgId))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { title, content, fileUrl } = req.body;
    const updated = await prisma.document.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(fileUrl !== undefined && { fileUrl }),
        version: { increment: 1 },
        updatedById: req.user.id,
      },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/documents/:id
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    if (!(await canWrite(req.user, doc.orgId))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.document.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
