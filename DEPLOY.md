# Deployment Guide for VoteZap

VoteZap is a full-stack application with a React (Vite) frontend and a Node.js (Express) backend. Follow these steps to deploy it.

## 1. Prerequisites
- A MongoDB database (e.g., MongoDB Atlas).
- A Redis instance (e.g., Upstash or Redis Cloud).
- Google OAuth credentials (from Google Cloud Console).
- Custom IdP credentials (if using an external auth provider).

---

## 2. Backend Deployment (e.g., Railway, Render, or Heroku)

### Steps:
1.  Connect your GitHub repository.
2.  Set the **Root Directory** to `backend`.
3.  Configure the **Build Command**: `npm install`
4.  Configure the **Start Command**: `npm run dev` (or `tsx src/server.ts` for production).
5.  Add the following **Environment Variables**:
    - `PORT`: `5000` (or as provided by the platform)
    - `NODE_ENV`: `production`
    - `MONGO_URI`: Your MongoDB connection string.
    - `REDIS_URL`: Your Redis connection string.
    - `JWT_ACCESS_SECRET`: A long random string.
    - `JWT_REFRESH_SECRET`: Another long random string.
    - `CLIENT_URL`: The URL where your frontend will be hosted (e.g., `https://votezap.vercel.app`).
    - `GOOGLE_CLIENT_ID`: Your Google OAuth Client ID.
    - `GOOGLE_CLIENT_SECRET`: Your Google OAuth Client Secret.

---

## 3. Frontend Deployment (e.g., Vercel, Netlify)

### Steps:
1.  Connect your GitHub repository.
2.  Set the **Root Directory** to `frontend`.
3.  Framework Preset: **Vite**.
4.  Configure the **Build Command**: `npm run build`
5.  Configure the **Output Directory**: `dist`
6.  Add the following **Environment Variables**:
    - `VITE_API_URL`: The URL of your deployed backend (e.g., `https://votezap-api.up.railway.app`).
    - `VITE_GOOGLE_CLIENT_ID`: Your Google OAuth Client ID.
    - `VITE_APP_URL`: The URL of your frontend (e.g., `https://votezap.vercel.app`).

---

## 4. Post-Deployment Check
- Ensure that the `CLIENT_URL` in the backend matches the frontend's URL to avoid CORS issues.
- Update the **Authorized Redirect URIs** in your Google Cloud Console to include your production callback URL (e.g., `https://votezap.vercel.app/auth/callback`).
