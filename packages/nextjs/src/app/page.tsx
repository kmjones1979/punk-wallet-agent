"use client";

import { useState, useRef, useEffect } from "react";
import { useChat, Message } from "ai/react";
import {
    useAccount,
    useSendTransaction,
    useWaitForTransactionReceipt,
    useSwitchChain,
    useConnect,
} from "wagmi";
import { parseEther, parseUnits, encodeFunctionData } from "viem";
import QRCode from "qrcode.react";
import ZapBlockie from "../components/ZapBlockie";
import QrScanner from "../components/QrScanner";

const AgentIcon = () => (
    <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
    </svg>
);

const WalletIcon = () => (
    <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
        />
    </svg>
);

export default function AgentPage() {
    const { address, isConnected, chain } = useAccount();
    const { connectors, connect } = useConnect();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);
    const [pendingTx, setPendingTx] = useState<any>(null);
    const [showTxModal, setShowTxModal] = useState(false);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [showQrScanner, setShowQrScanner] = useState(false);
    const [paymentRequest, setPaymentRequest] = useState<any>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [copiedAddress, setCopiedAddress] = useState(false);
    const {
        sendTransaction,
        data: txHash,
        isPending: isSending,
    } = useSendTransaction();
    const { isLoading: isConfirming, isSuccess: isConfirmed } =
        useWaitForTransactionReceipt({
            hash: txHash,
        });
    const { switchChain, isPending: isSwitching } = useSwitchChain();

    const {
        messages,
        input,
        handleInputChange,
        handleSubmit,
        isLoading,
        error,
    } = useChat({
        api: "/api/agent",
        body: {
            walletAddress: address,
        },
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        // Check for transaction preparation in messages
        messages.forEach((msg: Message) => {
            if (msg.role === "assistant" && msg.toolInvocations) {
                msg.toolInvocations.forEach((tool: any) => {
                    if (
                        tool.toolName === "prepareTransaction" &&
                        tool.state === "result" &&
                        tool.result?.needsApproval
                    ) {
                        setPendingTx(tool.result.transaction);
                        setShowTxModal(true);
                    }
                });
            }
        });
    }, [messages]);

    // Parse EIP-681 payment request URI
    const parsePaymentRequest = (uri: string) => {
        try {
            // Handle ethereum: scheme (EIP-681)
            if (uri.startsWith("ethereum:")) {
                const withoutScheme = uri.substring(9); // Remove "ethereum:"

                // Parse address and optional chain ID
                const [addressPart, paramsPart] = withoutScheme.split("?");
                const [targetAddress, chainIdStr] = addressPart.split("@");

                // Parse query parameters
                const params = new URLSearchParams(paramsPart || "");

                const request: any = {
                    to: targetAddress,
                    chainId: chainIdStr ? parseInt(chainIdStr) : chain?.id || 1,
                    description: params.get("label") || "Payment Request",
                };

                // Check if it's an ETH transfer or token transfer
                if (params.has("value")) {
                    // ETH transfer
                    request.type = "eth";
                    request.value = params.get("value"); // In wei
                    request.amount = parseFloat(request.value) / 1e18; // Convert to ETH
                } else if (params.has("uint256")) {
                    // ERC20 transfer
                    request.type = "erc20";
                    const amount = params.get("uint256");
                    const decimals = parseInt(params.get("decimals") || "18");
                    request.tokenAmount = amount;
                    request.decimals = decimals;
                    request.amount =
                        parseFloat(amount!) / Math.pow(10, decimals);
                    request.tokenSymbol = params.get("symbol") || "TOKEN";

                    // Get recipient from function call
                    const functionName = addressPart.split("/")[1];
                    if (functionName === "transfer") {
                        request.recipient = params.get("address");
                    }
                }

                return request;
            }

            // Handle plain addresses or ENS names
            if (uri.startsWith("0x") || uri.endsWith(".eth")) {
                return {
                    to: uri,
                    type: "eth",
                    description: "Send to Address",
                };
            }

            return null;
        } catch (error) {
            console.error("Failed to parse payment request:", error);
            return null;
        }
    };

    const handleQrScan = (scannedData: string) => {
        console.log("🔍 Scanned QR code:", scannedData);

        const request = parsePaymentRequest(scannedData);
        if (request) {
            console.log("💰 Parsed payment request:", request);
            setPaymentRequest(request);
            setShowQrScanner(false);
            setShowPaymentModal(true);
        } else {
            alert("Invalid payment QR code format");
            setShowQrScanner(false);
        }
    };

    const handleApprovePayment = async () => {
        if (!paymentRequest) return;

        try {
            // Switch chain if needed
            if (
                paymentRequest.chainId &&
                chain?.id !== paymentRequest.chainId
            ) {
                await switchChain({ chainId: paymentRequest.chainId });
                await new Promise((resolve) => setTimeout(resolve, 500));
            }

            if (paymentRequest.type === "eth") {
                // Send ETH
                sendTransaction(
                    {
                        to: paymentRequest.to as `0x${string}`,
                        value: paymentRequest.value
                            ? BigInt(paymentRequest.value)
                            : parseEther(String(paymentRequest.amount || 0)),
                        chainId: paymentRequest.chainId,
                    },
                    {
                        onSuccess: (hash) => {
                            console.log("Payment sent successfully!", hash);
                            setShowPaymentModal(false);
                            setPaymentRequest(null);
                        },
                        onError: (error) => {
                            console.error("Payment failed:", error);
                            alert(`Payment failed: ${error.message}`);
                        },
                    }
                );
            } else if (paymentRequest.type === "erc20") {
                // Send ERC20 token
                const ERC20_ABI = [
                    {
                        name: "transfer",
                        type: "function",
                        inputs: [
                            { name: "recipient", type: "address" },
                            { name: "amount", type: "uint256" },
                        ],
                        outputs: [{ name: "", type: "bool" }],
                    },
                ];

                const data = encodeFunctionData({
                    abi: ERC20_ABI,
                    functionName: "transfer",
                    args: [
                        paymentRequest.recipient as `0x${string}`,
                        BigInt(paymentRequest.tokenAmount),
                    ],
                });

                sendTransaction(
                    {
                        to: paymentRequest.to as `0x${string}`,
                        data: data as `0x${string}`,
                        chainId: paymentRequest.chainId,
                    },
                    {
                        onSuccess: (hash) => {
                            console.log(
                                "Token payment sent successfully!",
                                hash
                            );
                            setShowPaymentModal(false);
                            setPaymentRequest(null);
                        },
                        onError: (error) => {
                            console.error("Token payment failed:", error);
                            alert(`Token payment failed: ${error.message}`);
                        },
                    }
                );
            }
        } catch (error: any) {
            console.error("Payment error:", error);
            alert(`Error: ${error.message}`);
        }
    };

    const handleApproveTx = async () => {
        if (!pendingTx) return;

        console.log("Approve button clicked, pendingTx:", pendingTx);

        try {
            // Get the chain ID based on the chain name
            const getChainId = (chainName: string) => {
                switch (chainName?.toLowerCase()) {
                    case "base":
                        return 8453; // Base mainnet
                    case "mainnet":
                    case "ethereum":
                    default:
                        return 1; // Ethereum mainnet
                }
            };

            const targetChainId = getChainId(pendingTx.chain);

            // Check if we need to switch chains
            if (chain?.id !== targetChainId) {
                console.log(
                    `Switching from chain ${chain?.id} to ${targetChainId}...`
                );
                await switchChain({ chainId: targetChainId });
                // Wait a bit for chain to switch
                await new Promise((resolve) => setTimeout(resolve, 500));
            }

            console.log("Sending transaction with params:", {
                to: pendingTx.to,
                value: pendingTx.value,
                data: pendingTx.data,
                chainId: targetChainId,
            });

            sendTransaction(
                {
                    to: pendingTx.to as `0x${string}`,
                    value: pendingTx.value
                        ? parseEther(pendingTx.value)
                        : BigInt(0),
                    data: pendingTx.data as `0x${string}` | undefined,
                    chainId: targetChainId,
                },
                {
                    onSuccess: (hash) => {
                        console.log("Transaction sent successfully!", hash);
                        setShowTxModal(false);
                    },
                    onError: (error) => {
                        console.error("Transaction failed:", error);
                        alert(`Transaction failed: ${error.message}`);
                    },
                }
            );
        } catch (error: any) {
            console.error("Transaction error:", error);
            alert(`Error: ${error.message}`);
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-purple-50 via-blue-50 to-pink-50">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-2 bg-linear-to-r from-purple-600 to-blue-600 rounded-lg">
                            <AgentIcon />
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-xl sm:text-2xl font-bold bg-linear-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                                Zap
                            </h1>
                            <span className="text-xs sm:text-sm text-gray-600">
                                AI-Powered Crypto Wallet
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {mounted && isConnected && (
                            <button
                                onClick={() => setShowQrScanner(true)}
                                className="p-2 sm:p-2.5 bg-white border-2 border-gray-200 rounded-lg hover:border-purple-500 transition-all"
                                title="Scan Payment QR"
                            >
                                <svg
                                    className="w-6 h-6"
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
                        )}
                        <a
                            href="/wallet"
                            className="p-2 sm:p-2.5 bg-white border-2 border-gray-200 rounded-lg hover:border-purple-500 transition-all"
                            title="Send & Receive"
                        >
                            <WalletIcon />
                        </a>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-6">
                {/* Wallet Status - Connected */}
                {mounted && isConnected && address && (
                    <div
                        onClick={() => setShowAddressModal(true)}
                        className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:border-purple-300 hover:shadow-md transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <ZapBlockie address={address} size={40} />
                            <div>
                                <p className="text-xs text-gray-600">
                                    Connected Wallet
                                </p>
                                <p className="font-mono text-sm text-gray-800">
                                    {address.substring(0, 6)}...
                                    {address.substring(address.length - 4)}
                                </p>
                            </div>
                            <svg
                                className="w-5 h-5 ml-auto text-gray-400"
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
                        </div>
                    </div>
                )}

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
                                    className="w-full p-4 bg-linear-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg font-semibold text-gray-800 hover:border-purple-400 hover:shadow-md transition-all flex items-center justify-between"
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

                {/* Welcome Message */}
                {messages.length === 0 && (
                    <div className="mb-6 text-center">
                        <div className="inline-flex p-4 bg-linear-to-r from-purple-100 to-blue-100 rounded-full mb-4">
                            <AgentIcon />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">
                            Welcome to Zap Agent
                        </h2>
                        <p className="text-gray-600 mb-4">
                            Your AI-powered crypto assistant
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto text-left">
                            <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                                <p className="font-semibold text-sm mb-1">
                                    💸 Send Transactions
                                </p>
                                <p className="text-xs text-gray-600">
                                    "Send 0.01 ETH to vitalik.eth"
                                </p>
                            </div>
                            <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                                <p className="font-semibold text-sm mb-1">
                                    💰 Check Balances
                                </p>
                                <p className="text-xs text-gray-600">
                                    "What's my ETH balance?"
                                </p>
                            </div>
                            <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                                <p className="font-semibold text-sm mb-1">
                                    📊 Get Token Info
                                </p>
                                <p className="text-xs text-gray-600">
                                    "Tell me about USDC"
                                </p>
                            </div>
                            <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                                <p className="font-semibold text-sm mb-1">
                                    🔍 Transaction History
                                </p>
                                <p className="text-xs text-gray-600">
                                    "Show my recent transactions"
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Chat Messages */}
                <div className="mb-24">
                    {messages.map((message: Message) => (
                        <div
                            key={message.id}
                            className={`mb-4 flex ${
                                message.role === "user"
                                    ? "justify-end"
                                    : "justify-start"
                            }`}
                        >
                            <div
                                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                                    message.role === "user"
                                        ? "bg-linear-to-r from-purple-600 to-blue-600 text-white"
                                        : "bg-white shadow-sm border border-gray-200 text-gray-800"
                                }`}
                            >
                                <p className="whitespace-pre-wrap wrap-break-word">
                                    {message.content}
                                </p>
                                {message.role === "assistant" &&
                                    message.toolInvocations &&
                                    message.toolInvocations.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {message.toolInvocations.map(
                                                (tool: any) => (
                                                    <span
                                                        key={tool.toolCallId}
                                                        className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200"
                                                        title={
                                                            tool.state ===
                                                            "result"
                                                                ? "Completed"
                                                                : "Running..."
                                                        }
                                                    >
                                                        {tool.state ===
                                                        "result" ? (
                                                            <span className="text-green-600">
                                                                ✓
                                                            </span>
                                                        ) : (
                                                            <span className="animate-spin">
                                                                ⏳
                                                            </span>
                                                        )}
                                                        {tool.toolName}
                                                    </span>
                                                )
                                            )}
                                        </div>
                                    )}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start mb-4">
                            <div className="bg-white shadow-sm border border-gray-200 rounded-2xl px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <div className="loading-spinner" />
                                    <span className="text-gray-600 text-sm">
                                        Thinking...
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Form */}
                <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-200 p-4">
                    <div className="max-w-4xl mx-auto">
                        <form onSubmit={handleSubmit} className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={handleInputChange}
                                placeholder={
                                    mounted && isConnected
                                        ? "Ask me anything about crypto..."
                                        : "Connect your wallet to start..."
                                }
                                disabled={!isConnected || isLoading}
                                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <button
                                type="submit"
                                disabled={!isConnected || isLoading || !input}
                                className="px-6 py-3 bg-linear-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Send
                            </button>
                        </form>
                        {!isConnected && (
                            <p className="text-xs text-red-600 mt-2 text-center">
                                ⚠️ Please connect your wallet to use the AI
                                agent
                            </p>
                        )}
                        {error && (
                            <p className="text-xs text-red-600 mt-2 text-center">
                                ❌ Error: {error.message}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Transaction Confirmation Modal */}
            {showTxModal && pendingTx && mounted && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-100"
                    onClick={() => setShowTxModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-4 border-b">
                            <h3 className="text-2xl font-bold text-gray-800">
                                🔐 Approve Transaction
                            </h3>
                            <button
                                onClick={() => setShowTxModal(false)}
                                className="text-gray-400 hover:text-gray-600 text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3">
                                <p className="text-sm text-yellow-800">
                                    ⚠️ <strong>Review carefully!</strong> This
                                    transaction will interact with the
                                    blockchain and cannot be reversed.
                                </p>
                            </div>

                            {pendingTx.chain &&
                                pendingTx.chain.toLowerCase() !== "mainnet" && (
                                    <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3">
                                        <p className="text-sm text-blue-800">
                                            ℹ️{" "}
                                            <strong>Network Required:</strong>{" "}
                                            Make sure your wallet is connected
                                            to{" "}
                                            <span className="font-bold capitalize">
                                                {pendingTx.chain}
                                            </span>
                                            . Your wallet will prompt you to
                                            switch networks if needed.
                                        </p>
                                    </div>
                                )}

                            <div>
                                <p className="text-sm text-gray-600 mb-1">
                                    Type
                                </p>
                                <p className="font-semibold text-lg">
                                    {pendingTx.type === "token"
                                        ? "🪙 Token Transfer"
                                        : "💎 ETH Transfer"}
                                </p>
                            </div>

                            <div>
                                <p className="text-sm text-gray-600 mb-1">
                                    Chain
                                </p>
                                <p className="font-semibold text-lg capitalize">
                                    {pendingTx.chain || "mainnet"}
                                </p>
                            </div>

                            <div>
                                <p className="text-sm text-gray-600 mb-1">
                                    {pendingTx.type === "token"
                                        ? "Recipient"
                                        : "To"}
                                </p>
                                <p className="font-mono text-sm bg-gray-50 p-3 rounded-lg break-all">
                                    {pendingTx.type === "token"
                                        ? pendingTx.recipient
                                        : pendingTx.to}
                                </p>
                            </div>

                            {pendingTx.type === "token" &&
                                pendingTx.tokenAmount && (
                                    <>
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">
                                                Amount
                                            </p>
                                            <p className="font-semibold text-lg">
                                                {pendingTx.tokenAmount}{" "}
                                                {pendingTx.tokenSymbol ||
                                                    "TOKEN"}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">
                                                Token Contract
                                            </p>
                                            <p className="font-mono text-xs bg-gray-50 p-2 rounded-lg break-all">
                                                {pendingTx.to}
                                            </p>
                                        </div>
                                    </>
                                )}

                            {pendingTx.value && pendingTx.value !== "0" && (
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">
                                        Amount
                                    </p>
                                    <p className="font-semibold text-lg">
                                        {pendingTx.value} ETH
                                    </p>
                                </div>
                            )}

                            {txHash && (
                                <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3">
                                    <p className="text-sm text-green-800 mb-1">
                                        ✅ Transaction Submitted!
                                    </p>
                                    <p className="font-mono text-xs break-all">
                                        {txHash}
                                    </p>
                                    {isConfirming && (
                                        <p className="text-xs text-green-700 mt-2">
                                            ⏳ Waiting for confirmation...
                                        </p>
                                    )}
                                    {isConfirmed && (
                                        <p className="text-xs text-green-700 mt-2">
                                            🎉 Transaction confirmed!
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {!txHash && (
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setShowTxModal(false)}
                                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleApproveTx}
                                    disabled={isSending || isSwitching}
                                    className="flex-1 py-3 bg-linear-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                                >
                                    {isSwitching
                                        ? "Switching Network..."
                                        : isSending
                                        ? "Signing..."
                                        : "Approve & Sign"}
                                </button>
                            </div>
                        )}

                        {txHash && (
                            <button
                                onClick={() => {
                                    setShowTxModal(false);
                                    setPendingTx(null);
                                }}
                                className="w-full py-3 bg-linear-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                            >
                                Close
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Address QR Code Modal */}
            {showAddressModal && address && mounted && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-100"
                    onClick={() => setShowAddressModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-4 border-b">
                            <h3 className="text-2xl font-bold text-gray-800">
                                💳 Your Wallet
                            </h3>
                            <button
                                onClick={() => setShowAddressModal(false)}
                                className="text-gray-400 hover:text-gray-600 text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        <div className="flex flex-col items-center space-y-4">
                            {/* QR Code */}
                            <div className="bg-white p-4 rounded-xl border-2 border-gray-200">
                                <QRCode
                                    value={address}
                                    size={200}
                                    level="H"
                                    includeMargin={true}
                                />
                            </div>

                            {/* Address */}
                            <div className="w-full">
                                <p className="text-sm text-gray-600 mb-2 text-center">
                                    Wallet Address
                                </p>
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <p className="font-mono text-sm text-gray-800 break-all text-center">
                                        {address}
                                    </p>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="w-full space-y-2">
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(address);
                                        setCopiedAddress(true);
                                        setTimeout(
                                            () => setCopiedAddress(false),
                                            2000
                                        );
                                    }}
                                    className={`w-full py-3 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2 ${
                                        copiedAddress
                                            ? "bg-green-500 text-white"
                                            : "bg-linear-to-r from-purple-600 to-blue-600 text-white"
                                    }`}
                                >
                                    {copiedAddress ? (
                                        <>
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
                                                    d="M5 13l4 4L19 7"
                                                />
                                            </svg>
                                            Copied!
                                        </>
                                    ) : (
                                        <>
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
                                                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                                />
                                            </svg>
                                            Copy Address
                                        </>
                                    )}
                                </button>
                                <a
                                    href="/wallet"
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
                                    Switch / Manage Wallets
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* QR Scanner for Payment Requests */}
            {showQrScanner && mounted && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-100">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center justify-between pb-4 border-b">
                            <h3 className="text-2xl font-bold text-gray-800">
                                📷 Scan Payment QR
                            </h3>
                            <button
                                onClick={() => setShowQrScanner(false)}
                                className="text-gray-400 hover:text-gray-600 text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        <p className="text-sm text-gray-600 text-center">
                            Scan a QR code from a merchant or payment terminal
                        </p>

                        <QrScanner
                            onScan={handleQrScan}
                            onError={(error) => {
                                console.error("QR Scanner error:", error);
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

            {/* Payment Confirmation Modal */}
            {showPaymentModal && paymentRequest && mounted && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-100"
                    onClick={() => setShowPaymentModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-4 border-b">
                            <h3 className="text-2xl font-bold text-gray-800">
                                💳 Confirm Payment
                            </h3>
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                className="text-gray-400 hover:text-gray-600 text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                                <p className="text-sm text-blue-800">
                                    📋{" "}
                                    <strong>
                                        {paymentRequest.description}
                                    </strong>
                                </p>
                            </div>

                            <div>
                                <p className="text-sm text-gray-600 mb-1">
                                    Pay To
                                </p>
                                <p className="font-mono text-sm bg-gray-50 p-3 rounded-lg break-all">
                                    {paymentRequest.type === "erc20"
                                        ? paymentRequest.recipient
                                        : paymentRequest.to}
                                </p>
                            </div>

                            <div>
                                <p className="text-sm text-gray-600 mb-1">
                                    Amount
                                </p>
                                <p className="font-semibold text-2xl text-purple-600">
                                    {paymentRequest.amount}{" "}
                                    {paymentRequest.type === "eth"
                                        ? "ETH"
                                        : paymentRequest.tokenSymbol}
                                </p>
                            </div>

                            {paymentRequest.type === "erc20" && (
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">
                                        Token Contract
                                    </p>
                                    <p className="font-mono text-xs bg-gray-50 p-2 rounded-lg break-all">
                                        {paymentRequest.to}
                                    </p>
                                </div>
                            )}

                            {paymentRequest.chainId &&
                                paymentRequest.chainId !== chain?.id && (
                                    <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3">
                                        <p className="text-sm text-yellow-800">
                                            ⚠️ This payment requires network:{" "}
                                            <strong>
                                                Chain ID{" "}
                                                {paymentRequest.chainId}
                                            </strong>
                                        </p>
                                    </div>
                                )}
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => {
                                    setShowPaymentModal(false);
                                    setPaymentRequest(null);
                                }}
                                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleApprovePayment}
                                disabled={isSending || isSwitching}
                                className="flex-1 py-3 bg-linear-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                            >
                                {isSwitching
                                    ? "Switching Network..."
                                    : isSending
                                    ? "Paying..."
                                    : "Approve & Pay"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
