# EvolveAI Reranker Deployment Guide

## Model Information

**Current Model:** `jinaai/jina-reranker-v1-tiny-en`
- **Parameters:** 33 million (very lightweight)
- **Memory:** ~66MB in FP16, ~150-200MB total with activations
- **Speed:** ~248ms latency (10x faster than bge-reranker-base)
- **Max Sequence Length:** 8,192 tokens
- **Architecture:** 4 layers, 384 hidden size
- **Optimized for:** CPU deployment, fast inference

## Development vs. Production

- **Development:** Install the usual Python packages and run locally. The first start will download the model (~150MB) and may take 30-60 seconds, which is fine for local testing. Restarts may download again if the cache is cleared.
- **Production:** Everything should be ready before users arrive. The model should be pre-downloaded during build so there are no first-request delays, and the service should have enough memory to run comfortably.
- **Core difference:** Development favors speed and flexibility; production removes surprises (no on-demand downloads, no guesswork on resources).

## Deployment Approaches (Simple Comparison)

- **Railway (recommended):** Easiest balance of cost and simplicity; keeps storage for the model cache and runs your image with minimal setup.
- **Fly.io:** Flexible and friendly to Docker power users; a bit more hands-on.
- **DigitalOcean (or any basic VPS):** Reliable but "do it yourself" for setup and monitoring.
- **Render:** Simple deployment, good for Python apps, but pricier for the same resources. **✅ Excellent for Jina reranker** (lightweight model works well on Render's instances).
- **AWS/GCP managed containers:** Enterprise flexibility with more steps and usually higher cost.

## Recommendation

- **For Railway:** Choose at least 2GB memory (4GB recommended for headroom). The Jina model is lightweight enough that 2GB works, but 4GB gives you more breathing room.
- **For Render:** Choose at least 1GB memory (2GB recommended). The Jina model's small size makes it perfect for Render's pricing tiers.

---

## Render.com Deployment Guide (Jina Reranker Specific)

### ✅ Can Jina Reranker be Deployed on Render?

**Yes!** The Jina reranker v1-tiny-en is **perfectly suited** for Render deployment:
- Only 33M parameters (~150-200MB total memory footprint)
- Optimized for CPU (no GPU required)
- Fast inference (~248ms latency)
- Works great on Render's standard instances

### Render Instance Requirements

**Minimum Recommended:**
- **Instance Type:** Standard (1GB RAM) - $7/month
- **Memory:** 1GB RAM (sufficient for Jina model + FastAPI)
- **CPU:** 0.5 vCPU (adequate for lightweight reranker)

**Recommended for Production:**
- **Instance Type:** Standard (2GB RAM) - $25/month
- **Memory:** 2GB RAM (comfortable headroom for model + app + caching)
- **CPU:** 1 vCPU (better performance)

**For High Traffic:**
- **Instance Type:** Standard (4GB RAM) - $85/month
- **Memory:** 4GB RAM (multiple workers, better caching)
- **CPU:** 2 vCPU (handles concurrent requests)

### Step-by-Step Render Deployment

#### 1. Pre-Deployment Setup

**Option A: Pre-download Model During Build (Recommended)**

Add a build script to pre-download the model:

```bash
# In your Render build command or Dockerfile
python backend/scripts/download_models.py
```

**Option B: Let Model Download on First Request**

The model will auto-download on first use (~30-60 seconds delay). This works but isn't ideal for production.

#### 2. Render Service Configuration

1. **Create a New Web Service** on Render
   - Connect your GitHub repository
   - Select the `backend` directory as the root directory

2. **Build Settings:**
   ```
   Build Command: pip install -r backend/requirements.txt && python backend/scripts/download_models.py
   Start Command: cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

3. **Environment Variables:**
   Add all required environment variables from `backend/env.template`:
   - `LLM_API_KEY`
   - `LLM_MODEL_COMPLEX`
   - `LLM_MODEL_LIGHTWEIGHT`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_JWT_PUBLIC_KEY`
   - `SUPABASE_JWT_SECRET`
   - `ENVIRONMENT=production`
   - `CORS_ALLOWED_ORIGINS` (your frontend URLs)
   - `RERANK_DEVICE=cpu` (optional, defaults to CPU)

4. **Instance Configuration:**
   - **Plan:** Standard
   - **Memory:** 1GB (minimum) or 2GB (recommended)
   - **Auto-Deploy:** Enable for automatic deployments on git push

#### 3. Model Caching on Render

**Important:** Render's filesystem is **ephemeral** - files are lost on restart unless persisted.

**Solution Options:**

**Option A: Use Hugging Face Cache (Recommended)**
The model will be cached in `~/.cache/huggingface/` during the build. On first request after restart, it may re-download if cache is cleared, but subsequent requests will be fast.

**Option B: Pre-download in Build Command**
Add to your build command:
```bash
python backend/scripts/download_models.py
```
This ensures the model is downloaded during build and cached in the image.

**Option C: Use Render Disk (Paid Feature)**
For persistent storage, upgrade to a plan with disk storage, but this is usually unnecessary for the lightweight Jina model.

#### 4. Memory Optimization Tips

Since Jina reranker is lightweight, you can optimize further:

1. **Single Worker (Default):**
   ```bash
   uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1
   ```
   - Uses ~150-200MB for model
   - Leaves plenty of room for FastAPI and requests

2. **Multiple Workers (2GB+ instances):**
   ```bash
   uvicorn main:app --host 0.0.0.0 --port $PORT --workers 2
   ```
   - Each worker loads the model (~200MB × 2 = 400MB)
   - Still comfortable on 2GB instance

3. **Monitor Memory Usage:**
   - Use Render's metrics dashboard
   - Watch for OOM (Out of Memory) errors
   - Adjust instance size if needed

#### 5. Environment-Specific Settings

**For Render Production:**

```bash
# In Render Environment Variables
ENVIRONMENT=production
RERANK_DEVICE=cpu
HF_HOME=/opt/render/.cache/huggingface  # Optional: custom cache location
```

#### 6. Health Check Configuration

Render will automatically check `/api/health/` endpoint. Ensure it's working:
- Endpoint: `GET /api/health/`
- Should return: `{"status": "healthy", "version": "2.0.0"}`

#### 7. Deployment Verification

After deployment:

1. **Check Logs:**
   ```
   Look for: "Loading jinaai/jina-reranker-v1-tiny-en model..."
   Then: "jinaai/jina-reranker-v1-tiny-en model loaded successfully"
   ```

2. **Test Reranker:**
   - Make a request that triggers RAG search
   - Check logs for reranker activity
   - Verify response times are reasonable (~250-500ms for reranking)

3. **Monitor Memory:**
   - Check Render dashboard for memory usage
   - Should stay well under your instance limit

### Render-Specific Considerations

**Advantages:**
- ✅ Jina model is lightweight - perfect for Render's pricing
- ✅ No GPU needed - works on standard CPU instances
- ✅ Fast startup - model loads quickly
- ✅ Simple deployment - minimal configuration

**Limitations:**
- ⚠️ Ephemeral filesystem - model may re-download on restart (but it's fast)
- ⚠️ Memory limits - stick to recommended instance sizes
- ⚠️ Cost - Render is pricier than Railway for same resources

**Cost Comparison (Monthly):**
- Render 1GB: $7/month (sufficient for Jina)
- Render 2GB: $25/month (recommended)
- Railway 2GB: ~$20/month
- Railway 4GB: ~$40/month

### Troubleshooting on Render

**Issue: Model download fails during build**
- **Solution:** Ensure `sentence-transformers>=3.3.1` is in requirements.txt
- **Check:** Build logs for network errors

**Issue: Out of Memory (OOM) errors**
- **Solution:** Upgrade to 2GB instance
- **Check:** Reduce number of workers if using multiple

**Issue: Slow first request after restart**
- **Solution:** This is expected - model downloads on first use
- **Mitigation:** Pre-download in build command (see Step 3)

**Issue: Model not loading**
- **Solution:** Check `RERANK_DEVICE=cpu` is set
- **Check:** Verify `sentence-transformers` is installed
- **Check:** Review logs for specific error messages

---

## Railway Deployment (Quick Reference)

1. Connect GitHub repository
2. Set root directory to `backend`
3. Add environment variables
4. Set instance to **2GB minimum** (4GB recommended)
5. Deploy - model will be cached between restarts

---

## Development Setup

1. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```

2. Run locally:
   ```bash
   cd backend
   uvicorn main:app --reload
   ```

3. First run will download model (~30-60 seconds)
4. Subsequent runs will use cached model (instant)

---

## Local Model Setup (VPN-Blocked Environments)

If your VPN blocks access to Hugging Face, you can download the model locally and use it offline.

### Step 1: Download Model Locally

**Option A: Using the dedicated local download script (Recommended)**

```bash
# Download to default location (backend/models/jina-reranker-v1-tiny-en)
python backend/scripts/download_reranker_local.py

# Or specify a custom location
python backend/scripts/download_reranker_local.py --output-dir ./my-models/jina-reranker
```

**Option B: Using the standard download script with environment variable**

```bash
RERANK_LOCAL_DIR=./backend/models/jina-reranker-v1-tiny-en python backend/scripts/download_models.py
```

**Note:** Run these scripts when your VPN is **off** or from a machine with Hugging Face access. The model will be saved to your local directory.

### Step 2: Configure Environment Variable

Add to your `.env` file:

```bash
RERANK_MODEL_PATH=./backend/models/jina-reranker-v1-tiny-en
```

Use an absolute path or a path relative to your project root. The path should point to the directory containing the model files.

### Step 3: Restart Application

Restart your application. The reranker will now load from the local directory instead of trying to download from Hugging Face.

### Verification

Check your application logs. You should see:
```
Using local model path: /path/to/backend/models/jina-reranker-v1-tiny-en
Loading reranker model from local directory: /path/to/backend/models/jina-reranker-v1-tiny-en
Local reranker model loaded successfully from: /path/to/backend/models/jina-reranker-v1-tiny-en
```

### Important Notes

- **For Render/Production:** Do **NOT** set `RERANK_MODEL_PATH` in production. Let it download from Hugging Face during build (as configured in Render build commands).
- **Model Size:** The local model directory will be ~150-200MB.
- **Git Ignore:** The `backend/models/` directory is automatically ignored by git (see `.gitignore`).
- **Path Format:** Use forward slashes (`/`) in paths, even on Windows. The path will be automatically resolved.

---

## Model Pre-download Script

Run this before deployment to pre-download the model:

```bash
python backend/scripts/download_models.py
```

This ensures the model is cached and ready for production use.

---

## Summary

**For Render:**
- ✅ **Yes, Jina reranker works excellently on Render**
- ✅ Use **1GB instance minimum** (2GB recommended)
- ✅ Model is lightweight (~150-200MB total)
- ✅ Fast inference (~248ms)
- ✅ No GPU required
- ✅ Pre-download model in build command for best experience

The Jina reranker v1-tiny-en is one of the best choices for Render deployment due to its small size and CPU efficiency!
