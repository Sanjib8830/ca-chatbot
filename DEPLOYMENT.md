# Deployment

## GitHub Actions

The workflow in `.github/workflows/ci-and-publish.yml` runs on pull requests to
`main` and pushes to `main`.

- Every pull request runs typecheck, lint, tests, and a production build.
- A push to `main` publishes a container image to GitHub Container Registry:
  `ghcr.io/<your-github-owner>/ca-chatbot:latest`.
- When VM deployment is enabled, the workflow deploys the immutable SHA-tagged
  image to the configured Docker host after publishing it.
- The GHCR-only path uses the built-in `GITHUB_TOKEN`. `GOOGLE_API_KEY` is not
  needed to build the application, but it must be configured as a GitHub Actions
  secret when using the VM deployment job.

## Deploy To A VM With GitHub Actions

The workflow deploys to a Linux VM over SSH. The VM must have Docker installed,
the deploy user must be allowed to run Docker without interactive `sudo`, and
the VM firewall must allow the application port.

Prepare the VM once:

```bash
sudo mkdir -p /opt/ca-chatbot
sudo chown "$USER":"$USER" /opt/ca-chatbot
sudo usermod -aG docker "$USER"
```

Sign out and back in after adding the user to the `docker` group. The image is
pulled from GHCR, so the package must be accessible to the GitHub account used
by the deployment credentials.

Add these repository **Actions secrets** under Settings > Secrets and variables >
Actions:

- `DEPLOY_HOST`: VM hostname or IP address.
- `DEPLOY_USER`: SSH user with Docker access.
- `DEPLOY_SSH_KEY`: private key whose public key is in the user's
  `~/.ssh/authorized_keys`.
- `DEPLOY_KNOWN_HOSTS`: verified output of `ssh-keyscan -H <host>`.
- `GHCR_USERNAME`: GitHub username that owns the package.
- `GHCR_TOKEN`: GitHub token with `read:packages` permission.
- `GOOGLE_API_KEY`: Google AI Studio key used only at container runtime.

Optional secrets are `DEPLOY_PORT` (default `22`), `DEPLOY_PATH` (default
`/opt/ca-chatbot`), and `DEPLOY_APP_PORT` (default `80`). Add the repository
variable `DEPLOY_VM_ENABLED=true` to deploy automatically after every successful
push to `main`. You can also run the workflow manually from the Actions tab and
enable its `deploy` input.

The deploy job uploads the runtime environment file over the verified SSH
connection, pulls the SHA-tagged image, replaces the `ca-chatbot` container, and
waits for its Docker health check. The API key is never committed to the
repository or baked into the image.

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
