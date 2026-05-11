const router = require('express').Router();
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const { s3, BUCKET } = require('../lib/s3');
const { requireAuth } = require('../middleware/auth');

const DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const ALLOWED_TYPES = [...DOC_TYPES, ...IMAGE_TYPES];

const extFor = (contentType) => {
  switch (contentType) {
    case 'application/pdf': return 'pdf';
    case 'application/msword':
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return 'docx';
    case 'image/png': return 'png';
    case 'image/jpeg': return 'jpg';
    case 'image/webp': return 'webp';
    default: return 'bin';
  }
};

// POST /api/uploads/presign
// Returns a pre-signed PUT URL for direct browser → S3 upload, plus the final public fileUrl.
router.post('/presign', requireAuth, async (req, res, next) => {
  try {
    const { contentType, orgSlug } = req.body;
    if (!contentType || !orgSlug) {
      return res.status(400).json({ error: 'contentType and orgSlug are required' });
    }
    if (!ALLOWED_TYPES.includes(contentType)) {
      return res.status(400).json({ error: 'Unsupported file type. Use PDF, DOCX, or PNG/JPEG/WEBP.' });
    }

    const isImage = IMAGE_TYPES.includes(contentType);
    const prefix = isImage ? `details/${orgSlug}` : `documents/${orgSlug}`;
    const key = `${prefix}/${crypto.randomUUID()}.${extFor(contentType)}`;

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

// POST /api/uploads/presign-public
// Unauthenticated presign for the new-org registration flow.
// Files are pinned to the registrations/ prefix.
router.post('/presign-public', async (req, res, next) => {
  try {
    const { contentType } = req.body;
    if (!contentType) {
      return res.status(400).json({ error: 'contentType is required' });
    }
    if (!DOC_TYPES.includes(contentType)) {
      return res.status(400).json({ error: 'Unsupported file type. Use PDF or DOCX.' });
    }

    const key = `registrations/${crypto.randomUUID()}.${extFor(contentType)}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
    const fileUrl = `${process.env.S3_PUBLIC_BASE_URL}/${key}`;

    res.json({ uploadUrl, fileUrl, key });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
