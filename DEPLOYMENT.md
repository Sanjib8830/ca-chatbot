# Deployment

## GitHub Actions

The workflow in `.github/workflows/ci-and-publish.yml` runs on pull requests to
`main` and pushes to `main`.

- Every pull request runs typecheck, lint, tests, and a production build.
- A push to `main` publishes a container image to GitHub Container Registry:
  `ghcr.io/<your-github-owner>/ca-chatbot:latest`.
- The workflow uses the built-in `GITHUB_TOKEN`; do not add `GOOGLE_API_KEY` as a
  GitHub Actions secret because it is not needed to build the application.

If GitHub creates the package as private, set its visibility in the repository's
Packages settings before using it from a separate hosting service.

## Run The Published Image

Provide the Google key only at container runtime:

```bash
docker run --rm -p 3001:3001 \
  -e GOOGLE_API_KEY="your-google-ai-studio-key" \
  ghcr.io/<your-github-owner>/ca-chatbot:latest
```

Open `http://localhost:3001/`.

The container serves both the compiled React application and the `/api` backend
from one origin. It intentionally does not contain `backend/.env` or the API key.

## Hosting Provider

GitHub Actions publishes the deployable image, but an actual public deployment
also needs a hosting target such as Azure Container Apps, Google Cloud Run,
Render, Railway, Fly.io, or a server running Docker. Configure that target with a
runtime environment variable named `GOOGLE_API_KEY`, not a committed `.env` file.

## Local Development

For local development, put the key in `backend/.env` and run:

```bash
./run.sh
```

The script starts the Vite frontend and backend, then opens
`http://127.0.0.1:5173/`. Press `Ctrl+C` in the terminal to stop both processes.
