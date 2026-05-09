const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const authRouter = require('./routes/auth');
const orgsRouter = require('./routes/orgs');
const documentsRouter = require('./routes/documents');
const uploadsRouter = require('./routes/uploads');
const registrationsRouter = require('./routes/registrations');

const app = express();

app.use(helmet());

const allowedOrigins = [
  'http://127.0.0.1:5500',
  'http://localhost:5500',
  'https://gsu-clubs-portal.vercel.app',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));

app.use('/api/auth', authRouter);
app.use('/api/orgs', orgsRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/registrations', registrationsRouter);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
