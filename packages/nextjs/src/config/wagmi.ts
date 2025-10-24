import { http, createConfig } from "wagmi";
import {
    mainnet,
    arbitrum,
    base,
    optimism,
    polygon,
    bsc,
    avalanche,
    sepolia,
    baseSepolia,
} from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";
import { burnerWallet } from "../lib/burnerConnector";
import { defineChain } from "viem";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo";

// Define Unichain (Sepolia testnet)
export const unichain = defineChain({
    id: 1301,
    name: "Unichain Sepolia",
    nativeCurrency: {
        decimals: 18,
        name: "Ether",
        symbol: "ETH",
    },
    rpcUrls: {
        default: {
            http: ["https://sepolia.unichain.org"],
        },
    },
    blockExplorers: {
        default: {
            name: "Uniscan",
            url: "https://sepolia.uniscan.xyz",
        },
    },
    testnet: true,
});

// Create connectors function to avoid SSR issues with WalletConnect
const getConnectors = () => {
    const connectors = [burnerWallet(), injected()];

    // Only add WalletConnect on the client side
    if (typeof window !== "undefined") {
        connectors.push(
            walletConnect({
                projectId,
                showQrModal: true,
            })
        );
    }

    return connectors;
};

export const config = createConfig({
    chains: [
        mainnet,
        bsc,
        base,
        unichain,
        arbitrum,
        optimism,
        polygon,
        avalanche,
        sepolia,
        baseSepolia,
    ],
    connectors: getConnectors(),
    transports: {
        [mainnet.id]: http(),
        [bsc.id]: http(),
        [base.id]: http(),
        [unichain.id]: http(),
        [arbitrum.id]: http(),
        [optimism.id]: http(),
        [polygon.id]: http(),
        [avalanche.id]: http(),
        [sepolia.id]: http(),
        [baseSepolia.id]: http(),
    },
    ssr: true,
});

export const SUPPORTED_CHAINS = [
    { ...mainnet, testnet: false },
    { ...bsc, testnet: false },
    { ...base, testnet: false },
    { ...unichain, testnet: true },
    { ...arbitrum, testnet: false },
    { ...optimism, testnet: false },
    { ...polygon, testnet: false },
    { ...avalanche, testnet: false },
    { ...sepolia, testnet: true },
    { ...baseSepolia, testnet: true },
];
