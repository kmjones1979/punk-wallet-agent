# 🤖 ZapAI Agent - AI-Powered Crypto Assistant

## 🎉 What's New

Your ZapAI wallet now includes an **AI Agent** powered by:

-   🧠 **Vercel AI SDK** - Natural language processing
-   🔗 **Coinbase AgentKit** - Blockchain interactions
-   ⚡ **GPT-4** - Advanced reasoning
-   🔧 **Custom Tools** - Real-time blockchain data

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd packages/nextjs
yarn install
```

### 2. Set Up OpenAI API Key

Create a `.env.local` file:

```bash
# In packages/nextjs/
echo "OPENAI_API_KEY=your-key-here" > .env.local
```

Get your API key from: https://platform.openai.com/api-keys

### 3. Run the App

```bash
# From the root directory
yarn nextjs:dev
```

### 4. Try the AI Agent

1. Open http://localhost:3000
2. Connect your wallet
3. Click "AI Agent" button in the header
4. Start chatting! 💬

## 💡 What Can the AI Agent Do?

### ✅ Available Now

**Blockchain Queries:**

-   "What's the balance of vitalik.eth?"
-   "What's the current gas price?"
-   "Tell me about USDC token"
-   "What block are we on?"
-   "How many transactions has my wallet made?"

**Transaction Analysis:**

-   "Estimate gas for sending 0.1 ETH"
-   "Explain this transaction to me"

### 🔜 Coming Soon (with full Coinbase AgentKit)

-   Execute transactions via natural language
-   Token swaps: "Swap 100 USDC for ETH"
-   Multi-chain operations
-   DeFi interactions
-   Portfolio management

## 🏗️ Architecture

```
User Input → GPT-4 → AI Tools → Blockchain → Response
```

**Components Created:**

1. `/app/agent/page.tsx` - AI chat interface
2. `/app/api/agent/route.ts` - AI backend with tools
3. Navigation added to main wallet page

## 🛠️ Available AI Tools

| Tool                  | Description                    | Example                        |
| --------------------- | ------------------------------ | ------------------------------ |
| `getBalance`          | Get ETH balance of any address | "Check vitalik.eth balance"    |
| `getTokenInfo`        | Get ERC20 token details        | "Tell me about USDC"           |
| `getGasPrice`         | Current gas price              | "What's the gas price?"        |
| `getBlockNumber`      | Current block                  | "What block are we on?"        |
| `getTransactionCount` | Nonce/tx count                 | "How many txs from my wallet?" |
| `estimateGas`         | Estimate transaction gas       | "Gas cost to send 0.1 ETH?"    |
| `explainTransaction`  | Explain a transaction          | "Explain this transaction"     |

## 🔧 Customization

### Add Your Own Tools

Edit `packages/nextjs/src/app/api/agent/route.ts`:

```typescript
tools: {
  myTool: tool({
    description: "What your tool does",
    parameters: z.object({
      param: z.string().describe("Parameter description"),
    }),
    execute: async ({ param }) => {
      // Your logic here
      return { result: "..." };
    },
  }),
}
```

### Change AI Model

In `route.ts`, change:

```typescript
model: openai("gpt-4-turbo"), // or "gpt-3.5-turbo" for lower cost
```

### Customize System Prompt

Edit the `system` message in `route.ts` to change the agent's personality and behavior.

## 🔐 Security Best Practices

1. **Never commit `.env.local`** - Contains sensitive keys
2. **Implement rate limiting** - Prevent API abuse
3. **Add user confirmation** - For transaction execution
4. **Set amount limits** - Cap transaction values
5. **Enable audit logging** - Track all AI actions

## 💰 Cost Considerations

**OpenAI API Costs:**

-   GPT-4 Turbo: ~$0.01 per 1K input tokens, ~$0.03 per 1K output
-   GPT-3.5 Turbo: Much cheaper (~$0.0005 per 1K tokens)

**Tips to Reduce Costs:**

1. Use GPT-3.5 for simple queries
2. Implement caching for common requests
3. Set token limits on responses
4. Use streaming for better UX

## 📚 Documentation

-   **Setup Guide**: See `packages/nextjs/AGENT_SETUP.md`
-   **Vercel AI SDK**: https://sdk.vercel.ai/docs
-   **Coinbase AgentKit**: https://docs.cdp.coinbase.com/

## 🎨 UI Features

-   💬 Real-time streaming responses
-   🔄 Auto-scroll to latest messages
-   📱 Mobile-responsive design
-   🎯 Tool execution indicators
-   ⚡ Smooth animations
-   🎨 Beautiful gradient design matching ZapAI theme

## 🐛 Troubleshooting

**"OpenAI API key not found"**

-   Ensure `OPENAI_API_KEY` is in `.env.local`
-   Restart the dev server after adding

**"Failed to connect to blockchain"**

-   Check internet connection
-   Verify RPC endpoint is accessible
-   Try using a different RPC provider

**Tool execution errors**

-   Check browser console for details
-   Verify wallet is connected
-   Check address/parameter formats

## 🚧 Next Steps

1. **Enable Transactions**: Integrate full Coinbase AgentKit for tx execution
2. **Multi-Chain**: Add support for other chains (Polygon, Base, etc.)
3. **DeFi Tools**: Add Uniswap swaps, Aave lending, etc.
4. **Memory**: Add conversation memory/context
5. **Voice**: Add voice input/output
6. **Mobile App**: Create React Native version

## 🤝 Contributing

Want to add more AI tools? Here's how:

1. Fork the repo
2. Create a new tool in `route.ts`
3. Test thoroughly
4. Submit a PR

## 📝 Example Conversations

**Example 1: Check Balance**

```
You: What's vitalik.eth's balance?
AI: Let me check that for you...
    [Uses getBalance tool]
    Vitalik.eth currently has 1,234.56 ETH
```

**Example 2: Gas Price**

```
You: Is gas expensive right now?
AI: [Uses getGasPrice tool]
    Current gas price is 25 Gwei, which is moderate.
    A simple transfer would cost about $5-7.
```

**Example 3: Token Info**

```
You: Tell me about USDC
AI: [Uses getTokenInfo tool]
    USDC (USD Coin) is a stablecoin pegged to the US Dollar.
    Contract: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
    Decimals: 6
```

## 🎯 Current Limitations

-   Read-only operations (transactions coming soon)
-   Single chain (Ethereum mainnet)
-   No conversation memory between sessions
-   Rate limited by OpenAI API
-   Requires active wallet connection

## 🌟 Future Enhancements

-   [ ] Transaction execution via AI
-   [ ] Multi-chain support
-   [ ] NFT operations
-   [ ] DeFi protocol interactions
-   [ ] Portfolio tracking
-   [ ] Price alerts
-   [ ] Recurring payments
-   [ ] Social recovery
-   [ ] Voice commands
-   [ ] Mobile app

---

**Built with ❤️ by ZapAI Team**

Questions? Open an issue or reach out!
