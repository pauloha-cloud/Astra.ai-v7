# Astra.ai - AI-Powered Educational Platform

Transform long YouTube videos into concise study materials using AI.

## Architecture

- **Frontend**: React + Vite (Tailwind CSS, Motion)
- **Backend**: Node.js + Express + TypeScript
- **Database**: Firestore
- **Auth**: Firebase Authentication
- **Payments**: Stripe

## Project Structure

```
astra-ai/
├── backend/            # Express API service
│   ├── src/            # Backend source code
│   └── package.json    # Backend dependencies
├── src/                # Frontend source code (React)
├── public/             # Static assets
├── server.ts           # Root entry point (Express + Vite Middleware)
├── package.json        # Main project configuration
└── cloudbuild.yaml     # CI/CD for Google Cloud
```

## Local Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Set Environment Variables**:
   Create a `.env` file based on `.env.example`.

3. **Run Development Server**:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`.

## API Endpoints

- `GET /health`: Check backend services status.
- `GET /api/v1/status`: API status message.

## Deployment

Deploy to Google Cloud Run using Cloud Build:
```bash
gcloud builds submit --config cloudbuild.yaml
```
