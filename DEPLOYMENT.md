# Deployment

## Render Hosting

This repository is configured to host the application on Render as a public
web service. The `render.yaml` Blueprint uses the image published to GitHub
Container Registry, and the service receives an HTTPS URL from Render.

### Create The Render Service

1. In Render, add a container registry credential named
   `github-container-registry`. Select GitHub Container Registry, use the
   GitHub username `Sanjib8830`, and provide a token with `read:packages`
   permission. This is required while the GHCR package is private.
2. In the Render Dashboard, choose **New > Blueprint**, connect the
   `Sanjib8830/ca-chatbot` repository, and apply the root `render.yaml` file.
3. When Render prompts for `GOOGLE_API_KEY`, enter the Google AI Studio key.
   The key is stored in Render as a runtime secret and is not committed to
   this repository.
4. Complete the first deploy. Render will show the public address in the
   service dashboard, normally in the form
   `https://ca-chatbot.onrender.com` (the exact hostname may vary).

### Enable Deployments From GitHub Actions

The workflow verifies the application, publishes `latest` and immutable
SHA-tagged images to GHCR, and can then tell Render to deploy the exact SHA
image that passed CI.

Create a Render deploy hook from the service's **Settings** page and add it to
the GitHub repository under **Settings > Secrets and variables > Actions**:

- `RENDER_DEPLOY_HOOK_URL`: the secret Render deploy hook URL.

Then add the repository variable `DEPLOY_RENDER_ENABLED` with the value
`true`. Every successful push to `main` will publish the image and trigger the
Render deployment. The workflow's manual **Deploy** input can be enabled for
an individual run instead of setting the variable.

The Render service must keep the image URL in `render.yaml` aligned with the
published package. Render pulls the private image using the registry
credential configured in the workspace.

## GitHub Actions

The workflow in `.github/workflows/ci-and-publish.yml` runs on pull requests to
`main` and pushes to `main`.

- Every pull request runs typecheck, lint, tests, and a production build.
- A push to `main` publishes a container image to GitHub Container Registry:
  `ghcr.io/<your-github-owner>/ca-chatbot:latest`.
- A successful `main` push can trigger Render through
  `RENDER_DEPLOY_HOOK_URL` after publishing the immutable SHA-tagged image.
- `GOOGLE_API_KEY` is not needed by GitHub Actions. Configure it in the Render
  service's environment settings so it is available only at runtime.
- The image is built for `linux/amd64`, which is required by Render image-backed
  services.

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

Render provides the public hosting URL and HTTPS termination. The application
container listens on port `3001`, and Render routes public traffic to it. A
custom domain can be added later from the Render service settings.

## Local Development

For local development, put the key in `backend/.env` and run:

```bash
./run.sh
```

The script starts the Vite frontend and backend, then opens
`http://127.0.0.1:5173/`. Press `Ctrl+C` in the terminal to stop both processes.
