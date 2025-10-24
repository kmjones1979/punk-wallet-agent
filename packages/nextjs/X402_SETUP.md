# x402 Payment Setup for Zap AI Agent

## Overview

Zap AI Agent uses the **x402 protocol** with Coinbase's facilitator service at **https://x402.org/facilitator** to enable micropayments for AI agent access.

## What is x402?

x402 is an HTTP status code (402 Payment Required) that enables seamless micropayments for web services. The Coinbase facilitator handles:

-   ✅ Payment request generation
-   ✅ On-chain transaction verification
-   ✅ Session management
-   ✅ Multi-chain support

## Quick Start

### 1. Environment Setup

Create or update `.env.local`:

```bash
# Optional: Custom x402 facilitator URL (defaults to https://x402.org/facilitator)
X402_FACILITATOR_URL=https://x402.org/facilitator

# AI Provider (existing)
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...

# Optional: Payment receiver (if self-hosting facilitator)
# PAYMENT_RECEIVER_ADDRESS=0xYourAddress
```

### 2. Configuration

Edit `packages/nextjs/src/config/x402.ts`:

```typescript
export const X402_SERVICES: Record<string, X402Config> = {
    "ai-agent": {
        facilitatorUrl: X402_FACILITATOR_URL,
        serviceId: "zap-ai-agent",
        serviceName: "Zap AI Agent",
        priceUSDC: "0.01", // ← Change price here
        duration: 3600, // ← Change duration (seconds)
        description: "Access to Zap AI Agent",
    },
};
```

### 3. Test the Integration

1. Start the dev server:

```bash
yarn dev
```

2. Open http://localhost:3000

3. Try to use the AI agent - you'll see a payment modal

4. Complete payment with USDC

5. Access granted for 1 hour!

## Architecture

```
┌──────────────┐
│   User App   │
└──────┬───────┘
       │ 1. POST /api/agent
       ▼
┌─────────────────────┐
│   Agent API Route   │
│ Check Payment Status│
└─────────┬───────────┘
          │ No valid payment
          │ Return 402
          ▼
┌───────────────────────┐
│  x402 Payment Modal   │
│  - Show QR code       │
│  - Request payment    │
└────────┬──────────────┘
         │ 2. POST /api/payment/request
         ▼
┌─────────────────────────┐
│  x402 Facilitator       │
│  https://x402.org/...   │
│  - Generate payment req │
│  - Return payment URI   │
└────────┬────────────────┘
         │ 3. User pays USDC on-chain
         ▼
┌─────────────────────────┐
│  Blockchain             │
│  - USDC Transfer        │
│  - Transaction receipt  │
└────────┬────────────────┘
         │ 4. POST /api/payment/verify
         ▼
┌─────────────────────────┐
│  x402 Facilitator       │
│  - Verify tx on-chain   │
│  - Create session       │
│  - Return success       │
└────────┬────────────────┘
         │ 5. Access granted
         ▼
┌─────────────────────┐
│   AI Agent Active   │
│   (1 hour access)   │
└─────────────────────┘
```

## API Integration

### Payment Request

```typescript
// POST /api/payment/request
const response = await fetch("/api/payment/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        serviceId: "ai-agent",
        chainId: 8453, // Base
        userAddress: "0x...",
    }),
});

const data = await response.json();
// data.payment contains payment URI and details
```

### Payment Verification

```typescript
// POST /api/payment/verify
const response = await fetch("/api/payment/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        serviceId: "ai-agent",
        txHash: "0x...",
        userAddress: "0x...",
        chainId: 8453,
    }),
});

const data = await response.json();
// data.verified: true/false
// data.expiresAt: timestamp
```

### Check Payment Status

```typescript
// GET /api/payment/verify?userAddress=0x...&serviceId=ai-agent
const response = await fetch(
    `/api/payment/verify?userAddress=${address}&serviceId=ai-agent`
);

const data = await response.json();
// data.valid: true/false
// data.expiresAt: timestamp
```

## Supported Chains

The x402 facilitator supports multiple chains:

-   ✅ Base (Chain ID: 8453) - **Recommended** (low fees)
-   ✅ Ethereum (Chain ID: 1)
-   ✅ Polygon (Chain ID: 137)
-   ✅ Arbitrum (Chain ID: 42161)
-   ✅ Optimism (Chain ID: 10)

## Adding New Services

To add a new paid service:

1. Add to `packages/nextjs/src/config/x402.ts`:

```typescript
export const X402_SERVICES: Record<string, X402Config> = {
    // ... existing services
    "my-new-service": {
        facilitatorUrl: X402_FACILITATOR_URL,
        serviceId: "zap-my-service",
        serviceName: "My New Service",
        priceUSDC: "0.05",
        duration: 7200, // 2 hours
        description: "Description of my service",
    },
};
```

2. Add payment check to your API route:

```typescript
import {
    getCachedPaymentStatus,
    checkX402PaymentStatus,
} from "../../../config/x402";

export async function POST(req: Request) {
    const { walletAddress } = await req.json();

    if (walletAddress) {
        const serviceId = "my-new-service";
        let hasPayment = getCachedPaymentStatus(walletAddress, serviceId);

        if (!hasPayment) {
            const status = await checkX402PaymentStatus(
                serviceId,
                walletAddress
            );
            hasPayment = status.valid;
        }

        if (!hasPayment) {
            return new Response(
                JSON.stringify({
                    error: "Payment Required",
                    code: "PAYMENT_REQUIRED",
                    serviceId,
                    priceUSDC: "0.05",
                }),
                { status: 402 }
            );
        }
    }

    // Your service logic here
}
```

## Frontend Integration

Use the `PaymentModal` component:

```tsx
import PaymentModal from "../components/PaymentModal";

function MyComponent() {
    const [showPayment, setShowPayment] = useState(false);
    const { address } = useAccount();

    useEffect(() => {
        // Check if payment required
        const checkPayment = async () => {
            const res = await fetch(
                `/api/payment/verify?userAddress=${address}&serviceId=ai-agent`
            );
            const data = await res.json();

            if (!data.valid) {
                setShowPayment(true);
            }
        };

        if (address) {
            checkPayment();
        }
    }, [address]);

    return (
        <>
            {/* Your UI */}

            <PaymentModal
                isOpen={showPayment}
                onClose={() => setShowPayment(false)}
                onPaymentComplete={() => {
                    setShowPayment(false);
                    // Refresh or enable features
                }}
                serviceId="ai-agent"
                priceUSDC="0.01"
            />
        </>
    );
}
```

## Benefits of x402 Facilitator

### vs Custom Implementation

✅ **No Infrastructure Management**

-   No database needed
-   No session storage
-   No payment verification logic

✅ **Production Ready**

-   Battle-tested by Coinbase
-   High availability
-   Automatic scaling

✅ **Security**

-   Facilitator verifies payments on-chain
-   No trust required
-   Secure session management

✅ **Multi-chain Support**

-   Works across all major chains
-   Automatic chain detection
-   Consistent API

## Customization

### Change Price

```typescript
// packages/nextjs/src/config/x402.ts
priceUSDC: "0.05", // Change to desired amount
```

### Change Duration

```typescript
// packages/nextjs/src/config/x402.ts
duration: 7200, // 2 hours (in seconds)
```

### Use Custom Facilitator

If you want to self-host the facilitator:

```bash
# .env.local
X402_FACILITATOR_URL=https://your-facilitator.com
```

## Testing

### Development Mode

For testing without payments, comment out the payment check:

```typescript
// In packages/nextjs/src/app/api/agent/route.ts
// if (walletAddress) {
//     const serviceId = "ai-agent";
//     let hasPayment = getCachedPaymentStatus(walletAddress, serviceId);
//     // ... payment check
// }
```

### Testnet Testing

1. Configure testnet in `x402.ts`
2. Get testnet USDC from faucet
3. Test full payment flow

## Troubleshooting

### Payment Not Verified

**Issue**: Payment completed but not verified

**Solution**:

-   Check transaction was successful
-   Verify correct chain was used
-   Wait a few seconds for confirmations
-   Check facilitator logs

### 402 Error on Every Request

**Issue**: Getting 402 even after payment

**Solution**:

-   Check session hasn't expired
-   Verify facilitator is accessible
-   Check cache is working
-   Restart dev server

### Facilitator Unreachable

**Issue**: Cannot connect to x402.org

**Solution**:

-   Check internet connection
-   Verify `X402_FACILITATOR_URL` is correct
-   Check firewall settings
-   Use custom facilitator URL

## Advanced

### Custom Payment Logic

```typescript
import { verifyX402Payment } from "../../config/x402";

// Implement volume discounts
if (numberOfPreviousPayments > 10) {
    // Apply discount
}

// Implement referral bonuses
if (referralCode) {
    // Extend duration
}
```

### Analytics

```typescript
// Track payments
await logPayment({
    user: userAddress,
    service: serviceId,
    amount: priceUSDC,
    timestamp: Date.now(),
});
```

## Resources

-   **x402 Protocol**: https://x402.org
-   **Coinbase Facilitator**: https://x402.org/facilitator
-   **x402 Spec**: https://github.com/coinbase/x402-spec
-   **EIP-681**: https://eips.ethereum.org/EIPS/eip-681

## Support

For issues with:

-   **Zap Integration**: Open an issue on GitHub
-   **x402 Facilitator**: Contact Coinbase support
-   **Payment Protocol**: Check x402.org documentation

---

**Built with ⚡ using Zap and x402**
