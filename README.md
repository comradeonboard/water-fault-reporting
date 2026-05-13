# Water Infrastructure Fault Reporting and Maintenance Tracking System

A citizen-focused web app prototype for reporting water infrastructure faults, tracking issue status, and viewing report history.

- Frontend: static HTML/CSS/JavaScript
- Backend: Node.js + Express + SQLite
- Authentication: JWT with cookie-based sessions
- Deployed frontend: GitHub Pages

## Repository
https://github.com/comradeonboard/water-fault-reporting

## Run locally
1. `npm install`
2. `npm start`
3. Open `http://localhost:3000`

## API notes
- Register and login return a JSON `token` for mobile auth.
- Mobile clients should send `Authorization: Bearer <token>` on protected requests.
- Supported secured endpoints:
  - `GET /api/me`
  - `GET /api/reports`
  - `POST /api/reports`
  - `PATCH /api/reports/:id/status`

## Photo uploads
- Report photo data can be sent as a base64-encoded string in the `photo` field.

## Docker deployment
Build and run the backend with Docker:

```bash
docker build -t water-fault-reporting .
docker run -it --rm -p 3000:3000 \
  -e JWT_SECRET="your-super-secret-key" \
  -v "${PWD}/database.sqlite:/usr/src/app/database.sqlite" \
  water-fault-reporting
```

Or use Docker Compose:

```bash
docker compose up --build
```

## Environment
- `JWT_SECRET` should be set in production.
- If you use Docker Compose, copy `.env.example` to `.env` and update values.
