"use client";

import { useState, useEffect } from "react";
import {
    useAccount,
    useBalance,
    useConnect,
    useDisconnect,
    useSendTransaction,
    useSwitchChain,
    useEnsName,
    useEnsAddress,
    useReadContract,
} from "wagmi";
import {
    parseEther,
    formatEther,
    parseUnits,
    formatUnits,
    encodeFunctionData,
} from "viem";
import QRCode from "qrcode.react";
import ZapBlockie from "../../components/ZapBlockie";
import Punk from "../../components/Punk";
import QrScanner from "../../components/QrScanner";
import { SUPPORTED_CHAINS } from "../../config/wagmi";
import {
    getAllBurnerWallets,
    getActiveWalletIndex,
    createNewBurnerWallet,
    switchBurnerWallet,
    deleteBurnerWallet,
    copyToClipboard,
    type BurnerWallet,
} from "../../lib/burnerConnector";

// Simple icon components
const SendIcon = () => (
    <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
        />
    </svg>
);

const LoginIcon = () => (
    <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
        />
    </svg>
);

const LogoutIcon = () => (
    <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
        />
    </svg>
);

const WalletIcon = () => (
    <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
        />
    </svg>
);

// Token addresses by chain ID
const USDC_ADDRESSES: Record<number, string> = {
    1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // Ethereum Mainnet
    56: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", // BSC
    8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base
    1301: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Unichain Sepolia
    42161: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // Arbitrum One
    10: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // Optimism
    137: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", // Polygon
    43114: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", // Avalanche
    11155111: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Sepolia (testnet)
    84532: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Base Sepolia
};

// ERC20 ABI for balance and transfer
const ERC20_ABI = [
    {
        inputs: [{ name: "account", type: "address" }],
        name: "balanceOf",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "decimals",
        outputs: [{ name: "", type: "uint8" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { name: "to", type: "address" },
            { name: "amount", type: "uint256" },
        ],
        name: "transfer",
        outputs: [{ name: "", type: "bool" }],
        stateMutability: "nonpayable",
        type: "function",
    },
] as const;

export default function Home() {
    // Wagmi hooks
    const { address, isConnected, chain, connector } = useAccount();
    const { data: balance } = useBalance({ address });
    const { data: ensName } = useEnsName({ address, chainId: 1 });
    const { connect, connectors } = useConnect();
    const { disconnect } = useDisconnect();
    const { switchChain } = useSwitchChain();
    const { sendTransaction, isPending } = useSendTransaction();

    // Get USDC address for current chain
    const usdcAddress = chain?.id ? USDC_ADDRESSES[chain.id] : undefined;

    // Read USDC balance
    const { data: usdcBalance, refetch: refetchUsdcBalance } = useReadContract({
        address: usdcAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
        query: {
            enabled: !!address && !!usdcAddress,
        },
    });

    // Local state
    const [selectedToken, setSelectedToken] = useState<"ETH" | "USDC">("ETH");
    const [receiveMode, setReceiveMode] = useState(false);
    const [toAddress, setToAddress] = useState("");
    const [amount, setAmount] = useState("");
    const [txHash, setTxHash] = useState("");
    const [dollarMode, setDollarMode] = useState(false);
    const [price, setPrice] = useState<number>(0);
    const [qrSize, setQrSize] = useState(256);
    const [showWalletModal, setShowWalletModal] = useState(false);
    const [showPrivateKey, setShowPrivateKey] = useState(false);
    const [showBurnerManager, setShowBurnerManager] = useState(false);
    const [showConnectModal, setShowConnectModal] = useState(false);
    const [showQrScanner, setShowQrScanner] = useState(false);
    const [burnerWallets, setBurnerWallets] = useState<BurnerWallet[]>([]);
    const [activeWalletIndex, setActiveWalletIndexState] = useState(0);
    const [copySuccess, setCopySuccess] = useState<string | null>(null);
    const [revealedKeys, setRevealedKeys] = useState<Set<number>>(new Set());
    const [mounted, setMounted] = useState(false);

    // ENS resolution for the "to" address (must come after toAddress state)
    const { data: resolvedAddress, isLoading: isResolvingEns } = useEnsAddress({
        name: toAddress.includes(".eth") ? toAddress : undefined,
        chainId: 1,
    });

    // Set mounted state to prevent hydration errors
    useEffect(() => {
        setMounted(true);
    }, []);

    // Auto-replace ENS name with resolved address
    useEffect(() => {
        if (resolvedAddress && toAddress.includes(".eth")) {
            setToAddress(resolvedAddress);
        }
    }, [resolvedAddress, toAddress]);

    // Load burner wallets from storage
    useEffect(() => {
        if (typeof window !== "undefined") {
            setBurnerWallets(getAllBurnerWallets());
            setActiveWalletIndexState(getActiveWalletIndex());
        }
    }, []);

    // Auto-connect burner wallet on mount
    useEffect(() => {
        const autoConnect = async () => {
            if (!isConnected && connectors.length > 0) {
                // Find the burner connector
                const burnerConnector = connectors.find(
                    (c) => c.id === "burner"
                );
                if (burnerConnector) {
                    try {
                        await connect({ connector: burnerConnector });
                    } catch (error) {
                        console.error(
                            "Failed to auto-connect burner wallet:",
                            error
                        );
                    }
                }
            }
        };
        autoConnect();
    }, [isConnected, connectors, connect]);

    // Fetch ETH price
    useEffect(() => {
        const fetchPrice = async () => {
            try {
                const response = await fetch(
                    "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
                );
                const data = await response.json();
                setPrice(data.ethereum.usd);
            } catch (error) {
                console.error("Error fetching price:", error);
            }
        };
        fetchPrice();
        const interval = setInterval(fetchPrice, 60000);
        return () => clearInterval(interval);
    }, []);

    // Dynamic QR size for mobile
    useEffect(() => {
        const updateSize = () => {
            const width = window.innerWidth;
            if (width < 640) {
                setQrSize(Math.min(width - 100, 220));
            } else {
                setQrSize(256);
            }
        };
        updateSize();
        window.addEventListener("resize", updateSize);
        return () => window.removeEventListener("resize", updateSize);
    }, []);

    const handleSend = async () => {
        console.log("Send button clicked", {
            toAddress,
            amount,
            isConnected,
            selectedToken,
        });

        if (!toAddress || !amount || !isConnected) {
            alert("Please fill in all fields and connect wallet");
            return;
        }

        // Use resolved ENS address if available, otherwise use the input address
        const finalAddress = resolvedAddress || toAddress;

        // Validate address format
        if (!finalAddress.startsWith("0x") || finalAddress.length !== 42) {
            alert(
                "Invalid address. Please enter a valid Ethereum address or ENS name."
            );
            return;
        }

        console.log("Validated, sending transaction", {
            finalAddress,
            selectedToken,
        });

        try {
            if (selectedToken === "ETH") {
                // Send ETH
                console.log("Sending ETH...");
                sendTransaction(
                    {
                        to: finalAddress as `0x${string}`,
                        value: parseEther(amount),
                    },
                    {
                        onSuccess: (tx) => {
                            console.log("ETH transaction successful!", tx);
                            setTxHash(tx);
                            setToAddress("");
                            setAmount("");
                        },
                        onError: (error) => {
                            console.error("ETH transaction error:", error);
                            alert(error?.message || "ETH transaction failed");
                        },
                    }
                );
            } else {
                // Send USDC
                console.log("Sending USDC", {
                    usdcAddress,
                    finalAddress,
                    amount,
                });

                if (!usdcAddress) {
                    alert("USDC is not supported on this network");
                    return;
                }

                // Encode the transfer function call
                const data = encodeFunctionData({
                    abi: ERC20_ABI,
                    functionName: "transfer",
                    args: [
                        finalAddress as `0x${string}`,
                        parseUnits(amount, 6), // USDC has 6 decimals
                    ],
                });

                console.log("Encoded USDC transfer data", data);

                // Send the transaction
                console.log("About to call sendTransaction...");
                sendTransaction(
                    {
                        to: usdcAddress as `0x${string}`,
                        data,
                    },
                    {
                        onSuccess: (tx) => {
                            console.log("USDC transaction successful!", tx);
                            setTxHash(tx);
                            setToAddress("");
                            setAmount("");
                            // Refetch USDC balance after successful transfer
                            setTimeout(() => refetchUsdcBalance(), 2000);
                        },
                        onError: (error) => {
                            console.error("USDC transaction error:", error);
                            alert(error?.message || "USDC transaction failed");
                        },
                    }
                );
                console.log("sendTransaction called");
            }
        } catch (error: any) {
            console.error("Transaction error:", error);
            alert(error?.message || "Transaction failed");
        }
    };

    const formatAddress = (addr: string) => {
        return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
    };

    const handleBalanceClick = () => {
        setDollarMode(!dollarMode);
    };

    const handleCopyPrivateKey = async (pk: string) => {
        const success = await copyToClipboard(pk);
        if (success) {
            setCopySuccess("copied");
            setTimeout(() => setCopySuccess(null), 2000);
        }
    };

    const toggleRevealKey = (index: number) => {
        setRevealedKeys((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    const handleCreateNewBurner = async () => {
        createNewBurnerWallet();
        setBurnerWallets(getAllBurnerWallets());
        setActiveWalletIndexState(getActiveWalletIndex());

        // Reconnect to use new wallet
        if (connector?.id === "burner") {
            await disconnect();
            setTimeout(async () => {
                const burnerConnector = connectors.find(
                    (c) => c.id === "burner"
                );
                if (burnerConnector) {
                    await connect({ connector: burnerConnector });
                }
            }, 100);
        }
    };

    const handleSwitchBurner = async (index: number) => {
        switchBurnerWallet(index);
        setBurnerWallets(getAllBurnerWallets());
        setActiveWalletIndexState(index);

        // Reconnect to use switched wallet
        if (connector?.id === "burner") {
            await disconnect();
            setTimeout(async () => {
                const burnerConnector = connectors.find(
                    (c) => c.id === "burner"
                );
                if (burnerConnector) {
                    await connect({ connector: burnerConnector });
                }
            }, 100);
        }
    };

    const handleDeleteBurner = async (index: number) => {
        if (burnerWallets.length === 1) {
            alert("Cannot delete the last burner wallet!");
            return;
        }

        if (
            confirm(
                "Are you sure you want to delete this burner wallet? This action cannot be undone!"
            )
        ) {
            deleteBurnerWallet(index);
            setBurnerWallets(getAllBurnerWallets());
            setActiveWalletIndexState(getActiveWalletIndex());

            // Reconnect if we deleted the active wallet
            if (index === activeWalletIndex && connector?.id === "burner") {
                await disconnect();
                setTimeout(async () => {
                    const burnerConnector = connectors.find(
                        (c) => c.id === "burner"
                    );
                    if (burnerConnector) {
                        await connect({ connector: burnerConnector });
                    }
                }, 100);
            }
        }
    };

    const currentChain = SUPPORTED_CHAINS.find((c) => c.id === chain?.id);
    const isMainnet = currentChain && !currentChain.testnet;

    return (
        <div className="min-h-screen bg-linear-to-br from-purple-50 via-blue-50 to-pink-50">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <WalletIcon />
                        <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
                            <h1 className="text-xl sm:text-2xl font-bold bg-linear-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent leading-tight">
                                Send & Receive
                            </h1>
                            <span className="text-sm sm:text-base text-gray-600 leading-tight">
                                Zap Wallet
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        {mounted ? (
                            <>
                                {isConnected && address && (
                                    <>
                                        <button
                                            onClick={() =>
                                                setShowWalletModal(true)
                                            }
                                            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border-2 border-gray-200 rounded-lg font-semibold hover:border-purple-500 transition-all text-xs sm:text-sm touch-manipulation"
                                            title="Wallet Details & Management"
                                        >
                                            <svg
                                                className="w-4 h-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                                                />
                                            </svg>
                                            <span className="hidden sm:inline">
                                                {ensName ||
                                                    formatAddress(address)}
                                            </span>
                                            <span className="sm:hidden">
                                                {ensName
                                                    ? ensName.length > 12
                                                        ? ensName.substring(
                                                              0,
                                                              12
                                                          ) + "..."
                                                        : ensName
                                                    : `${address.substring(
                                                          0,
                                                          4
                                                      )}...${address.substring(
                                                          address.length - 4
                                                      )}`}
                                            </span>
                                        </button>
                                        {connector?.id === "burner" && (
                                            <button
                                                onClick={() =>
                                                    setShowConnectModal(true)
                                                }
                                                className="hidden sm:flex items-center gap-1 px-3 py-2 bg-white border-2 border-gray-200 rounded-lg font-semibold hover:border-blue-500 transition-all text-xs touch-manipulation"
                                                title="Connect another wallet"
                                            >
                                                <LoginIcon />
                                                <span className="text-xs">
                                                    Other
                                                </span>
                                            </button>
                                        )}
                                        <a
                                            href="/"
                                            className="p-2 sm:p-2.5 bg-white border-2 border-gray-200 rounded-lg hover:border-purple-500 transition-all text-2xl touch-manipulation flex items-center justify-center"
                                            title="AI Agent"
                                        >
                                            🤖
                                        </a>
                                    </>
                                )}
                                {!isConnected && (
                                    <button
                                        onClick={() =>
                                            connect({
                                                connector: connectors[0],
                                            })
                                        }
                                        className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-linear-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all text-xs sm:text-sm touch-manipulation"
                                    >
                                        <LoginIcon />
                                        <span className="hidden sm:inline">
                                            Connect
                                        </span>
                                    </button>
                                )}
                            </>
                        ) : (
                            <button
                                disabled
                                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-linear-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold opacity-50 text-xs sm:text-sm"
                            >
                                <LoginIcon />
                                <span className="hidden sm:inline">
                                    Connect
                                </span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="w-full max-w-md mx-auto py-6 sm:py-12 px-4">
                {/* Connect Wallet - Not Connected */}
                {mounted && !isConnected && (
                    <div className="mb-6 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">
                            🔌 Connect Your Wallet
                        </h3>
                        <p className="text-sm text-gray-600 mb-4 text-center">
                            Choose how you'd like to connect
                        </p>
                        <div className="space-y-3">
                            {connectors.map((connector) => (
                                <button
                                    key={connector.id}
                                    onClick={() => connect({ connector })}
                                    className="w-full p-4 bg-linear-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg font-semibold text-gray-800 hover:border-purple-400 hover:shadow-md transition-all flex items-center justify-between touch-manipulation"
                                >
                                    <span className="flex items-center gap-3">
                                        {connector.name === "Burner Wallet" &&
                                            "🔥"}
                                        {connector.name === "WalletConnect" &&
                                            "🔗"}
                                        {connector.name !== "Burner Wallet" &&
                                            connector.name !==
                                                "WalletConnect" &&
                                            "💼"}
                                        {connector.name}
                                    </span>
                                    <svg
                                        className="w-5 h-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 5l7 7-7 7"
                                        />
                                    </svg>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Balance */}
                {mounted && isConnected && (
                    <div className="text-center mb-8 sm:mb-10">
                        <div className="mb-4">
                            <span className="status-badge">
                                {connector?.id === "burner"
                                    ? "🔥 Burner Wallet"
                                    : "🔗 Connected"}{" "}
                                · {chain?.name || "Unknown"}
                            </span>
                        </div>
                        <div className="space-y-2">
                            <div
                                onClick={handleBalanceClick}
                                className="zap-balance inline-block cursor-pointer"
                            >
                                {mounted && balance ? (
                                    dollarMode && price ? (
                                        <>
                                            $
                                            {(
                                                parseFloat(
                                                    formatEther(balance.value)
                                                ) * price
                                            ).toFixed(2)}
                                        </>
                                    ) : (
                                        <>
                                            {parseFloat(
                                                formatEther(balance.value)
                                            ).toFixed(4)}{" "}
                                            {balance.symbol}
                                        </>
                                    )
                                ) : (
                                    "--"
                                )}
                            </div>
                            {mounted && isConnected && usdcAddress && (
                                <div className="text-2xl font-medium text-gray-600">
                                    {usdcBalance ? (
                                        <>
                                            {formatUnits(
                                                usdcBalance as bigint,
                                                6
                                            )}{" "}
                                            <span className="text-xl">
                                                USDC
                                            </span>
                                        </>
                                    ) : (
                                        "0.00 USDC"
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="mt-4">
                            <select
                                value={chain?.id || ""}
                                onChange={(e) =>
                                    switchChain({
                                        chainId: parseInt(e.target.value),
                                    })
                                }
                                className="zap-select"
                            >
                                <optgroup label="Mainnets">
                                    {SUPPORTED_CHAINS.filter(
                                        (c) => !c.testnet
                                    ).map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </optgroup>
                                <optgroup label="Testnets">
                                    {SUPPORTED_CHAINS.filter(
                                        (c) => c.testnet
                                    ).map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </optgroup>
                            </select>
                        </div>
                    </div>
                )}

                {/* Main Interface Card */}
                {mounted && isConnected && (
                    <>
                        <div className="zap-card">
                            {receiveMode ? (
                                <div className="space-y-6">
                                    <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-800">
                                        Receive
                                    </h2>
                                    {mounted && address ? (
                                        <div className="qr-wrapper">
                                            <div className="qr-container">
                                                <div
                                                    style={{
                                                        position: "relative",
                                                        display: "inline-block",
                                                    }}
                                                >
                                                    <QRCode
                                                        value={address}
                                                        size={qrSize}
                                                        level="H"
                                                        includeMargin={true}
                                                    />
                                                    <div
                                                        style={{
                                                            position:
                                                                "absolute",
                                                            top: "50%",
                                                            left: "50%",
                                                            transform:
                                                                "translate(-50%, -50%)",
                                                            backgroundColor:
                                                                "white",
                                                            borderRadius: "8px",
                                                            padding: "4px",
                                                            boxShadow:
                                                                "0 4px 6px rgba(0, 0, 0, 0.1)",
                                                            zIndex: 100,
                                                        }}
                                                    >
                                                        <ZapBlockie
                                                            address={address}
                                                            size={qrSize * 0.25}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-4 text-center w-full">
                                                <p className="text-xs sm:text-sm text-gray-600 mb-2">
                                                    Your Address:
                                                </p>
                                                <p className="font-mono text-xs sm:text-sm break-all px-2 py-2 bg-gray-50 rounded-lg max-w-full overflow-auto">
                                                    {address}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center text-gray-500 py-8">
                                            Loading...
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4 sm:space-y-5">
                                    <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-800">
                                        Send
                                    </h2>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            To Address
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="0x... or ENS name"
                                                value={toAddress}
                                                onChange={(e) =>
                                                    setToAddress(e.target.value)
                                                }
                                                className="zap-input pr-12"
                                            />
                                            <button
                                                onClick={() =>
                                                    setShowQrScanner(true)
                                                }
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-lg transition-all"
                                                title="Scan QR Code"
                                                type="button"
                                            >
                                                <svg
                                                    className="w-6 h-6 text-gray-600"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                                                    />
                                                </svg>
                                            </button>
                                        </div>
                                        {isResolvingEns && (
                                            <p className="text-xs text-blue-600 mt-1">
                                                🔍 Resolving ENS name...
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Token
                                        </label>
                                        <select
                                            value={selectedToken}
                                            onChange={(e) =>
                                                setSelectedToken(
                                                    e.target.value as
                                                        | "ETH"
                                                        | "USDC"
                                                )
                                            }
                                            className="zap-select w-full"
                                            disabled={!usdcAddress}
                                        >
                                            <option value="ETH">
                                                ETH -{" "}
                                                {balance
                                                    ? formatEther(
                                                          balance.value
                                                      ).slice(0, 8)
                                                    : "0.00"}
                                            </option>
                                            {usdcAddress && (
                                                <option value="USDC">
                                                    USDC -{" "}
                                                    {usdcBalance
                                                        ? formatUnits(
                                                              usdcBalance as bigint,
                                                              6
                                                          )
                                                        : "0.00"}
                                                </option>
                                            )}
                                        </select>
                                        {!usdcAddress && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                ℹ️ USDC not available on{" "}
                                                {chain?.name}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Amount ({selectedToken})
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={amount}
                                            onChange={(e) =>
                                                setAmount(e.target.value)
                                            }
                                            step={
                                                selectedToken === "USDC"
                                                    ? "0.01"
                                                    : "0.001"
                                            }
                                            min="0"
                                            className="zap-input"
                                        />
                                    </div>
                                    <button
                                        onClick={handleSend}
                                        disabled={
                                            isPending ||
                                            !isConnected ||
                                            !toAddress ||
                                            !amount
                                        }
                                        className="zap-btn"
                                    >
                                        {isPending ? (
                                            <>
                                                <div className="loading-spinner" />
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <SendIcon />
                                                Send
                                            </>
                                        )}
                                    </button>
                                    {txHash && (
                                        <div className="success-message">
                                            Transaction sent! Hash:{" "}
                                            {formatAddress(txHash)}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Toggle */}
                        <div className="text-center mb-6 sm:mb-8 mt-6">
                            <div className="inline-flex items-center gap-3 sm:gap-4 bg-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-full shadow-md">
                                <span
                                    className={`text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                                        !receiveMode
                                            ? "text-purple-600"
                                            : "text-gray-400"
                                    }`}
                                >
                                    Send
                                </span>
                                <button
                                    onClick={() => setReceiveMode(!receiveMode)}
                                    className={`toggle-switch ${
                                        receiveMode ? "active" : ""
                                    }`}
                                >
                                    <div className="toggle-knob" />
                                </button>
                                <span
                                    className={`text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                                        receiveMode
                                            ? "text-purple-600"
                                            : "text-gray-400"
                                    }`}
                                >
                                    Receive
                                </span>
                            </div>
                        </div>
                    </>
                )}

                {/* Footer */}
                <div className="text-center text-xs sm:text-sm text-gray-600 space-y-2">
                    <p className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 max-w-full">
                        <span className="hidden sm:inline">Click</span>
                        <span className="sm:hidden">Tap</span>
                        <span className="font-semibold text-purple-600">
                            balance
                        </span>
                        <span>to toggle USD</span>
                    </p>
                    <p className="text-gray-500">Built with Wagmi + Viem</p>
                </div>
            </div>

            {/* Wallet Details Modal */}
            {showWalletModal && address && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-100"
                    onClick={() => setShowWalletModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-gray-800">
                                Wallet Details
                            </h3>
                            <button
                                onClick={() => setShowWalletModal(false)}
                                className="text-gray-400 hover:text-gray-600 text-2xl"
                            >
                                ×
                            </button>
                        </div>
                        <div className="flex justify-center py-4">
                            <ZapBlockie address={address} size={120} />
                        </div>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">
                                    Address
                                </p>
                                <p className="font-mono text-sm bg-gray-50 p-3 rounded-lg break-all">
                                    {address}
                                </p>
                            </div>
                            {ensName && (
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">
                                        ENS Name
                                    </p>
                                    <p className="font-semibold text-purple-600 text-lg">
                                        {ensName}
                                    </p>
                                </div>
                            )}
                            <div>
                                <p className="text-sm text-gray-600 mb-1">
                                    Network
                                </p>
                                <p className="font-semibold">{chain?.name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 mb-1">
                                    Balance
                                </p>
                                <p className="font-semibold text-lg">
                                    {balance ? formatEther(balance.value) : "0"}{" "}
                                    {balance?.symbol}
                                </p>
                            </div>
                            {connector?.id === "burner" && (
                                <div className="space-y-2">
                                    <button
                                        onClick={() => {
                                            setShowWalletModal(false);
                                            setShowBurnerManager(true);
                                        }}
                                        className="w-full py-3 bg-yellow-50 border-2 border-yellow-300 text-yellow-800 rounded-lg font-semibold hover:bg-yellow-100 transition-all"
                                    >
                                        🔥 Manage Burner Wallets
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="space-y-2 pt-4 border-t">
                            <button
                                onClick={() => {
                                    setShowWalletModal(false);
                                    setTimeout(() => {
                                        setShowConnectModal(true);
                                    }, 100);
                                }}
                                className="w-full py-3 bg-blue-50 border-2 border-blue-300 text-blue-800 rounded-lg font-semibold hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
                            >
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                                    />
                                </svg>
                                Switch Wallet Type
                            </button>
                            <button
                                onClick={() => setShowWalletModal(false)}
                                className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Burner Wallet Manager Modal */}
            {showBurnerManager && connector?.id === "burner" && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-100"
                    onClick={() => setShowBurnerManager(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between sticky top-0 bg-white pb-4 border-b">
                            <h3 className="text-2xl font-bold text-gray-800">
                                🔥 Burner Wallets
                            </h3>
                            <button
                                onClick={() => setShowBurnerManager(false)}
                                className="text-gray-400 hover:text-gray-600 text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        {/* Create New Burner Button */}
                        <button
                            onClick={handleCreateNewBurner}
                            className="w-full py-3 px-4 bg-linear-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                            <span className="text-xl">+</span>
                            Create New Burner Wallet
                        </button>

                        {/* List of Burner Wallets */}
                        <div className="space-y-3 mt-4">
                            {burnerWallets.map((wallet, index) => (
                                <div
                                    key={index}
                                    className={`p-4 rounded-lg border-2 transition-all ${
                                        index === activeWalletIndex
                                            ? "border-purple-500 bg-purple-50"
                                            : "border-gray-200 bg-gray-50"
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <ZapBlockie
                                                    address={wallet.address}
                                                    size={40}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-gray-800">
                                                        {wallet.name}
                                                    </h4>
                                                    <p className="text-xs text-gray-500">
                                                        {formatAddress(
                                                            wallet.address
                                                        )}
                                                    </p>
                                                </div>
                                                {index ===
                                                    activeWalletIndex && (
                                                    <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded-full">
                                                        Active
                                                    </span>
                                                )}
                                            </div>

                                            {/* Private Key Section */}
                                            <div className="mt-3 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs text-gray-600 font-semibold">
                                                        Private Key:
                                                    </p>
                                                    <button
                                                        onClick={() =>
                                                            toggleRevealKey(
                                                                index
                                                            )
                                                        }
                                                        className="text-xs text-purple-600 hover:text-purple-700 font-semibold underline"
                                                    >
                                                        {revealedKeys.has(index)
                                                            ? "🔒 Hide"
                                                            : "👁️ Reveal"}
                                                    </button>
                                                </div>
                                                {revealedKeys.has(index) ? (
                                                    <>
                                                        <div className="flex gap-2">
                                                            <p className="flex-1 font-mono text-xs bg-white p-2 rounded border border-gray-300 break-all">
                                                                {
                                                                    wallet.privateKey
                                                                }
                                                            </p>
                                                            <button
                                                                onClick={() =>
                                                                    handleCopyPrivateKey(
                                                                        wallet.privateKey
                                                                    )
                                                                }
                                                                className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-all text-xs font-semibold whitespace-nowrap"
                                                            >
                                                                {copySuccess
                                                                    ? "✓ Copied!"
                                                                    : "📋 Copy"}
                                                            </button>
                                                        </div>
                                                        <p className="text-xs text-red-600">
                                                            ⚠️ Never share your
                                                            private key!
                                                        </p>
                                                    </>
                                                ) : (
                                                    <p className="text-xs text-gray-500 italic bg-gray-100 p-2 rounded">
                                                        Click "Reveal" to view
                                                        private key
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2 mt-3">
                                        {index !== activeWalletIndex && (
                                            <button
                                                onClick={() =>
                                                    handleSwitchBurner(index)
                                                }
                                                className="flex-1 py-2 px-4 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-all text-sm"
                                            >
                                                Switch to This
                                            </button>
                                        )}
                                        {burnerWallets.length > 1 && (
                                            <button
                                                onClick={() =>
                                                    handleDeleteBurner(index)
                                                }
                                                className="py-2 px-4 bg-red-100 text-red-600 rounded-lg font-semibold hover:bg-red-200 transition-all text-sm"
                                            >
                                                🗑️ Delete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => setShowBurnerManager(false)}
                            className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all mt-4"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Connect Wallet Modal */}
            {showConnectModal && mounted && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-100"
                    onClick={() => setShowConnectModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-4 border-b">
                            <h3 className="text-2xl font-bold text-gray-800">
                                Connect Wallet
                            </h3>
                            <button
                                onClick={() => setShowConnectModal(false)}
                                className="text-gray-400 hover:text-gray-600 text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        <p className="text-sm text-gray-600">
                            Choose how you'd like to connect:
                        </p>

                        <div className="space-y-3">
                            {connectors.map((conn) => (
                                <button
                                    key={conn.id}
                                    onClick={async () => {
                                        if (isConnected) {
                                            await disconnect();
                                        }
                                        setTimeout(async () => {
                                            await connect({
                                                connector: conn,
                                            });
                                            setShowConnectModal(false);
                                        }, 100);
                                    }}
                                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-purple-50 border-2 border-gray-200 hover:border-purple-500 rounded-lg transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        {conn.id === "burner" && (
                                            <span className="text-2xl">🔥</span>
                                        )}
                                        {conn.id === "injected" && (
                                            <span className="text-2xl">🦊</span>
                                        )}
                                        {conn.id === "walletConnect" && (
                                            <span className="text-2xl">🔗</span>
                                        )}
                                        <div className="text-left">
                                            <p className="font-semibold text-gray-800">
                                                {conn.id === "burner"
                                                    ? "Burner Wallet"
                                                    : conn.id === "injected"
                                                    ? "MetaMask"
                                                    : conn.id ===
                                                      "walletConnect"
                                                    ? "WalletConnect"
                                                    : conn.name}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {conn.id === "burner"
                                                    ? "Quick temporary wallet"
                                                    : conn.id === "injected"
                                                    ? "Connect with browser extension"
                                                    : conn.id ===
                                                      "walletConnect"
                                                    ? "Scan with mobile wallet"
                                                    : "Connect wallet"}
                                            </p>
                                        </div>
                                    </div>
                                    <svg
                                        className="w-5 h-5 text-gray-400 group-hover:text-purple-600"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 5l7 7-7 7"
                                        />
                                    </svg>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setShowConnectModal(false)}
                            className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all mt-4"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* QR Scanner Modal */}
            {showQrScanner && mounted && (
                <div
                    className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-100"
                    onClick={() => setShowQrScanner(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-4 border-b">
                            <h3 className="text-2xl font-bold text-gray-800">
                                Scan QR Code
                            </h3>
                            <button
                                onClick={() => setShowQrScanner(false)}
                                className="text-gray-400 hover:text-gray-600 text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        <p className="text-sm text-gray-600">
                            Position the QR code within the frame to scan
                        </p>

                        <QrScanner
                            onScan={(result) => {
                                // Extract address from various QR formats
                                let address = result;

                                // Handle ethereum: URIs
                                if (result.startsWith("ethereum:")) {
                                    address = result
                                        .replace("ethereum:", "")
                                        .split("?")[0];
                                }

                                setToAddress(address);
                                setShowQrScanner(false);
                            }}
                            onError={(error) => {
                                console.debug("QR Scanner error:", error);
                            }}
                        />

                        <button
                            onClick={() => setShowQrScanner(false)}
                            className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
