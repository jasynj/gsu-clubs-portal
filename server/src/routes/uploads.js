const router = require('express').Router();
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const { s3, BUCKET } = require('../lib/s3');
const { requireAuth } = require('../middleware/auth');

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// POST /api/uploads/presign
// Returns a pre-signed PUT URL for direct browser → S3 upload, plus the final public fileUrl.
router.post('/presign', requireAuth, async (req, res, next) => {
  try {
    const { contentType, orgSlug } = req.body;
    if (!contentType || !orgSlug) {
      return res.status(400).json({ error: 'contentType and orgSlug are required' });
    }
    if (!ALLOWED_TYPES.includes(contentType)) {
      return res.status(400).json({ error: 'Unsupported file type. Use PDF or DOCX.' });
    }

    const ext = contentType === 'application/pdf' ? 'pdf' : 'docx';
    const key = `documents/${orgSlug}/${crypto.randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5-min TTL
    const fileUrl = `${process.env.S3_PUBLIC_BASE_URL}/${key}`;

    res.json({ uploadUrl, fileUrl, key });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
