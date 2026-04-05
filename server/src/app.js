const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const authRouter = require('./routes/auth');
const orgsRouter = require('./routes/orgs');
const documentsRouter = require('./routes/documents');
const uploadsRouter = require('./routes/uploads');

const app = express();

app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://127.0.0.1:5500',
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));

app.use('/api/auth', authRouter);
app.use('/api/orgs', orgsRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/uploads', uploadsRouter);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
