# 🌟 Using Google Gemini with Zap Agent

Zap Agent supports multiple AI providers, including Google's Gemini models!

## Why Choose Gemini?

✅ **Free Tier** - Generous free quota (60 requests/min)  
✅ **Cost Effective** - Much cheaper than GPT-4  
✅ **Fast** - Quick response times  
✅ **Powerful** - Gemini 1.5 Pro has 1M+ token context  
✅ **Multimodal** - Can handle images (future feature)

## Setup Instructions

### 1. Get Google Gemini API Key

1. Visit https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key

### 2. Configure Environment

Edit your `.env.local` file:

```env
# Set the AI provider to Gemini
AI_PROVIDER=gemini

# Add your Google API key
GOOGLE_GENERATIVE_AI_API_KEY=your-google-api-key-here
```

That's it! The agent will now use Gemini instead of OpenAI.

### 3. Switch Between Providers

You can easily switch between providers by changing the `AI_PROVIDER` variable:

**For OpenAI:**

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-key
```

**For Gemini:**

```env
AI_PROVIDER=gemini
GOOGLE_GENERATIVE_AI_API_KEY=your-key
```

## Available Gemini Models

Edit `packages/nextjs/src/app/api/agent/route.ts` to use different models:

```typescript
case "gemini":
case "google":
    // Choose one:
    return google("gemini-1.5-pro");        // Best performance
    // return google("gemini-1.5-flash");   // Faster, cheaper
    // return google("gemini-pro");         // Older model
```

### Model Comparison

| Model            | Speed  | Cost     | Context    | Best For          |
| ---------------- | ------ | -------- | ---------- | ----------------- |
| gemini-1.5-pro   | Medium | Low      | 1M tokens  | Complex reasoning |
| gemini-1.5-flash | Fast   | Very Low | 1M tokens  | Quick queries     |
| gemini-pro       | Medium | Low      | 32K tokens | General use       |

## Pricing Comparison

### Google Gemini (Free Tier)

-   **Free**: 60 requests/minute
-   **Paid**: $0.00035 per 1K input tokens, $0.00105 per 1K output
-   **Much cheaper** than GPT-4!

### OpenAI GPT-4 Turbo

-   **No free tier**
-   **Paid**: $0.01 per 1K input tokens, $0.03 per 1K output
-   More expensive but sometimes more accurate

## Benefits of Using Gemini

### 1. Cost Savings

```
Example: 1000 messages with ~500 tokens each

OpenAI GPT-4:
- Input: 500K tokens × $0.01 = $5
- Output: 500K tokens × $0.03 = $15
- Total: $20

Google Gemini:
- Input: 500K tokens × $0.00035 = $0.175
- Output: 500K tokens × $0.00105 = $0.525
- Total: $0.70

Savings: ~96% cheaper!
```

### 2. Generous Free Tier

-   60 requests per minute for free
-   Perfect for development and testing
-   No credit card required to start

### 3. Large Context Window

-   Gemini 1.5 Pro: 1 million tokens
-   Can handle very long conversations
-   Great for complex blockchain data

## Testing Your Setup

After configuring, restart your dev server and test:

```bash
yarn nextjs:dev
```

Visit `/agent` and try:

-   "What's the balance of vitalik.eth?"
-   "What's the current gas price?"

You should see responses from Gemini!

## Troubleshooting

**Issue: "API key not found"**

-   Make sure `GOOGLE_GENERATIVE_AI_API_KEY` is in `.env.local`
-   Restart the dev server

**Issue: "Rate limit exceeded"**

-   You've hit the free tier limit (60 req/min)
-   Wait a minute or upgrade to paid tier

**Issue: "Model not found"**

-   Check the model name in `route.ts`
-   Valid models: `gemini-1.5-pro`, `gemini-1.5-flash`, `gemini-pro`

## Advanced Configuration

### Use Different Models for Different Tasks

```typescript
const getAIModel = () => {
    const provider = process.env.AI_PROVIDER || "openai";

    switch (provider) {
        case "gemini":
            // Use flash for simple queries, pro for complex
            return google("gemini-1.5-flash");
        case "openai":
            return openai("gpt-4-turbo");
        default:
            return google("gemini-1.5-pro");
    }
};
```

### Mix Providers (Advanced)

You could even use Gemini for most queries and GPT-4 for critical transactions:

```typescript
const getAIModel = (taskType: string) => {
    if (taskType === "transaction") {
        return openai("gpt-4-turbo"); // More accurate for $ decisions
    }
    return google("gemini-1.5-flash"); // Faster for queries
};
```

## Performance Tips

1. **Use Gemini Flash** for simple balance checks and queries
2. **Use Gemini Pro** for complex reasoning tasks
3. **Use OpenAI GPT-4** when you need the highest accuracy
4. **Cache responses** for repeated queries
5. **Stream responses** for better UX (already enabled)

## Comparison Chart

| Feature              | Gemini 1.5 Pro      | GPT-4 Turbo      |
| -------------------- | ------------------- | ---------------- |
| Free Tier            | ✅ Yes              | ❌ No            |
| Cost (per 1K tokens) | $0.00035            | $0.01            |
| Context Window       | 1M tokens           | 128K tokens      |
| Speed                | Fast                | Medium           |
| Tool Calling         | ✅ Yes              | ✅ Yes           |
| JSON Mode            | ✅ Yes              | ✅ Yes           |
| Best For             | Cost-effective apps | Mission-critical |

## Recommended Setup

### For Development

```env
AI_PROVIDER=gemini
GOOGLE_GENERATIVE_AI_API_KEY=your-key
```

Free tier is perfect for development!

### For Production (High Volume)

```env
AI_PROVIDER=gemini
GOOGLE_GENERATIVE_AI_API_KEY=your-key
```

Much cheaper at scale

### For Production (Mission Critical)

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-key
```

When accuracy is paramount

## Resources

-   **Get API Key**: https://aistudio.google.com/app/apikey
-   **Gemini Docs**: https://ai.google.dev/docs
-   **Pricing**: https://ai.google.dev/pricing
-   **Vercel AI SDK**: https://sdk.vercel.ai/providers/ai-sdk-providers/google-generative-ai

## Support

Having issues with Gemini setup? Check:

1. API key is correct in `.env.local`
2. `AI_PROVIDER=gemini` is set
3. You've run `yarn install` after updating packages
4. Dev server was restarted

---

**Recommendation**: Start with Gemini's free tier for development, then choose based on your needs! 🚀
