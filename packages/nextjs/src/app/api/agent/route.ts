import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { streamText, tool } from "ai";
import { z } from "zod";
import { createPublicClient, http, formatEther, parseEther } from "viem";
import {
    mainnet,
    base,
    baseSepolia,
    bsc,
    arbitrum,
    optimism,
    polygon,
    avalanche,
} from "viem/chains";
import { unichain } from "../../../config/wagmi";
import {
    getCachedPaymentStatus,
    checkX402PaymentStatus,
    clearCachedPaymentStatus,
} from "../../../config/x402";

// Token addresses by chain
const TOKEN_ADDRESSES: Record<string, Record<string, string>> = {
    mainnet: {
        USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    },
    bsc: {
        USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
        USDT: "0x55d398326f99059fF775485246999027B3197955",
        BUSD: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
    },
    base: {
        USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        USDbC: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA",
    },
    "base-sepolia": {
        USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    },
    unichain: {
        USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    },
    arbitrum: {
        USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
        "USDC.e": "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
        USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    },
    optimism: {
        USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
        "USDC.e": "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
        USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    },
    polygon: {
        USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
        "USDC.e": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    },
    avalanche: {
        USDC: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
        "USDC.e": "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664",
        USDT: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
    },
};

// Helper to get chain object from name
const getChain = (chainName: string) => {
    switch (chainName.toLowerCase()) {
        case "mainnet":
        case "ethereum":
            return mainnet;
        case "bsc":
        case "binance":
            return bsc;
        case "base":
            return base;
        case "base sepolia":
        case "base-sepolia":
            return baseSepolia;
        case "unichain":
            return unichain;
        case "arbitrum":
        case "arbitrum-one":
            return arbitrum;
        case "optimism":
            return optimism;
        case "polygon":
        case "matic":
            return polygon;
        case "avalanche":
        case "avax":
            return avalanche;
        default:
            return mainnet;
    }
};

// Helper to get public client for a specific chain
const getPublicClient = (chainName: string = "mainnet") => {
    return createPublicClient({
        chain: getChain(chainName),
        transport: http(),
    });
};

// Choose AI model based on environment variable
const getAIModel = () => {
    const provider = process.env.AI_PROVIDER || "openai";
    const modelName = process.env.AI_MODEL;

    switch (provider) {
        case "gemini":
        case "google":
            return google(modelName || "gemini-1.5-pro");
        case "openai":
        default:
            // Default to gpt-4o-mini for cost efficiency
            // Supported models: gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo
            return openai(modelName || "gpt-4o-mini");
    }
};

export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const { messages, walletAddress, connectorId } = await req.json();

        // x402 Payment Check: Require payment for each AI message (pay-per-message)
        if (walletAddress) {
            const serviceId = "ai-agent";

            // Check if user has already paid (cached or verified)
            let hasPayment = getCachedPaymentStatus(walletAddress, serviceId);

            // If not in cache, check with x402 facilitator
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
                        message:
                            "This AI agent requires payment via x402. Please complete payment to continue.",
                        serviceId: serviceId,
                        priceUSDC: "0.01",
                        facilitatorUrl: "https://x402.org/facilitator",
                    }),
                    {
                        status: 402, // HTTP 402 Payment Required
                        headers: {
                            "Content-Type": "application/json",
                            "X-Payment-Service": serviceId,
                            "X-Payment-Amount": "0.01",
                            "X-Payment-Currency": "USDC",
                        },
                    }
                );
            }

            // Clear the payment cache immediately after use (pay-per-message)
            // This ensures the next message will require a new payment
            clearCachedPaymentStatus(walletAddress, serviceId);
        }

        const result = streamText({
            model: getAIModel(),
            maxSteps: 5,
            system: `You are Zap, an AI assistant specialized in cryptocurrency and blockchain operations. 
You have access to various tools to help users with their crypto needs.
You are friendly, knowledgeable, and always prioritize security.

Connected wallet: ${walletAddress || "Not connected"}
Wallet type: ${
                connectorId === "burner"
                    ? "Burner (auto-executes transactions)"
                    : "Standard (requires approval)"
            }

IMPORTANT INSTRUCTIONS:
- When the user asks about "my balance" or "my wallet", use their connected wallet address: ${walletAddress}
- ALWAYS chain multiple tool calls together in a SINGLE response - don't wait between tools
- When a user requests to send crypto/tokens, execute ALL required steps automatically:
  1. If ENS name provided: resolveEnsName - WAIT for result and extract the 'address' field
  2. If sending tokens: getTokenInfo with tokenSymbol (e.g., 'USDC') and chain parameter
  3. Finally: prepareTransaction using the RESOLVED ADDRESS from step 1 (not the ENS name)
- When sending tokens, pass ALL required parameters to prepareTransaction:
  * to: Use the resolved address from resolveEnsName result (the 'address' field)
  * tokenAddress: From getTokenInfo result
  * tokenAmount: EXACT amount user requested (e.g., "0.01")
  * tokenDecimals: From getTokenInfo result
  * tokenSymbol: From getTokenInfo result
  * chain: The chain user specified (e.g., "base", "mainnet")
- CRITICAL: For tokenAmount, pass the EXACT amount the user requested (e.g., "0.01" for 0.01 USDC), NOT a converted value
- CRITICAL: Always use the resolved ADDRESS (not ENS name) in prepareTransaction's 'to' parameter
- Supported chains: 'mainnet' (Ethereum), 'base' (Base), 'base sepolia' (Base Sepolia testnet)
- When user mentions a chain (e.g., "on base sepolia"), extract the EXACT chain name and pass it to getTokenInfo and prepareTransaction
- If no chain is mentioned, default to 'mainnet'
- After preparing a transaction:
  * Burner wallet: Transaction is sent automatically - inform user it's being processed
  * Standard wallet: User will need to approve it in their wallet
- NEVER execute transactions without explicit user request
- Be concise and efficient - users appreciate quick results`,
            messages,
            tools: {
                resolveEnsName: tool({
                    description:
                        "Resolve an ENS name (like vitalik.eth) to an Ethereum address. Always use this first when a user provides an ENS name. Returns the resolved address that you should use in prepareTransaction.",
                    parameters: z.object({
                        ensName: z
                            .string()
                            .describe(
                                "The ENS name to resolve (e.g., vitalik.eth)"
                            ),
                    }),
                    execute: async ({ ensName }) => {
                        try {
                            const client = getPublicClient("mainnet");
                            const address = await client.getEnsAddress({
                                name: ensName,
                            });

                            if (!address) {
                                return {
                                    success: false,
                                    ensName,
                                    address: null,
                                    resolved: false,
                                    error: "ENS name could not be resolved. It may not exist or is not registered.",
                                };
                            }

                            return {
                                success: true,
                                ensName,
                                address,
                                resolved: true,
                                message: `Successfully resolved ${ensName} to ${address}`,
                            };
                        } catch (error: any) {
                            return {
                                success: false,
                                ensName,
                                address: null,
                                error: error.message,
                                resolved: false,
                            };
                        }
                    },
                }),
                getBalance: tool({
                    description: "Get the ETH balance of a wallet address",
                    parameters: z.object({
                        address: z
                            .string()
                            .describe("The Ethereum wallet address"),
                    }),
                    execute: async ({ address }) => {
                        try {
                            const client = getPublicClient("mainnet");
                            const balance = await client.getBalance({
                                address: address as `0x${string}`,
                            });
                            return {
                                address,
                                balance: formatEther(balance),
                                balanceWei: balance.toString(),
                            };
                        } catch (error: any) {
                            return { error: error.message };
                        }
                    },
                }),
                getTokenInfo: tool({
                    description:
                        "Get information about an ERC20 token. Can search by symbol (e.g., 'USDC') or by contract address.",
                    parameters: z.object({
                        tokenSymbol: z
                            .string()
                            .optional()
                            .describe(
                                "Token symbol (e.g., 'USDC', 'DAI'). If provided, will look up address for the specified chain."
                            ),
                        tokenAddress: z
                            .string()
                            .optional()
                            .describe(
                                "The token contract address. Use this if you already know the address."
                            ),
                        chain: z
                            .string()
                            .optional()
                            .default("mainnet")
                            .describe(
                                "Chain name (e.g., 'mainnet', 'base'). Defaults to 'mainnet'."
                            ),
                    }),
                    execute: async ({
                        tokenSymbol,
                        tokenAddress,
                        chain = "mainnet",
                    }) => {
                        try {
                            // Look up token address if symbol is provided
                            let address = tokenAddress;
                            if (!address && tokenSymbol) {
                                // Normalize chain name (replace spaces with dashes)
                                const normalizedChain = chain
                                    .toLowerCase()
                                    .replace(/\s+/g, "-");
                                const chainAddresses =
                                    TOKEN_ADDRESSES[normalizedChain];
                                if (
                                    chainAddresses &&
                                    chainAddresses[tokenSymbol.toUpperCase()]
                                ) {
                                    address =
                                        chainAddresses[
                                            tokenSymbol.toUpperCase()
                                        ];
                                } else {
                                    return {
                                        error: `Token ${tokenSymbol} not found on ${chain}. Available tokens: ${Object.keys(
                                            chainAddresses || {}
                                        ).join(", ")}`,
                                    };
                                }
                            }

                            if (!address) {
                                return {
                                    error: "Either tokenSymbol or tokenAddress must be provided",
                                };
                            }

                            const client = getPublicClient(chain);

                            // ERC20 ABI for name, symbol, decimals
                            const [name, symbol, decimals] = await Promise.all([
                                client.readContract({
                                    address: address as `0x${string}`,
                                    abi: [
                                        {
                                            inputs: [],
                                            name: "name",
                                            outputs: [
                                                { type: "string", name: "" },
                                            ],
                                            stateMutability: "view",
                                            type: "function",
                                        },
                                    ],
                                    functionName: "name",
                                }),
                                client.readContract({
                                    address: address as `0x${string}`,
                                    abi: [
                                        {
                                            inputs: [],
                                            name: "symbol",
                                            outputs: [
                                                { type: "string", name: "" },
                                            ],
                                            stateMutability: "view",
                                            type: "function",
                                        },
                                    ],
                                    functionName: "symbol",
                                }),
                                client.readContract({
                                    address: address as `0x${string}`,
                                    abi: [
                                        {
                                            inputs: [],
                                            name: "decimals",
                                            outputs: [
                                                { type: "uint8", name: "" },
                                            ],
                                            stateMutability: "view",
                                            type: "function",
                                        },
                                    ],
                                    functionName: "decimals",
                                }),
                            ]);

                            return {
                                tokenAddress: address,
                                name,
                                symbol,
                                decimals,
                                chain,
                            };
                        } catch (error: any) {
                            return { error: error.message };
                        }
                    },
                }),
                getGasPrice: tool({
                    description: "Get the current gas price on Ethereum",
                    parameters: z.object({}),
                    execute: async () => {
                        try {
                            const client = getPublicClient("mainnet");
                            const gasPrice = await client.getGasPrice();
                            return {
                                gasPrice: formatEther(gasPrice),
                                gasPriceGwei: (
                                    Number(gasPrice) / 1e9
                                ).toString(),
                            };
                        } catch (error: any) {
                            return { error: error.message };
                        }
                    },
                }),
                getBlockNumber: tool({
                    description: "Get the current block number on Ethereum",
                    parameters: z.object({}),
                    execute: async () => {
                        try {
                            const client = getPublicClient("mainnet");
                            const blockNumber = await client.getBlockNumber();
                            return {
                                blockNumber: blockNumber.toString(),
                            };
                        } catch (error: any) {
                            return { error: error.message };
                        }
                    },
                }),
                getTransactionCount: tool({
                    description:
                        "Get the number of transactions sent from an address",
                    parameters: z.object({
                        address: z
                            .string()
                            .describe("The Ethereum wallet address"),
                    }),
                    execute: async ({ address }) => {
                        try {
                            const client = getPublicClient("mainnet");
                            const count = await client.getTransactionCount({
                                address: address as `0x${string}`,
                            });
                            return {
                                address,
                                transactionCount: count,
                            };
                        } catch (error: any) {
                            return { error: error.message };
                        }
                    },
                }),
                estimateGas: tool({
                    description: "Estimate gas for a transaction",
                    parameters: z.object({
                        from: z.string().describe("From address"),
                        to: z.string().describe("To address"),
                        value: z.string().describe("Value in ETH"),
                    }),
                    execute: async ({ from, to, value }) => {
                        try {
                            const client = getPublicClient("mainnet");
                            const gas = await client.estimateGas({
                                account: from as `0x${string}`,
                                to: to as `0x${string}`,
                                value: parseEther(value),
                            });
                            return {
                                estimatedGas: gas.toString(),
                                from,
                                to,
                                value,
                            };
                        } catch (error: any) {
                            return { error: error.message };
                        }
                    },
                }),
                explainTransaction: tool({
                    description:
                        "Explain what a transaction will do in simple terms",
                    parameters: z.object({
                        to: z.string().describe("Recipient address"),
                        value: z.string().describe("Amount in ETH"),
                        data: z
                            .string()
                            .optional()
                            .describe("Transaction data (optional)"),
                    }),
                    execute: async ({ to, value, data }) => {
                        let explanation = `This transaction will send ${value} ETH to address ${to}.`;

                        if (data && data !== "0x") {
                            explanation +=
                                " This transaction also includes data, which means it's interacting with a smart contract.";
                        }

                        return { explanation, to, value, hasData: !!data };
                    },
                }),
                prepareTransaction: tool({
                    description:
                        "Prepare a transaction for user approval. This creates a transaction request that the user must approve in their wallet. Use this for sending ETH or tokens.",
                    parameters: z.object({
                        to: z.string().describe("Recipient address (0x...)"),
                        value: z
                            .string()
                            .optional()
                            .describe(
                                "Amount in ETH (optional, for ETH transfers)"
                            ),
                        tokenAddress: z
                            .string()
                            .optional()
                            .describe(
                                "Token contract address (for token transfers)"
                            ),
                        tokenAmount: z
                            .string()
                            .optional()
                            .describe(
                                "Token amount in human-readable format (e.g., '0.01' for 0.01 tokens, NOT converted with decimals)"
                            ),
                        tokenDecimals: z
                            .number()
                            .optional()
                            .describe("Token decimals (for token transfers)"),
                        tokenSymbol: z
                            .string()
                            .optional()
                            .describe("Token symbol (e.g., USDC, DAI)"),
                        chain: z
                            .string()
                            .optional()
                            .default("mainnet")
                            .describe(
                                "Chain name (e.g., 'mainnet', 'base'). Defaults to 'mainnet'."
                            ),
                    }),
                    execute: async ({
                        to,
                        value,
                        tokenAddress,
                        tokenAmount,
                        tokenDecimals,
                        tokenSymbol,
                        chain = "mainnet",
                    }) => {
                        try {
                            // Prepare transaction data
                            const txData: any = {
                                to,
                                from: walletAddress,
                                chain: chain,
                            };

                            if (tokenAddress && tokenAmount && tokenDecimals) {
                                // ERC20 transfer
                                // Create transfer data using ERC20 transfer function
                                const amount = BigInt(
                                    Math.floor(
                                        parseFloat(tokenAmount) *
                                            10 ** tokenDecimals
                                    )
                                );

                                txData.data = `0xa9059cbb${to
                                    .slice(2)
                                    .padStart(64, "0")}${amount
                                    .toString(16)
                                    .padStart(64, "0")}`;
                                txData.to = tokenAddress;
                                txData.value = "0";
                                txData.type = "token";
                                txData.tokenSymbol = tokenSymbol || "TOKEN";
                                txData.tokenAmount = tokenAmount;
                                txData.recipient = to; // Store the actual recipient address
                            } else if (value) {
                                // ETH transfer
                                txData.value = value;
                                txData.type = "eth";
                            }

                            // This returns the prepared transaction for the UI to handle
                            // For burner wallet, transaction is auto-executed
                            const isBurnerWallet = connectorId === "burner";
                            return {
                                success: true,
                                transaction: txData,
                                message: isBurnerWallet
                                    ? "Transaction sent! It will be processed automatically."
                                    : "Transaction prepared. Please approve it in your wallet to continue.",
                                needsApproval: true,
                            };
                        } catch (error: any) {
                            return {
                                success: false,
                                error: error.message,
                                needsApproval: false,
                            };
                        }
                    },
                }),
            },
        });

        return result.toDataStreamResponse();
    } catch (error: any) {
        console.error("Agent error details:", {
            message: error.message,
            stack: error.stack,
            name: error.name,
            cause: error.cause,
        });

        return new Response(
            JSON.stringify({
                error: error.message || "Agent error occurred",
                details: error.cause?.message || error.stack?.split("\n")[0],
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
}
