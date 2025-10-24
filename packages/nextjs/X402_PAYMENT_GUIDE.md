# x402 Payment System for Zap AI Agent

This guide explains how to configure and use the x402 payment system for the Zap AI agent.

## Overview

The x402 payment system implements HTTP 402 (Payment Required) for accessing the AI agent. Users must pay a small amount of USDC on-chain before they can use the AI features.

## Architecture

```
┌─────────────────┐
│   User Wallet   │
└────────┬────────┘
         │ 1. Request AI Access
         ▼
┌─────────────────────┐
│  Payment Required?  │◄─── Check hasValidPayment()
└─────────┬───────────┘
          │ No valid payment
          ▼
┌──────────────────────┐
│  Show Payment Modal  │
│  - Display QR code   │
│  - Allow wallet pay  │
└──────────┬───────────┘
           │ 2. User pays 0.01 USDC
           ▼
┌────────────────────────┐
│ Verify Payment On-Chain│◄─── Check transaction logs
│  - Parse Transfer event│
│  - Verify amount       │
│  - Store session       │
└────────┬───────────────┘
         │ 3. Payment verified
         ▼
┌─────────────────┐
│  Access Granted │
│  (1 hour)       │
└─────────────────┘
```

## Configuration

### 1. Environment Variables

Add to your `.env.local`:

```bash
# Payment receiver address (where payments go)
PAYMENT_RECEIVER_ADDRESS=0xYourAddressHere

# AI API keys (existing)
AI_PROVIDER=openai
OPENAI_API_KEY=your-key-here
```

⚠️ **IMPORTANT**: Replace `0xYourAddressHere` with your actual wallet address where you want to receive payments.

### 2. Payment Configuration

Edit `packages/nextjs/src/config/payments.ts` to configure:

- **Service Pricing**: Change `priceUSDC` for different services
- **Access Duration**: Modify `duration` (in seconds)
- **Supported Chains**: Add/remove chains from `PAYMENT_CHAINS`

Example:

```typescript
export const PAYMENT_CONFIGS: Record<string, PaymentConfig> = {
  "ai-agent": {
    serviceName: "AI Agent Access",
    priceUSDC: "0.01", // ← Change price here
    duration: 3600, // ← Change duration here (seconds)
    description: "Pay 0.01 USDC for 1 hour of AI agent access",
  },
};
```

### 3. Add New Services

To add a new paid service:

```typescript
export const PAYMENT_CONFIGS: Record<string, PaymentConfig> = {
  // ... existing services
  "my-new-service": {
    serviceName: "My New Service",
    priceUSDC: "0.05",
    duration: 7200, // 2 hours
    description: "Custom service description",
  },
};
```

Then in your API route:

```typescript
import { hasValidPayment } from "../../../config/payments";

export async function POST(req: Request) {
  const { walletAddress } = await req.json();
  
  if (walletAddress) {
    const serviceId = "my-new-service"; // Your service ID
    if (!hasValidPayment(walletAddress, serviceId)) {
      return new Response(JSON.stringify({ error: "Payment Required" }), {
        status: 402,
      });
    }
  }
  
  // ... your service logic
}
```

## API Endpoints

### POST /api/payment/request

Generate a payment request for a service.

**Request:**
```json
{
  "serviceId": "ai-agent",
  "chainId": 8453,
  "userAddress": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "payment": {
    "serviceId": "ai-agent",
    "serviceName": "AI Agent Access",
    "priceUSDC": "0.01",
    "chainId": 8453,
    "chainName": "Base",
    "usdcAddress": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "paymentReceiverAddress": "0x...",
    "paymentURI": "ethereum:0x...@8453/transfer?..."
  }
}
```

### POST /api/payment/verify

Verify a payment transaction on-chain.

**Request:**
```json
{
  "serviceId": "ai-agent",
  "txHash": "0x...",
  "userAddress": "0x...",
  "chainId": 8453
}
```

**Response:**
```json
{
  "success": true,
  "verified": true,
  "expiresAt": 1730000000000
}
```

### GET /api/payment/verify

Check if a user has valid payment.

**Request:**
```
GET /api/payment/verify?userAddress=0x...&serviceId=ai-agent
```

**Response:**
```json
{
  "valid": true,
  "expiresAt": 1730000000000,
  "timeRemaining": 3600000
}
```

## Frontend Integration

### Using the Payment Modal

```tsx
import PaymentModal from "../components/PaymentModal";

function MyComponent() {
  const [showPayment, setShowPayment] = useState(false);
  
  const handlePaymentComplete = () => {
    // Payment completed, refresh or enable features
    console.log("Payment verified!");
  };
  
  return (
    <>
      <button onClick={() => setShowPayment(true)}>
        Access AI Agent
      </button>
      
      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        onPaymentComplete={handlePaymentComplete}
        serviceId="ai-agent"
        priceUSDC="0.01"
      />
    </>
  );
}
```

### Checking Payment Status

```typescript
const checkPaymentStatus = async (userAddress: string) => {
  const response = await fetch(
    `/api/payment/verify?userAddress=${userAddress}&serviceId=ai-agent`
  );
  const data = await response.json();
  return data.valid;
};
```

## Supported Chains

| Chain | Chain ID | USDC Address |
|-------|----------|--------------|
| Base | 8453 | 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 |
| Ethereum | 1 | 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 |
| Polygon | 137 | 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359 |
| Arbitrum | 42161 | 0xaf88d065e77c8cC2239327C5EDb3A432268e5831 |
| Optimism | 10 | 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85 |

## Payment Flow

1. **User Attempts Access**: User tries to use AI agent
2. **Payment Check**: System checks `hasValidPayment(userAddress, serviceId)`
3. **Show Payment Modal**: If no valid payment, show payment modal
4. **User Pays**: User sends USDC to payment receiver address
5. **Verify On-Chain**: System verifies transaction on-chain:
   - Checks transaction receipt
   - Parses Transfer event
   - Verifies sender, receiver, and amount
6. **Grant Access**: Store payment session and grant access for duration
7. **Session Expires**: After duration, user must pay again

## Security Features

- ✅ **On-chain Verification**: All payments verified on-chain, no trust required
- ✅ **Exact Amount Check**: System verifies exact USDC amount was paid
- ✅ **Transaction Receipt**: Only successful transactions accepted
- ✅ **Address Verification**: Checks sender and receiver addresses
- ✅ **Time-Limited Access**: Sessions expire after configured duration
- ✅ **No Double Payment**: Existing valid sessions are reused

## Testing

### 1. Local Testing

For development, you can temporarily disable payment checks:

```typescript
// In packages/nextjs/src/app/api/agent/route.ts
// Comment out the payment check:
// if (walletAddress) {
//     const serviceId = "ai-agent";
//     const hasPayment = hasValidPayment(walletAddress, serviceId);
//     if (!hasPayment) {
//         // return payment required error
//     }
// }
```

### 2. Testnet Testing

Use Base Sepolia (testnet) for testing:

1. Add Base Sepolia to `PAYMENT_CHAINS` in `payments.ts`
2. Get testnet USDC from a faucet
3. Test full payment flow

### 3. Production Testing

Start with a small amount (0.001 USDC) to test in production before going live.

## Customization

### Change Payment Amount

```typescript
// packages/nextjs/src/config/payments.ts
priceUSDC: "0.05", // Change to desired amount
```

### Change Access Duration

```typescript
// packages/nextjs/src/config/payments.ts
duration: 7200, // 2 hours (in seconds)
```

### Add New Chain

```typescript
// packages/nextjs/src/config/payments.ts
{
  chainId: 43114,
  name: "Avalanche",
  usdcAddress: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
  paymentReceiverAddress: process.env.PAYMENT_RECEIVER_ADDRESS as `0x${string}`,
}
```

## Troubleshooting

### Payment Not Verified

- Check transaction was successful (not reverted)
- Verify correct chain was used
- Ensure exact amount was sent
- Check USDC contract address matches

### Session Not Persisting

- Current implementation uses in-memory storage
- For production, consider using Redis or a database
- See `packages/nextjs/src/config/payments.ts` → `storePaymentSession()`

### Wrong Payment Receiver

- Update `PAYMENT_RECEIVER_ADDRESS` in `.env.local`
- Restart dev server after changing env vars

## Future Enhancements

- [ ] Database-backed session storage (Redis/PostgreSQL)
- [ ] Payment subscriptions (monthly/yearly)
- [ ] Volume discounts
- [ ] Multi-token support (ETH, DAI, etc.)
- [ ] Payment refunds
- [ ] Admin dashboard for monitoring payments
- [ ] Webhook notifications

## Support

For issues or questions about the x402 payment system:
1. Check this guide first
2. Review the source code in `packages/nextjs/src/config/payments.ts`
3. Open an issue on GitHub

---

**Built with ❤️ using Zap**

