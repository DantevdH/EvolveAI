# EvolveAI Deployment Guide (Plain English)

## Development vs. Production
- Development: install the usual Python packages and run locally. The first start will download the model and may be slow, which is fine for local testing. Restarts may download again if the cache is cleared.
- Production: everything should be ready before users arrive. The model should be baked into the image so there are no first-request delays, and the service should have enough memory to run comfortably.
- Core difference: development favors speed and flexibility; production removes surprises (no on-demand downloads, no guesswork on resources).

## Deployment Approaches (simple comparison)
- Railway (recommended): easiest balance of cost and simplicity; keeps storage for the model cache and runs your image with minimal setup.
- Fly.io: flexible and friendly to Docker power users; a bit more hands-on.
- DigitalOcean (or any basic VPS): reliable but “do it yourself” for setup and monitoring.
- Render: simple, but pricier for the same resources.
- AWS/GCP managed containers: enterprise flexibility with more steps and usually higher cost.

## Recommendation
- Choose Railway with at least 4GB memory. It stays affordable, keeps the model cached between restarts, and needs little upkeep.

## How to develop (non-technical)
- Install the dependencies as usual.
- Run the app locally; expect the first start to download the model and take longer.
- If you wipe the cache or restart fresh, the model may download again—that’s expected in development.

## How to deploy (short and non-technical)
- Build your app image with the model already included.
- Deploy that image to Railway.
- Add your two secrets (API key and model name).
- Pick at least 4GB memory.
- Open the Railway-provided URL to confirm it responds. Done.
