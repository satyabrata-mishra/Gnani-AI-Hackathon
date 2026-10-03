# Hosting Evon on Hugging Face Inference Endpoints

Bolo talks to Evon through an OpenAI-compatible API, so the only app change is `.env.local`.

## 1. Get access to the model (one time)

1. Log in to Hugging Face and open https://huggingface.co/gnani/gnani-evon-v3.3-30B-A3B
2. Accept the access terms. Wait until the "Files and versions" tab lists the weights.
3. Create a token at https://huggingface.co/settings/tokens (type **Read**). Keep it private.
4. Add a payment method at https://huggingface.co/settings/billing (endpoints bill per hour while running).

## 2. Create the endpoint

1. On the model page click **Deploy → Inference Endpoints**, or go to https://endpoints.huggingface.co/new and pick the model.
2. Hardware: **1× NVIDIA A100 80GB** (or 1× H100 80GB). Smaller GPUs cannot hold the BF16 weights.
3. Engine: **vLLM**.
4. Container arguments (Advanced configuration):

   ```
   --trust-remote-code --max-model-len 32768 --reasoning-parser nano_v3
   ```

   32K context is plenty for Bolo and leaves more GPU memory for speed. If the default vLLM image fails to load the model, set the container URI to `vllm/vllm-openai:latest` (or `:nightly`) and redeploy.
5. Security: **Protected** (requests need your HF token).
6. Autoscaling: enable **scale-to-zero after 15 minutes** so you are not billed while idle.
7. Create. First start downloads ~60 GB of weights and can take 10–20 minutes.

## 3. Connect Bolo

In `bolo/.env.local`:

```
EVON_BASE_URL=https://<your-endpoint>.endpoints.huggingface.cloud/v1
EVON_API_KEY=hf_<your-read-token>
EVON_MODEL=<endpoint-name>
EVON_SEND_CHAT_TEMPLATE_KWARGS=true
```

Then run `npm run spike`. It lists the model names the server reports (use that value for `EVON_MODEL` if the call fails) and measures Evon latency with reasoning on and off.

## Demo-day checklist

- Scale-to-zero means a **cold start of several minutes**. Wake the endpoint (run `npm run spike`) at least 20 minutes before presenting.
- Pause the endpoint after the demo to stop billing.
