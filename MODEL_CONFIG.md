# AI Model Configuration Guide

## Supported Models

### OpenAI Models (Default)

| Model              | Cost (Input/Output per 1M tokens) | Best For             | Tool Calling Support |
| ------------------ | --------------------------------- | -------------------- | -------------------- |
| **gpt-4o-mini** ⭐ | $0.15 / $0.60                     | Cost-efficient, fast | ✅ Excellent         |
| **gpt-4o**         | $5.00 / $15.00                    | Best quality         | ✅ Excellent         |
| **gpt-4-turbo**    | $10.00 / $30.00                   | High quality         | ✅ Excellent         |
| **gpt-3.5-turbo**  | $0.50 / $1.50                     | Budget option        | ⚠️ Basic             |

### Google Models

| Model                | Cost                         | Best For     | Tool Calling Support |
| -------------------- | ---------------------------- | ------------ | -------------------- |
| **gemini-1.5-flash** | Free tier available          | Fast, cheap  | ✅ Good              |
| **gemini-1.5-pro**   | $7.00 / $21.00 per 1M tokens | Best quality | ✅ Excellent         |

## Configuration

Update your `packages/nextjs/.env.local`:

### Option 1: GPT-4o-mini (Recommended - Cheap & Fast) ⭐

```bash
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
OPENAI_API_KEY=sk-...
```

**Cost estimate**: ~$0.001 per request (10 tool calls)

### Option 2: GPT-4o (Best Quality)

```bash
AI_PROVIDER=openai
AI_MODEL=gpt-4o
OPENAI_API_KEY=sk-...
```

**Cost estimate**: ~$0.05 per request (10 tool calls)

### Option 3: GPT-4-Turbo (Original)

```bash
AI_PROVIDER=openai
AI_MODEL=gpt-4-turbo
OPENAI_API_KEY=sk-...
```

**Cost estimate**: ~$0.10 per request (10 tool calls)

### Option 4: Gemini 1.5 Flash (Free Tier)

```bash
AI_PROVIDER=google
AI_MODEL=gemini-1.5-flash
GOOGLE_GENERATIVE_AI_API_KEY=...
```

**Cost**: FREE up to 1,500 requests/day

### Option 5: GPT-3.5-turbo (Ultra Budget)

```bash
AI_PROVIDER=openai
AI_MODEL=gpt-3.5-turbo
OPENAI_API_KEY=sk-...
```

**Cost estimate**: ~$0.0003 per request
⚠️ **Warning**: May struggle with complex multi-step tool chaining

## About o1/o3 Models

**o1-mini** and **o3-mini** are reasoning models designed for:

-   Complex problem solving
-   Mathematical reasoning
-   Code generation

However, they:

-   ❌ Don't support tool calling in the same way
-   ❌ Are slower (reasoning tokens add latency)
-   ❌ Not ideal for conversational AI with tools

For your ZapAI wallet use case, **gpt-4o-mini** is the best choice:

-   ✅ Fast responses
-   ✅ Excellent tool calling
-   ✅ 90% cheaper than GPT-4-turbo
-   ✅ Good enough for blockchain operations

## Quick Setup

1. **Edit** `packages/nextjs/.env.local`:

    ```bash
    AI_PROVIDER=openai
    AI_MODEL=gpt-4o-mini
    OPENAI_API_KEY=sk-your-api-key-here
    ```

2. **Restart** the dev server:

    ```bash
    yarn dev
    ```

3. **Test** in the AI Agent view!

## Switching Models On-The-Fly

You can change models without restarting by updating `.env.local` - Next.js will hot-reload environment variables in development mode.

## Recommendations by Use Case

### 🚀 Production (Balance Cost & Quality)

```bash
AI_MODEL=gpt-4o-mini
```

### 💰 Development (Free Tier)

```bash
AI_PROVIDER=google
AI_MODEL=gemini-1.5-flash
```

### 🎯 Best Quality (Don't Care About Cost)

```bash
AI_MODEL=gpt-4o
```

### 🧪 Experimentation (Ultra Cheap)

```bash
AI_MODEL=gpt-3.5-turbo
```

---

**Current Default**: `gpt-4o-mini` (cost-optimized) 💰
