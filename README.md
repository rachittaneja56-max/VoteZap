# VoteZap -- Real-Time Poll Management Platform

VoteZap is a full-stack, production-grade poll management platform that enables creators to build polls with configurable response modes (anonymous or authenticated), collect votes in real time via WebSockets, and publish finalized results to the public. The system is built on a service-oriented Express/TypeScript backend with MongoDB, a React/Vite frontend, and a custom-built authentication layer that supports both Google OAuth and a self-hosted OIDC identity provider (MyAuth).

---

### Application Flow

```text
[ Creator Signs In ]
        │
        ▼
[ Create Poll ]
        │
        ├───────────────────────┐
        │                       │
        ▼                       ▼
[ Anonymous Mode ]      [ Authenticated Mode ]
        │                       │
        └──────────┬────────────┘
                   │
                   ▼
           [ Share Poll Link ]
                   │
                   ▼
           [ Voter Opens Poll ]
                   │
                   ▼
        [ Authentication Check ]
                   │
                   ▼
         [ Display Voting Form ]
                   │
                   ▼
          [ Vote Submission ]
                   │
                   ▼
      [ Duplicate Prevention Check ]
                   │
                   ▼
        [ Save Response to DB ]
                   │
                   ▼
        [ Live Analytics Update ]
                   │
                   ▼
      [ Creator Publishes Result ]
                   │
                   ▼
        [ Public View Available ]
```

---

## Live Deployment

| Component | URL |
|:----------|:----|
| Frontend  | https://votezap.rachittaneja.in |
| Backend   | https://votezap.onrender.com |
| Auth Provider (MyAuth) | https://github.com/rachittaneja56-max/MyAuth |

---

## Technology Stack

| Layer | Technology |
|:------|:-----------|
| Frontend | React 19, TypeScript, Vite, TailwindCSS 4, Recharts, Socket.io Client |
| Backend | Node.js, Express 5, TypeScript, Mongoose ODM, Socket.io |
| Database | MongoDB (Atlas) |
| Authentication | Custom JWT (dual-provider: Google OAuth + MyAuth OIDC/PKCE) |
| Security | Helmet, CORS, Rate Limiting, FingerprintJS (anonymous vote deduplication) |
| Deployment | Render (backend), Custom domain (frontend) |

---

## API Reference and Route Architecture

All routes are prefixed with `/api`. The backend enforces two levels of authentication middleware:
- **requireAuth**: Rejects the request with `401 Unauthorized` if no valid access token cookie is present.
- **optionalAuth**: Attaches user context if a valid token exists, but allows anonymous requests to proceed.

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Middleware | Rate Limit | Description |
|:-------|:---------|:-----------|:-----------|:------------|
| POST | `/auth/google` | None | loginLimiter | Accepts a Google `idToken`, verifies it via `google-auth-library`, links or creates the user, and issues JWT cookie pair. |
| POST | `/auth/custom-idp` | None | loginLimiter | Accepts an authorization `code` and `code_verifier` from MyAuth. Performs PKCE token exchange, fetches user info, and issues JWT cookie pair. |
| POST | `/auth/refresh` | None | refreshLimiter | Validates the refresh token cookie against a SHA-256 hash stored in the database. Issues a new token pair and rotates the refresh token. |
| POST | `/auth/logout` | None | logoutLimiter | Clears both authentication cookies and invalidates the stored refresh token hash in the database. |
| GET | `/auth/me` | requireAuth | None | Returns the authenticated user profile from the access token payload. |

### Poll Management Routes (`/api/polls`)

| Method | Endpoint | Middleware | Description |
|:-------|:---------|:-----------|:------------|
| GET | `/polls` | requireAuth | Lists all polls created by the authenticated user. Uses a MongoDB aggregation pipeline to batch-compute response counts and leading options across all polls in a single query. |
| POST | `/polls` | requireAuth | Creates a new poll. Validates that at least one question exists and each question has a minimum of two options (enforced by a Mongoose array validator). |
| GET | `/polls/:id` | optionalAuth | Retrieves a single poll by ID. If the poll's `responseMode` is `AUTHENTICATED` and the poll is not published, the request is rejected without a valid session. |
| GET | `/polls/:id/analytics` | requireAuth | Returns computed analytics for the poll owner. Executes three parallel aggregation pipelines: vote distribution per option, participation breakdown (anonymous vs. authenticated), and a daily submission timeline. |
| POST | `/polls/:id/publish` | requireAuth | Freezes the poll by setting `isPublished: true`. Snapshots the current analytics into a `PublishedResult` document using `findOneAndUpdate` with `upsert: true` for idempotency. |
| PATCH | `/polls/:id/publish` | requireAuth | Alias for the POST publish endpoint (idempotent). |
| GET | `/polls/:id/results` | None | Returns the published result snapshot. Publicly accessible, but only returns data if the poll has been explicitly published by the creator. |

### Response Submission Routes (`/api/responses`)

| Method | Endpoint | Middleware | Description |
|:-------|:---------|:-----------|:------------|
| POST | `/responses/:pollId/submit` | optionalAuth | Submits a vote. Validates poll expiry, publication status, mandatory question coverage, and duplicate detection via `userId` (authenticated) or `anonymousId` (FingerprintJS). On success, triggers the analytics aggregation pipeline and broadcasts the result to all connected Socket.io clients in the poll room. |

### WebSocket Events (Socket.io)

| Event | Direction | Description |
|:------|:----------|:------------|
| `joinRoom` / `join-poll-room` | Client to Server | Subscribes the client socket to a specific poll room for live updates. |
| `new-response` | Server to Client | Emitted to the poll room after every vote submission. Payload contains the full re-computed analytics object. |
| `analyticsUpdate` | Server to Client | Duplicate emission of the analytics payload for backward compatibility. |

---

## Database Design and Schema

VoteZap uses MongoDB with Mongoose ODM. The schema employs embedded sub-documents for questions and options (eliminating JOIN overhead), while responses reference polls via ObjectId foreign keys.

```text
[ USER ] ────(creates)───< [ POLL ]
                            │
                            ├─(contains)──< [ QUESTION ] ──(has)──< [ OPTION ]
                            │
                            ├─(receives)──< [ RESPONSE ] ──(includes)──< [ ANSWER ]
                            │                 │
                            │                 └─(submits)─── [ USER ]
                            │
                            └─(produces)─── [ PUBLISHED_RESULT ]
```

**Key design decisions:**
- Questions and Options are embedded as sub-documents inside the Poll document. Mongoose auto-generates `_id` fields for each, which serve as stable identifiers for vote tracking.
- Responses reference the Poll via `pollId` (ObjectId) rather than embedding, since the response collection grows independently and must support high-throughput writes.
- The PublishedResult document is a denormalized snapshot created at publish time, ensuring that public result pages remain stable even if the underlying response data changes.

---

## Database Optimization and Indexing Strategy

### Indexing

| Collection | Indexed Field(s) | Type | Purpose |
|:-----------|:-----------------|:-----|:--------|
| Response | `pollId` | Single-field | Accelerates all analytics aggregation pipelines, which filter by poll. |
| Response | `anonymousId` | Single-field | Enables fast duplicate detection for anonymous voters using FingerprintJS hashes. |
| User | `email` | Unique | Enforces single-user identity across Google and MyAuth providers. Prevents duplicate accounts. |
| PublishedResult | `pollId` | Unique | Guarantees at most one published snapshot per poll. Supports idempotent `findOneAndUpdate` with `upsert`. |

### Validation Constraints

| Constraint | Location | Enforcement |
|:-----------|:---------|:------------|
| Minimum 2 options per question | `QuestionSchema` | Mongoose array validator rejects questions with fewer than two options at write time. |
| Mandatory question coverage | `response.service.ts` | Application-level check compares submitted `questionId` set against the poll's mandatory question IDs before persisting. |
| Duplicate vote prevention | `response.service.ts` | Queries for an existing response matching `{ pollId, userId }` (authenticated) or `{ pollId, anonymousId }` (anonymous) before insertion. |
| Poll expiry enforcement | `response.service.ts` | Compares `poll.expiresAt` against `new Date()` server-side before accepting any submission. |
| Publication lock | `response.service.ts` | Checks `poll.isPublished` flag; rejects votes on published polls. |

### Aggregation Performance

The analytics engine uses `Promise.all` to execute three independent aggregation pipelines in parallel:

1. **Vote Distribution**: `$match` (indexed on `pollId`) then `$unwind` on the `answers` array, then `$group` by `{ questionId, selectedOptionId }` with `$sum`. This computes per-option vote counts in a single pass over the database.
2. **Participation Breakdown**: `$match` then `$group` with conditional `$sum` using `$cond` to classify responses as anonymous (`userId === null`) or authenticated.
3. **Timeline**: `$match` then `$group` by date string (using `$dateToString`) to produce a daily submission histogram.

All three pipelines use the `pollId` index to skip irrelevant documents. The data reduction happens entirely on the MongoDB server; only the final counts are transmitted to the application layer.

### Real-Time Data Pipeline

```text
 [ Voter Submission ] ──▶ [ MongoDB Persistence ] ──▶ [ Aggregation Query ]
                                                              │
                                                              ▼
 [ Live Dashboard ]  ◀── [ Socket.io Broadcast ] ◀── [ Computation Result ]
```

The `listPollsByCreator` function uses `.lean()` on the poll query, which returns plain JavaScript objects instead of Mongoose document instances. This eliminates hydration overhead and reduces memory allocation by approximately 3 to 5 times for read-only operations.

---

## Custom Authentication Implementation

VoteZap implements a fully custom, end-to-end authentication system without reliance on third-party session providers (no Firebase, Clerk, or Auth0). The system covers everything from OAuth token exchange on the backend to session hydration and route guarding on the frontend, supporting two identity providers while maintaining a single unified user identity.

### Authentication Flow

```text
  [ GOOGLE OAUTH ]                     [ MYAUTH OIDC + PKCE ]
          │                                       │
          ▼                                       ▼
  [ Fetch idToken ]                  [ Generate PKCE Verifier ]
          │                                       │
          ▼                                       ▼
  [ POST /auth/google ]              [ Exchange Code for Token ]
          │                                       │
          └──────────────────┬────────────────────┘
                             │
                             ▼
                  [ Backend Verification ]
                  (google-auth-library / OIDC)
                             │
                             ▼
                  [ Link/Upsert User Profile ]
                  (Match by canonical Email)
                             │
                             ▼
                  [ Issue HttpOnly JWTs ]
                  (Access + Refresh Pair)
```

---

### Authentication Strategy

The core challenge is ensuring that a user who signs in with Google and later with MyAuth (or vice versa) is recognized as the same account. This is solved through **email-based identity linking** on the backend:

```typescript
const user = await User.findOneAndUpdate(
    { email: normalizeEmail(email) },
    {
        $setOnInsert: { email, name },
        $set: { [providerField]: providerId }
    },
    { upsert: true, new: true }
);
```

- The `email` field carries a unique index in MongoDB, serving as the canonical identity key across providers.
- `$setOnInsert` runs only when creating a new document. It sets the base profile (email, name) exactly once.
- `$set` runs on every login and updates only the provider-specific field (`googleId` or `customIdpId`), leaving the rest of the document intact.
- A user who first signs in with Google and later with MyAuth ends up with both `googleId` and `customIdpId` populated on the same document. The system treats them as one account.

---

### Backend: JWT and Session Management

All session state is carried exclusively via HTTP-only cookies. The frontend never has direct access to the token strings.

| Cookie | Lifetime | Contents | Purpose |
|:-------|:---------|:---------|:--------|
| `accessToken` | 15 minutes | `userId`, `email`, `type: 'access'` | Verified by `requireAuth` middleware on every protected request. |
| `refreshToken` | 7 days | `userId`, `type: 'refresh'` | Used to silently issue a new token pair without requiring re-login. |

**Cookie security settings (production):**
- `httpOnly: true` — inaccessible to JavaScript, preventing XSS token theft.
- `secure: true` — transmitted only over HTTPS.
- `sameSite: 'none'` — required for cross-origin cookie delivery (frontend and backend on separate domains).

**Refresh token hardening:**
- The raw refresh token is never stored. It is hashed with SHA-256 (`crypto.createHash`) before being written to the `User.refreshTokenHash` field.
- On every refresh request, the submitted token is re-hashed and compared to the stored hash using `crypto.timingSafeEqual`, preventing timing-based attacks that could leak hash information via response time differences.
- `refreshTokenHash` and `refreshTokenExpiresAt` are set with `select: false` in the Mongoose schema, meaning they are excluded from all standard queries and can never be accidentally returned in an API response.
- Token rotation is enforced: every successful refresh invalidates the old hash and writes a new one.

---

### Backend: Protected Route Middleware

Two Express middleware functions gate access to backend routes:

- **`requireAuth`**: Reads the `accessToken` cookie, verifies its signature against `JWT_ACCESS_SECRET`, and validates that the payload contains `type: 'access'`, `userId` (string), and `email` (string). On success, attaches the decoded payload to `req.user`. On any failure — missing cookie, invalid signature, expired token, malformed payload — throws `UnauthorizedError` which resolves to a `401` response.

- **`optionalAuth`**: Uses the same extraction and verification logic but wraps it in a try-catch. If the token is absent or invalid, `req.user` is simply set to `undefined` and the request continues. This is used for endpoints like `GET /polls/:id`, where anonymous access is permitted for `ANONYMOUS`-mode polls but the user identity is still attached if available.

---

### Frontend: AuthProvider and Session Lifecycle

The frontend manages authentication state through a custom React Context provider (`lib/auth.tsx`). There is no third-party state library involved.

**Initialization (instant hydration + background validation):**

1. On mount, `AuthProvider` calls `readCachedUser()`, which reads the `user` key from `localStorage` and parses it. If a valid user object is found (must contain `id` and `email`), the initial state is set to `authenticated` immediately. This prevents the login page from flashing on page load for returning users.
2. In the same render cycle, a background `refreshSession()` call is queued via `queueMicrotask`. This is a non-blocking validation that runs after the current render:
   - First attempt: `GET /api/auth/me` — verifies the access token cookie is still valid.
   - If that fails (expired access token): `POST /api/auth/refresh` — exchanges the refresh token cookie for a new token pair silently.
   - If both fail: the local cache is cleared, state is set to `anonymous`, and the user must sign in again.

**State transitions:**

| Status | Meaning | UI Effect |
|:-------|:--------|:----------|
| `checking` | Background validation in progress | `ProtectedRoute` shows loading indicator; `SessionBadge` shows "Checking session..." |
| `authenticated` | Valid session confirmed | Full access to protected routes |
| `anonymous` | No valid session | `ProtectedRoute` redirects to `/login`; `SessionBadge` shows login button |

**Exposed context functions:**
- `signIn(payload)`: Writes the user object to `localStorage` and updates React state. Called by both the Login page (Google path) and the AuthCallback page (MyAuth path).
- `logout()`: Calls `POST /api/auth/logout` to clear server-side cookies, then clears `localStorage` and resets state to `anonymous`.
- `refreshSession()`: Publicly exposed so any page can trigger re-validation on a `401` response.

---

### Frontend: Login Page and Provider Flows

**Google OAuth (Implicit Token Flow):**
1. The Google Identity Services `<script>` is dynamically loaded and the `google.accounts.id.renderButton` API renders the official Sign-In button inside a `ref` container. This ensures the button always meets Google's display requirements.
2. The `callback` handler receives a `credential` (an `idToken` JWT signed by Google). It posts this token to `POST /api/auth/google`.
3. On success, `signIn(data)` stores the user and the app navigates to the `?redirect=` path or `/dashboard`.

**MyAuth PKCE Flow:**
1. The "Continue with RachitsAuth" button triggers `startRachitsAuth()`.
2. A 64-character random `code_verifier` is generated using `crypto.getRandomValues` with a URL-safe alphabet.
3. A `code_challenge` is derived by hashing the verifier with SHA-256 via `crypto.subtle.digest` and encoding the result as base64url.
4. Both the verifier and a random `state` value are saved in `sessionStorage` (not `localStorage`) under fixed keys. The intended redirect destination is also saved in `sessionStorage` as `authRedirectTo`.
5. The browser is redirected to the MyAuth authorization endpoint with `response_type=code`, `code_challenge_method=S256`, and all required OIDC parameters.

**`/auth/callback` — PKCE Code Exchange:**
1. MyAuth redirects back to `https://votezap.rachittaneja.in/auth/callback?code=...&state=...`.
2. The `AuthCallback` component reads the URL parameters and retrieves the PKCE session from `sessionStorage`.
3. **State validation**: The `state` parameter from the URL is compared against the stored value. A mismatch indicates a CSRF attempt and is rejected immediately with an error message.
4. A request deduplication map (`customIdpExchangeByCode`) prevents the token exchange from being triggered twice if React's `StrictMode` double-invokes the effect. Only one network request is made per unique authorization code.
5. `POST /api/auth/custom-idp` is called with the `code` and `code_verifier`. The backend performs the full PKCE token exchange with MyAuth, fetches user info, upserts the user in MongoDB, and sets the cookie pair.
6. On success: `signIn(data)` updates the React state, `clearPkceSession()` removes the PKCE keys from `sessionStorage`, and the user is navigated to `authRedirectTo` or `/dashboard`.

---

### Frontend: ProtectedRoute and Redirect Preservation

The `ProtectedRoute` component in `App.tsx` wraps the `/dashboard` and `/analytics/:pollId` routes:

```tsx
function ProtectedRoute() {
  const location = useLocation()
  const { status, isAuthenticated } = useAuth()

  if (status === 'checking') return <LoadingScreen />
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}
```

When a user tries to access `/dashboard` without a session, they are redirected to `/login` with `state.from` set to the original location object. The Login page reads this via `useLocation().state?.from?.pathname` and uses it as the post-authentication redirect destination, ensuring the user lands exactly where they intended.

For the anonymous voting path (`/p/:pollId`), the `Vote` page handles its own auth gate: if the backend returns error code `LOGIN_REQUIRED`, the page renders a Sign-In link pointing to `/login?redirect=/p/:pollId`. This uses a `?redirect=` query parameter instead of router state because the URL is constructed before the user navigates and needs to survive a full-page redirect through the MyAuth OIDC flow.

---

### Anonymous vs. Authenticated Response Modes

Each poll has a `responseMode` field set at creation time:

**AUTHENTICATED mode:**
- The `GET /polls/:id` route uses `optionalAuth`. If `req.user` is undefined and the poll is not published, the controller throws `UnauthorizedError` with code `LOGIN_REQUIRED`.
- On the frontend, `Vote.tsx` catches this error code and shows a "Sign in" button linking to `/login?redirect=/p/:pollId`.
- On submission, the `userId` from the JWT payload (`req.user.userId`) is stored in the `Response.userId` field. Duplicate detection checks for an existing `{ pollId, userId }` pair before saving.

**ANONYMOUS mode:**
- No authentication is required at any stage. The `GET /polls/:id` response is returned to all visitors.
- Duplicate prevention relies on FingerprintJS. On component mount, the library loads asynchronously and generates a `visitorId` string derived from browser and hardware attributes. This value is stable across page reloads but does not use cookies or `localStorage`.
- The `visitorId` is sent as `anonymousId` in the POST body. The backend checks for an existing `{ pollId, anonymousId }` pair and rejects the submission if one is found.


---

## Frontend Architecture


The frontend is a single-page application built with React 19, TypeScript, and Vite. It uses TailwindCSS 4 for styling, React Router for client-side navigation, Recharts for data visualization, and Socket.io Client for real-time updates. There are no external UI component libraries; all components are custom-built.

### Routing and Access Control

The application uses React Router v7 with a `ProtectedRoute` wrapper component that gates access to authenticated-only pages. The routing table is defined in `App.tsx`:

| Route | Component | Access | Description |
|:------|:----------|:-------|:------------|
| `/` | `Home` | Public | Marketing landing page with interactive mock poll, feature showcase, and analytics preview. |
| `/login` | `Login` | Public | Dual-provider login page (Google Sign-In button and MyAuth OIDC/PKCE flow). Accepts a `?redirect=` query parameter to return users to their original destination after authentication. |
| `/auth/callback` | `AuthCallback` | Public | Handles the OIDC authorization code callback from MyAuth. Validates the `state` parameter against the stored PKCE session, exchanges the code for tokens via the backend, and redirects to the stored destination. |
| `/p/:pollId` | `Vote` | Public / Conditional | The voting form. For `ANONYMOUS` polls, no login is required. For `AUTHENTICATED` polls, the page detects a `LOGIN_REQUIRED` error code from the backend and renders a "Sign in" link that preserves the current poll path as a redirect target. |
| `/dashboard` | `Dashboard` | Protected | Creator dashboard displaying all polls with response counts, status badges, sparkline activity charts, search, and filter controls. |
| `/analytics/:pollId` | `Analytics` | Protected | Real-time analytics dashboard for a specific poll with bar charts, pie charts, QR code sharing, and PDF export. |

The `ProtectedRoute` component checks `useAuth().status`:
- If `checking`, it renders a loading indicator while the session is being validated.
- If not authenticated, it redirects to `/login` with the current location stored in React Router's `state.from`, allowing the login page to return the user to their intended destination.

### State Management

The application uses a custom `AuthProvider` (React Context) for global authentication state. There is no external state management library (no Redux, Zustand, or MobX). Each page manages its own local state via `useState` and `useEffect`.

**AuthProvider (`lib/auth.tsx`):**
- On mount, reads a cached user from `localStorage` for instant hydration (avoids a flash of the login page).
- Immediately validates the session by calling `GET /api/auth/me`. If that fails, attempts a silent refresh via `POST /api/auth/refresh`.
- If both fail, clears the local cache and sets status to `anonymous`.
- Exposes `signIn`, `logout`, and `refreshSession` functions to all child components.

**API Layer (`lib/api.ts`):**
- `apiFetch`: A thin wrapper around the native `fetch` API that automatically sets `credentials: 'include'` (to send HTTP-only cookies), applies `Content-Type: application/json`, and normalizes the API base URL from `VITE_API_URL`.
- `parseJsonResponse`: Unwraps the standardized `{ status, message, data }` response envelope. Throws a typed `ApiError` with the backend error code (e.g., `UNAUTHORIZED`, `LOGIN_REQUIRED`) for structured error handling in the UI.
- `ApiError`: A custom error class carrying an optional `code` property, enabling the UI to differentiate between error types (e.g., showing a "Sign in" button for `LOGIN_REQUIRED` vs. a generic error message for `NOT_FOUND`).

### Page Descriptions

**Home Page (`Home.tsx`)**
- A full marketing landing page with four sections: hero, features grid, "How it Works" stepper, and analytics preview.
- The hero section contains an interactive mock poll that lets visitors click options and submit a vote, which transitions to a live bar chart showing results. This demonstrates the product without requiring an account.
- The "How it Works" section is a three-step interactive walkthrough with animated panel transitions, simulating the question builder, permissions/expiry configuration, and link sharing flow.
- The analytics preview section renders a mock dashboard inside a browser chrome frame, showing stat cards, per-question result bars, a response trend chart, and a feedback feed.

**Login Page (`Login.tsx`)**
- Renders two authentication options: a Google Sign-In button (rendered via the Google Identity Services library) and a custom "Continue with RachitsAuth" button.
- Reads the `?redirect=` query parameter from the URL. This parameter is set by the `Vote` page when an authenticated poll requires login. After successful authentication, the user is navigated to this redirect path instead of the default `/dashboard`.
- The RachitsAuth flow generates a PKCE code verifier and challenge using the Web Crypto API (`lib/pkce.ts`), stores them in `sessionStorage`, and redirects to the MyAuth authorization endpoint. The `authRedirectTo` value is also saved in `sessionStorage` so the callback page knows where to send the user.

**Dashboard Page (`Dashboard.tsx`)**
- Fetches all polls created by the authenticated user via `GET /api/polls`.
- Displays four stat cards at the top: Total Polls, Total Responses (summed client-side), Average Completion percentage, and an Activity Trend sparkline chart (last 7 polls, cumulative responses).
- Below the stats, a searchable and filterable data table lists all polls with columns for title, status badge (Active/Expired/Published with color-coded dots), response count, leading option text with percentage, creation date, and action buttons (Publish, Copy Link, Analytics).
- Publish and Copy Link actions are inline with optimistic UI feedback (e.g., "Copied" text appears for 2 seconds).

**Analytics Page (`Analytics.tsx`)**
- Establishes a persistent Socket.io connection to the backend on mount. The socket joins the poll's room and listens for `analyticsUpdate` and `new-response` events. When received, the analytics state is replaced entirely with the new payload, causing all charts and stat cards to re-render with live data.
- The top section displays four stat cards: Total Responses, Completion Rate, Time Remaining (calculated from `expiresAt` with human-readable formatting), and Live Status (shows a pulsing green dot when the socket is connected).
- The middle section contains a 2-column layout: a Voting Timeline bar chart (response count per day using Recharts) and a sidebar with a Participation Mix donut chart (anonymous vs. authenticated) and a Quick Share panel with a QR code (generated via `qrcode.react`) and a copy-link button.
- The bottom section renders detailed per-question result cards with animated progress bars that transition smoothly when vote counts change in real time.
- The "Download PDF" button generates a multi-page A4 report using `jsPDF` with manual text and shape rendering (no image capture). The PDF includes the poll title, generation timestamp, participation stats, and per-question vote distributions with vector progress bars.

**Vote Page (`Vote.tsx`)**
- Loads the poll data via `GET /api/polls/:pollId`. If the poll's `responseMode` is `AUTHENTICATED` and the user is not logged in, the backend returns a `LOGIN_REQUIRED` error code. The frontend catches this and renders a "Sign in" link pointing to `/login?redirect=/p/:pollId`, preserving the return path.
- If the poll is published, it fetches the published results via `GET /api/polls/:pollId/results` and renders a `PublishedResultsView` component showing the final tallies with progress bars.
- For anonymous polls, FingerprintJS is initialized on mount. The library analyzes browser attributes to generate a stable `visitorId` hash. This ID is attached to the submission payload as `anonymousId`, enabling the backend to reject duplicate votes from the same device.
- The voting form renders each question as a `fieldset` with radio-button option cards. Mandatory questions are marked with a red asterisk, and the submit button is disabled until all mandatory questions have a selection.

### Reusable Components

**SessionBadge (`components/SessionBadge.tsx`)**
- A context-aware component used in the header of every page. It reads `useAuth()` and renders one of three states:
  - "Checking session..." text while the auth status is being resolved.
  - A "Login / Start Building" button if the user is anonymous.
  - A circular avatar (first letter of email) with a hover dropdown showing the user's name, email, a "My Profile" link, and a "Sign out" button.

**CreatePollModal (`components/CreatePollModal.tsx`)**
- A full-screen modal dialog for poll creation. It provides form fields for the poll title, description, expiry date/time, response mode selector (Anonymous/Authenticated), and a dynamic question builder where questions and options can be added or removed.
- On submission, it sends a `POST /api/polls` request and calls the `onPollCreated` callback with the new poll ID, which navigates the user to the analytics page for the newly created poll.

### PKCE Implementation (`lib/pkce.ts`)

The MyAuth OIDC flow uses Proof Key for Code Exchange (PKCE) with S256 challenge method, implemented entirely with the Web Crypto API:
- `generateRandomString`: Produces a cryptographically random string using `crypto.getRandomValues` with a URL-safe character set.
- `sha256Base64Url`: Hashes the code verifier using `crypto.subtle.digest('SHA-256')` and encodes the result as a base64url string (replacing `+` with `-`, `/` with `_`, and stripping trailing `=`).
- The verifier and state are stored in `sessionStorage` (not `localStorage`) so they do not persist beyond the browser tab, reducing the window for CSRF attacks.

---


## Local Setup and Environment Configuration

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- MongoDB instance (local or Atlas)
- A Google OAuth Client ID (from Google Cloud Console)
- A running MyAuth instance (optional, for custom IdP testing)

### Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>

JWT_ACCESS_SECRET=<minimum-32-character-secret-for-access-tokens>
JWT_REFRESH_SECRET=<minimum-32-character-secret-for-refresh-tokens>

GOOGLE_CLIENT_ID=<your-google-client-id>.apps.googleusercontent.com

CUSTOM_IDP_URL=https://<your-myauth-domain>
CUSTOM_IDP_CLIENT_ID=<myauth-client-id>
CUSTOM_IDP_CLIENT_SECRET=<myauth-client-secret>
CUSTOM_IDP_REDIRECT_URI=http://localhost:5173/callback
```

All variables are validated at startup using a Zod schema. The server will refuse to start and print specific error messages if any variable is missing or malformed.

### Frontend Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_APP_URL=http://localhost:5173
VITE_GOOGLE_CLIENT_ID=<your-google-client-id>.apps.googleusercontent.com
VITE_CUSTOM_IDP_URL=https://<your-myauth-domain>
VITE_CUSTOM_IDP_CLIENT_ID=<myauth-client-id>
VITE_CUSTOM_IDP_REDIRECT_URI=http://localhost:5173/callback
```

### Installation and Development

```bash
# Clone the repository
git clone https://github.com/rachittaneja56-max/VoteZap.git
cd VoteZap

# Backend setup
cd backend
npm install
npm run dev          # Starts the server with tsx watch on port 5000

# Frontend setup (in a separate terminal)
cd frontend
npm install
npm run dev          # Starts Vite dev server on port 5173
```

### Production Build

```bash
# Frontend production build
cd frontend
npm run build        # Outputs to dist/
npm run preview      # Preview the production build locally
```

---

## Project Structure

```
VoteZap/
├── backend/
│   └── src/
│       ├── config/
│       │   └── env.ts                    # Zod-validated environment loader
│       ├── middleware/
│       │   ├── authMiddleware.ts          # Re-exports requireAuth and optionalAuth
│       │   └── errorMiddleware.ts         # Global Express error handler
│       ├── modules/
│       │   ├── auth/
│       │   │   ├── auth.controller.ts     # Google and MyAuth login handlers
│       │   │   ├── auth.middleware.ts      # JWT cookie verification
│       │   │   ├── auth.routes.ts         # Auth route definitions with rate limiters
│       │   │   ├── auth.service.ts        # Provider-specific login, token exchange, session management
│       │   │   ├── auth.utils.ts          # JWT signing/verification, cookie helpers, hashing
│       │   │   ├── auth.validation.ts     # Zod schemas for env and request bodies
│       │   │   └── user.model.ts          # Mongoose User schema
│       │   ├── polls/
│       │   │   ├── poll.controller.ts     # Poll CRUD, analytics, publish handlers
│       │   │   ├── poll.model.ts          # Mongoose Poll schema with embedded questions/options
│       │   │   ├── poll.routes.ts         # Poll route definitions
│       │   │   ├── poll.service.ts        # Aggregation pipelines, analytics computation, publishing
│       │   │   └── result.model.ts        # Mongoose PublishedResult schema
│       │   └── responses/
│       │       ├── response.controller.ts # Vote submission handler
│       │       ├── response.model.ts      # Mongoose Response schema with anonymousId
│       │       ├── response.routes.ts     # Response route definitions
│       │       └── response.service.ts    # Duplicate detection, validation, Socket.io emission
│       ├── sockets/
│       │   └── socket.setup.ts            # Socket.io initialization and room management
│       ├── utils/
│       │   ├── AppError.ts                # Custom error classes (NotFound, Forbidden, BadRequest, Unauthorized)
│       │   └── ResponseHandler.ts         # Standardized success response formatter
│       ├── app.ts                         # Express application configuration
│       └── server.ts                      # HTTP server bootstrap with Socket.io attachment
├── frontend/
│   └── src/
│       ├── components/                    # Reusable UI components (CreatePollModal, SessionBadge)
│       ├── lib/
│       │   ├── api.ts                     # Centralized fetch wrapper with cookie credentials
│       │   ├── auth.tsx                   # AuthProvider with session refresh and local cache
│       │   ├── auth-context.ts            # React context type definitions
│       │   └── pkce.ts                    # PKCE code verifier/challenge generation for MyAuth
│       ├── pages/
│       │   ├── Home.tsx                   # Landing page
│       │   ├── Login.tsx                  # Dual-provider login with redirect preservation
│       │   ├── Dashboard.tsx              # Creator poll management with sparkline charts
│       │   ├── Analytics.tsx              # Real-time analytics with PDF export
│       │   └── Vote.tsx                   # Voting form with FingerprintJS integration
│       └── types/
│           └── poll.ts                    # TypeScript interfaces for API payloads
└── README.md
```
