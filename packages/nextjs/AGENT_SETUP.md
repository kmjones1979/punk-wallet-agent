# Zap Agent Setup Guide

## Overview

Zap Agent is an AI-powered crypto assistant that helps you interact with blockchain data and perform crypto operations using natural language.

## Features

✅ **Blockchain Data Queries**

-   Get wallet balances
-   Check token information
-   View gas prices
-   Query block numbers
-   Get transaction counts

✅ **Smart Analysis**

-   Estimate gas fees
-   Explain transactions
-   Provide crypto insights

🔜 **Coming Soon** (with Coinbase AgentKit)

-   Execute transactions via AI
-   Multi-chain support
-   Token swaps
-   DeFi interactions

## Setup Instructions

### 1. Install Dependencies

```bash
cd packages/nextjs
yarn install
```

### 2. Configure Environment Variables

Create a `.env.local` file in `packages/nextjs/`:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your OpenAI API key:

```env
OPENAI_API_KEY=sk-your-openai-api-key-here
```

**Get your OpenAI API key:**

1. Visit https://platform.openai.com/api-keys
2. Sign up or log in
3. Create a new API key
4. Copy and paste it into `.env.local`

### 3. (Optional) Coinbase AgentKit Setup

For advanced features like executing transactions through the AI:

1. Get Coinbase CDP API credentials:

    - Visit https://portal.cdp.coinbase.com/
    - Create a new project
    - Generate API keys

2. Add to `.env.local`:

```env
COINBASE_API_KEY_NAME=your-api-key-name
COINBASE_API_KEY_PRIVATE_KEY=your-private-key
```

### 4. Run the Development Server

```bash
yarn nextjs:dev
```

Visit `http://localhost:3000` and click "AI Agent" to start chatting!

## Usage Examples

### Query Balances

```
"What's the balance of vitalik.eth?"
"Check my wallet balance"
```

### Get Token Info

```
"Tell me about USDC token"
"What's the address for USDC?"
```

### Gas & Network Info

```
"What's the current gas price?"
"What block number are we at?"
```

### Transaction Help

```
"How much gas would it cost to send 0.1 ETH?"
"Explain this transaction to me"
```

## Architecture

```
┌─────────────────┐
│   User Input    │
│  (Natural Lang) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Vercel AI SDK  │
│   (GPT-4)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   AI Tools      │
│  - getBalance   │
│  - getTokenInfo │
│  - estimateGas  │
│  - etc.         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Viem Client    │
│ (Blockchain RPC)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Ethereum      │
│   Network       │
└─────────────────┘
```

## Extending the Agent

### Adding New Tools

Edit `packages/nextjs/src/app/api/agent/route.ts`:

```typescript
tools: {
  // Add your custom tool here
  myCustomTool: tool({
    description: "Description of what the tool does",
    parameters: z.object({
      param1: z.string().describe("Parameter description"),
    }),
    execute: async ({ param1 }) => {
      // Your tool logic
      return { result: "..." };
    },
  }),
}
```

### Integrating Coinbase AgentKit

To enable transaction execution via AI, integrate Coinbase AgentKit:

1. Install the package (already included):

```bash
yarn add @coinbase/coinbase-sdk
```

2. Import and initialize in the API route:

```typescript
import { CoinbaseSDK } from "@coinbase/coinbase-sdk";

const coinbase = new CoinbaseSDK({
    apiKeyName: process.env.COINBASE_API_KEY_NAME!,
    privateKey: process.env.COINBASE_API_KEY_PRIVATE_KEY!,
});
```

3. Add transaction tools using the SDK

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit `.env.local`** - It contains sensitive API keys
2. **API Key Permissions** - Only enable necessary permissions for Coinbase API keys
3. **Rate Limiting** - Implement rate limiting in production
4. **User Confirmation** - Always require user confirmation before executing transactions
5. **Amount Limits** - Consider setting maximum transaction amounts
6. **Audit Logging** - Log all AI-initiated transactions for review

## Troubleshooting

### Issue: "OpenAI API key not found"

**Solution:** Make sure `OPENAI_API_KEY` is set in `.env.local`

### Issue: "Failed to connect to blockchain"

**Solution:** Check your internet connection and RPC endpoint

### Issue: Tool execution errors

**Solution:** Check the browser console and Next.js terminal for detailed error messages

## Cost Considerations

-   **OpenAI API**: Charged per token (input + output)
-   **RPC Calls**: Free for public endpoints, but rate limited
-   **Coinbase CDP**: Check Coinbase pricing for API usage

### Reducing Costs

1. Use more efficient models like `gpt-3.5-turbo` for simple queries
2. Implement caching for frequently requested data
3. Use your own RPC endpoint for better rate limits

## Support

For issues or questions:

-   Check the [Vercel AI SDK docs](https://sdk.vercel.ai/docs)
-   Review [Coinbase AgentKit docs](https://docs.cdp.coinbase.com/)
-   Open an issue on GitHub

---

Built with ❤️ using Zap, Vercel AI SDK, and Coinbase AgentKit
