# Deployment

## GitHub Pages

GitHub Actions builds and deploys the React frontend to GitHub Pages whenever
code is pushed to `main`. The workflow is defined in
[`.github/workflows/ci-and-publish.yml`](.github/workflows/ci-and-publish.yml).

### One-Time GitHub Setup

1. Open the repository on GitHub and go to **Settings > Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Push to `main`, or run the workflow from the **Actions** tab.

After the workflow succeeds, the frontend URL will be:

```text
https://sanjib8830.github.io/ca-chatbot/
```

The workflow builds with the `/ca-chatbot/` base path so JavaScript and CSS
assets load correctly from the repository URL.

## Important: Frontend Only

GitHub Pages hosts static frontend files. It does not run the Node.js backend,
so the deployed page cannot send chatbot requests by itself. The frontend
currently calls `/api`, which works with the local Vite proxy and the combined
Docker application, but GitHub Pages has no `/api` server.

To make the online chatbot functional, deploy the backend separately to a
server that provides a public HTTPS API and configure the frontend API base URL
to point to it. The Google API key belongs only on that backend server, never in
the frontend or GitHub Pages.

## Local Development

For local development, put the key in `backend/.env` and run:

```bash
./run.sh
```

The script starts the Vite frontend and backend, then opens
`http://127.0.0.1:5173/`. Press `Ctrl+C` in the terminal to stop both processes.
