/**
 * Payment Configuration for x402 Services
 *
 * This file defines the payment requirements for various services in the Zap wallet.
 * All payments are processed on-chain and verified before granting access.
 */

import { base, mainnet, polygon, arbitrum, optimism } from "viem/chains";

export interface PaymentConfig {
    serviceName: string;
    priceUSDC: string; // Price in USDC (human-readable, e.g., "0.01")
    duration: number; // How long the payment is valid (in seconds)
    description: string;
}

export interface ChainConfig {
    chainId: number;
    name: string;
    usdcAddress: `0x${string}`;
    paymentReceiverAddress: `0x${string}`;
}

/**
 * Payment configurations for different services
 */
export const PAYMENT_CONFIGS: Record<string, PaymentConfig> = {
    "ai-agent": {
        serviceName: "AI Agent Access",
        priceUSDC: "0.01", // 0.01 USDC per session
        duration: 3600, // 1 hour access
        description: "Pay 0.01 USDC for 1 hour of AI agent access",
    },
    "ai-agent-premium": {
        serviceName: "AI Agent Premium Access",
        priceUSDC: "0.10", // 0.10 USDC per day
        duration: 86400, // 24 hours access
        description: "Pay 0.10 USDC for 24 hours of premium AI agent access",
    },
    // Add more services here in the future
    // "data-analytics": {
    //   serviceName: "Data Analytics",
    //   priceUSDC: "0.05",
    //   duration: 1800,
    //   description: "Pay 0.05 USDC for 30 minutes of data analytics",
    // },
};

/**
 * Supported chains for x402 payments
 */
export const PAYMENT_CHAINS: ChainConfig[] = [
    {
        chainId: base.id,
        name: "Base",
        usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        // TODO: Replace with your actual payment receiver address
        paymentReceiverAddress:
            (process.env.PAYMENT_RECEIVER_ADDRESS as `0x${string}`) ||
            "0x0000000000000000000000000000000000000000",
    },
    {
        chainId: mainnet.id,
        name: "Ethereum",
        usdcAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        paymentReceiverAddress:
            (process.env.PAYMENT_RECEIVER_ADDRESS as `0x${string}`) ||
            "0x0000000000000000000000000000000000000000",
    },
    {
        chainId: polygon.id,
        name: "Polygon",
        usdcAddress: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
        paymentReceiverAddress:
            (process.env.PAYMENT_RECEIVER_ADDRESS as `0x${string}`) ||
            "0x0000000000000000000000000000000000000000",
    },
    {
        chainId: arbitrum.id,
        name: "Arbitrum",
        usdcAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
        paymentReceiverAddress:
            (process.env.PAYMENT_RECEIVER_ADDRESS as `0x${string}`) ||
            "0x0000000000000000000000000000000000000000",
    },
    {
        chainId: optimism.id,
        name: "Optimism",
        usdcAddress: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
        paymentReceiverAddress:
            (process.env.PAYMENT_RECEIVER_ADDRESS as `0x${string}`) ||
            "0x0000000000000000000000000000000000000000",
    },
];

/**
 * Get payment config for a service
 */
export function getPaymentConfig(serviceId: string): PaymentConfig | null {
    return PAYMENT_CONFIGS[serviceId] || null;
}

/**
 * Get chain config by chainId
 */
export function getChainConfig(chainId: number): ChainConfig | null {
    return PAYMENT_CHAINS.find((c) => c.chainId === chainId) || null;
}

/**
 * Generate EIP-681 payment URI
 */
export function generatePaymentURI(
    serviceId: string,
    chainId: number,
    userAddress: `0x${string}`
): string | null {
    const paymentConfig = getPaymentConfig(serviceId);
    const chainConfig = getChainConfig(chainId);

    if (!paymentConfig || !chainConfig) {
        return null;
    }

    // Convert USDC amount to base units (6 decimals)
    const amount = BigInt(parseFloat(paymentConfig.priceUSDC) * 1_000_000);

    // EIP-681 format: ethereum:<contractAddress>@<chainId>/transfer?address=<to>&uint256=<amount>
    const uri = `ethereum:${chainConfig.usdcAddress}@${chainId}/transfer?address=${chainConfig.paymentReceiverAddress}&uint256=${amount}`;

    return uri;
}

/**
 * Payment session storage (in-memory for now, can be replaced with Redis/DB)
 */
interface PaymentSession {
    serviceId: string;
    userAddress: string;
    txHash: string;
    chainId: number;
    expiresAt: number;
    verified: boolean;
}

const paymentSessions = new Map<string, PaymentSession>();

/**
 * Generate a session key
 */
export function generateSessionKey(
    userAddress: string,
    serviceId: string
): string {
    return `${userAddress.toLowerCase()}-${serviceId}`;
}

/**
 * Store a payment session
 */
export function storePaymentSession(session: PaymentSession): void {
    const key = generateSessionKey(session.userAddress, session.serviceId);
    paymentSessions.set(key, session);

    // Auto-cleanup after expiration
    setTimeout(() => {
        paymentSessions.delete(key);
    }, session.expiresAt - Date.now());
}

/**
 * Get a payment session
 */
export function getPaymentSession(
    userAddress: string,
    serviceId: string
): PaymentSession | null {
    const key = generateSessionKey(userAddress, serviceId);
    const session = paymentSessions.get(key);

    if (!session) {
        return null;
    }

    // Check if expired
    if (session.expiresAt < Date.now()) {
        paymentSessions.delete(key);
        return null;
    }

    return session;
}

/**
 * Check if user has valid payment for a service
 */
export function hasValidPayment(
    userAddress: string,
    serviceId: string
): boolean {
    const session = getPaymentSession(userAddress, serviceId);
    return session !== null && session.verified;
}
