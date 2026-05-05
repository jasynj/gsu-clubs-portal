const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const sign = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

// POST /api/auth/org-login
// Body: { slug, password }
router.post('/org-login', async (req, res, next) => {
  try {
    const { slug, password } = req.body;
    if (!slug || !password) {
      return res.status(400).json({ error: 'slug and password are required' });
    }

    const org = await prisma.organization.findUnique({ where: { slug } });
    if (!org) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, org.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = sign({ orgId: org.id, slug: org.slug, role: 'org_admin' });
    res.json({ token, org: { id: org.id, name: org.name, slug: org.slug } });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/admin-login
// Body: { username, password }
router.post('/admin-login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }

    if (username !== 'admin' || password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = sign({ role: 'super_admin', username: 'admin' });
    res.json({ token });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
