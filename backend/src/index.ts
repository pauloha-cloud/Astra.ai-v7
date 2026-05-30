import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes placeholder
app.get('/api/v1/status', (req: Request, res: Response) => {
  res.json({ message: 'Astra.ai API is online' });
});

app.listen(PORT, () => {
  console.log(`Backend service running on port ${PORT}`);
});
