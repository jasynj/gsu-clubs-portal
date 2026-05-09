const router = require('express').Router();
const prisma = require('../lib/prisma');

const MAX_NAME = 200;
const MAX_MEMBERS = 50;
const MAX_DATES = 20;
const MAX_FILES = 10;

const isString = (v) => typeof v === 'string';
const isStringArray = (v, max) =>
  Array.isArray(v) && v.length <= max && v.every((x) => isString(x) && x.length <= 500);

// POST /api/registrations  (public)
router.post('/', async (req, res, next) => {
  try {
    const {
      orgName,
      orgType,
      submittedCategory,
      foundingMembers,
      meetingDates,
      fileUrls,
    } = req.body || {};

    if (!isString(orgName) || !orgName.trim() || orgName.length > MAX_NAME) {
      return res.status(400).json({ error: 'orgName is required (max 200 chars)' });
    }
    if (!['nphc', 'non_nphc', 'club'].includes(orgType)) {
      return res.status(400).json({ error: 'orgType must be nphc, non_nphc, or club' });
    }
    if (!isString(submittedCategory) || !submittedCategory.trim()) {
      return res.status(400).json({ error: 'submittedCategory is required' });
    }
    if (!isStringArray(foundingMembers, MAX_MEMBERS) || foundingMembers.length === 0) {
      return res.status(400).json({ error: 'foundingMembers must be a non-empty array (max 50)' });
    }
    if (!isStringArray(meetingDates, MAX_DATES)) {
      return res.status(400).json({ error: 'meetingDates must be an array (max 20)' });
    }
    if (!isStringArray(fileUrls || [], MAX_FILES)) {
      return res.status(400).json({ error: 'fileUrls must be an array (max 10)' });
    }

    const created = await prisma.registrationRequest.create({
      data: {
        orgName: orgName.trim(),
        orgType,
        submittedCategory: submittedCategory.trim(),
        foundingMembers,
        meetingDates,
        fileUrls: fileUrls || [],
      },
      select: { id: true, status: true, createdAt: true },
    });

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
