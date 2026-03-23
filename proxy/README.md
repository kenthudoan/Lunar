# Claude Max Proxy

Local OAuth proxy that routes Anthropic API requests through your Claude Pro/Max subscription instead of using API credits.

## How it works

1. Authenticates via OAuth PKCE flow with your Claude account
2. Runs a FastAPI server on `localhost:8082`
3. Forwards `/v1/messages` requests to `api.anthropic.com` using your OAuth token
4. Auto-refreshes expired tokens

## Setup

```bash
pip install -r requirements.txt

# Authenticate (opens browser)
python run.py auth

# Check token status
python run.py status

# Start proxy
python run.py serve
```

## Usage with Project Lunar

Set the env var in `.env`:

```
ANTHROPIC_PROXY_URL=http://127.0.0.1:8082
```

The backend's `LLMRouter` automatically routes Anthropic requests through the proxy when this is set.

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check + token status |
| `GET /v1/models` | List available Claude models |
| `POST /v1/messages` | Proxy to Anthropic Messages API (streaming + non-streaming) |

## Known limitations

- OAuth `user:inference` scope currently only allows **Haiku** models. Sonnet/Opus return `invalid_request_error`.
- Token expires ~8 hours after auth; auto-refreshes via refresh token.
