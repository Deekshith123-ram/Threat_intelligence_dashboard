import express from 'express';
import { createApiRouter } from '../server/app.js';

const app = express();
app.use('/api', createApiRouter());

export default app;
