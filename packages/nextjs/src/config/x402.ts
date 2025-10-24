/**
 * x402 Payment Configuration using Coinbase Facilitator
 *
 * This file configures the x402 payment system using Coinbase's facilitator service
 * at https://x402.org/facilitator
 */

export interface X402Config {
    facilitatorUrl: string;
    serviceId: string;
    serviceName: string;
    priceUSDC: string;
    duration: number; // in seconds
    description: string;
}

/**
 * x402 Facilitator URL
 */
export const X402_FACILITATOR_URL =
    process.env.X402_FACILITATOR_URL || "https://x402.org/facilitator";

/**
 * Default chain for payments
 * - Base mainnet: 8453
 * - Base Sepolia (testnet): 84532
 */
export const DEFAULT_PAYMENT_CHAIN_ID =
    process.env.NODE_ENV === "development"
        ? 84532 // Base Sepolia for development
        : 8453; // Base mainnet for production

/**
 * Service configurations for x402 payments
 */
export const X402_SERVICES: Record<string, X402Config> = {
    "ai-agent": {
        facilitatorUrl: X402_FACILITATOR_URL,
        serviceId: "zap-ai-agent",
        serviceName: "Zap AI Agent",
        priceUSDC: "0.01",
        duration: 300, // 5 minutes - enough time to complete one request
        description:
            "Pay per message - Access to Zap AI Agent with crypto transaction capabilities",
    },
    "ai-agent-premium": {
        facilitatorUrl: X402_FACILITATOR_URL,
        serviceId: "zap-ai-agent-premium",
        serviceName: "Zap AI Agent Premium",
        priceUSDC: "0.10",
        duration: 86400, // 24 hours
        description: "Premium access to Zap AI Agent with priority support",
    },
};

/**
 * Get x402 configuration for a service
 */
export function getX402Config(serviceId: string): X402Config | null {
    return X402_SERVICES[serviceId] || null;
}

/**
 * USDC contract addresses by chain
 */
const USDC_ADDRESSES: Record<number, string> = {
    1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // Ethereum
    8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base
    84532: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Base Sepolia
    137: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // Polygon
    42161: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", // Arbitrum
    10: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607", // Optimism
};

/**
 * Payment receiver address (where USDC payments go)
 */
const PAYMENT_RECEIVER_ADDRESS =
    process.env.PAYMENT_RECEIVER_ADDRESS ||
    process.env.NEXT_PUBLIC_PAYMENT_RECEIVER_ADDRESS ||
    "0x0000000000000000000000000000000000000000";

/**
 * Create x402 payment request
 */
export async function createX402PaymentRequest(
    serviceId: string,
    userAddress: string,
    chainId?: number
): Promise<any> {
    const config = getX402Config(serviceId);
    if (!config) {
        throw new Error(`Service not found: ${serviceId}`);
    }

    const targetChainId = chainId || DEFAULT_PAYMENT_CHAIN_ID;
    const usdcAddress = USDC_ADDRESSES[targetChainId];

    if (!usdcAddress) {
        throw new Error(`USDC not supported on chain ${targetChainId}`);
    }

    if (
        PAYMENT_RECEIVER_ADDRESS ===
        "0x0000000000000000000000000000000000000000"
    ) {
        throw new Error(
            "Payment receiver address not configured. Set PAYMENT_RECEIVER_ADDRESS in .env.local"
        );
    }

    // Convert USDC amount to base units (USDC has 6 decimals)
    const amountInBaseUnits = (
        parseFloat(config.priceUSDC) * 1000000
    ).toString();

    // Create payment URI for EIP-681
    const paymentURI = `ethereum:${usdcAddress}@${targetChainId}/transfer?address=${PAYMENT_RECEIVER_ADDRESS}&uint256=${amountInBaseUnits}`;

    return {
        serviceId: config.serviceId,
        serviceName: config.serviceName,
        amount: config.priceUSDC,
        amountInBaseUnits,
        currency: "USDC",
        usdcAddress,
        paymentReceiverAddress: PAYMENT_RECEIVER_ADDRESS,
        chainId: targetChainId,
        paymentURI,
        metadata: {
            description: config.description,
            duration: config.duration,
        },
    };
}

/**
 * RPC URLs by chain
 */
const RPC_URLS: Record<number, string> = {
    1: process.env.ETH_RPC_URL || "https://eth.llamarpc.com",
    8453: process.env.BASE_RPC_URL || "https://mainnet.base.org",
    84532: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
    137: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
    42161: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
    10: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
};

/**
 * Verify x402 payment on-chain
 */
export async function verifyX402Payment(
    serviceId: string,
    txHash: string,
    userAddress: string,
    chainId: number
): Promise<{ verified: boolean; expiresAt?: number; error?: string }> {
    const config = getX402Config(serviceId);
    if (!config) {
        return { verified: false, error: "Service not found" };
    }

    try {
        const rpcUrl = RPC_URLS[chainId];
        if (!rpcUrl) {
            return {
                verified: false,
                error: `Chain ${chainId} not supported`,
            };
        }

        const usdcAddress = USDC_ADDRESSES[chainId];
        const expectedAmount = (
            parseFloat(config.priceUSDC) * 1000000
        ).toString();

        // Get transaction receipt
        const receiptResponse = await fetch(rpcUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "eth_getTransactionReceipt",
                params: [txHash],
            }),
        });

        const receiptData = await receiptResponse.json();
        const receipt = receiptData.result;

        if (!receipt) {
            return { verified: false, error: "Transaction not found" };
        }

        if (receipt.status !== "0x1") {
            return { verified: false, error: "Transaction failed" };
        }

        // Check if transaction is to USDC contract
        if (receipt.to?.toLowerCase() !== usdcAddress.toLowerCase()) {
            return { verified: false, error: "Invalid token contract" };
        }

        // Parse Transfer event: Transfer(address indexed from, address indexed to, uint256 value)
        // Topic[0] = keccak256("Transfer(address,address,uint256)")
        const transferTopic =
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

        const transferLog = receipt.logs.find(
            (log: any) =>
                log.topics[0] === transferTopic &&
                log.address.toLowerCase() === usdcAddress.toLowerCase()
        );

        if (!transferLog) {
            return {
                verified: false,
                error: "Transfer event not found",
            };
        }

        // Decode the transfer
        const from = "0x" + transferLog.topics[1].slice(26); // Remove padding
        const to = "0x" + transferLog.topics[2].slice(26); // Remove padding
        const amount = BigInt(transferLog.data).toString();

        // Verify payment details
        if (from.toLowerCase() !== userAddress.toLowerCase()) {
            return { verified: false, error: "Wrong sender address" };
        }

        if (to.toLowerCase() !== PAYMENT_RECEIVER_ADDRESS.toLowerCase()) {
            return { verified: false, error: "Wrong receiver address" };
        }

        if (amount !== expectedAmount) {
            return {
                verified: false,
                error: `Wrong amount: expected ${expectedAmount}, got ${amount}`,
            };
        }

        // Payment verified! Cache it and return success
        const expiresAt = Date.now() + config.duration * 1000;
        setCachedPaymentStatus(userAddress, serviceId, true, expiresAt);

        return {
            verified: true,
            expiresAt,
        };
    } catch (error: any) {
        return {
            verified: false,
            error: error.message || "Verification failed",
        };
    }
}

/**
 * Check payment status with facilitator
 */
export async function checkX402PaymentStatus(
    serviceId: string,
    userAddress: string
): Promise<{ valid: boolean; expiresAt?: number }> {
    const config = getX402Config(serviceId);
    if (!config) {
        return { valid: false };
    }

    try {
        const facilitatorUrl = config.facilitatorUrl;

        const response = await fetch(
            `${facilitatorUrl}/status?serviceId=${config.serviceId}&userAddress=${userAddress}`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        if (!response.ok) {
            return { valid: false };
        }

        const result = await response.json();
        return {
            valid: result.valid || false,
            expiresAt: result.expiresAt,
        };
    } catch (error) {
        return { valid: false };
    }
}

/**
 * Local cache for payment status (optional, to reduce API calls)
 */
const paymentCache = new Map<string, { valid: boolean; expiresAt: number }>();

export function getCachedPaymentStatus(
    userAddress: string,
    serviceId: string
): boolean {
    const key = `${userAddress.toLowerCase()}-${serviceId}`;
    const cached = paymentCache.get(key);

    if (!cached) {
        return false;
    }

    if (cached.expiresAt < Date.now()) {
        paymentCache.delete(key);
        return false;
    }

    return cached.valid;
}

export function setCachedPaymentStatus(
    userAddress: string,
    serviceId: string,
    valid: boolean,
    expiresAt: number
): void {
    const key = `${userAddress.toLowerCase()}-${serviceId}`;
    paymentCache.set(key, { valid, expiresAt });

    // Auto-cleanup
    setTimeout(() => {
        paymentCache.delete(key);
    }, expiresAt - Date.now());
}

export function clearCachedPaymentStatus(
    userAddress: string,
    serviceId: string
): void {
    const key = `${userAddress.toLowerCase()}-${serviceId}`;
    paymentCache.delete(key);
}
