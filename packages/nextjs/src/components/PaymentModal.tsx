"use client";

import { useState, useEffect } from "react";
import {
    useAccount,
    useSendTransaction,
    useWaitForTransactionReceipt,
    useSwitchChain,
} from "wagmi";
import { encodeFunctionData, parseUnits } from "viem";
import QRCode from "qrcode.react";

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPaymentComplete: () => void;
    serviceId: string;
    serviceName?: string;
    priceUSDC: string;
}

const ERC20_ABI = [
    {
        name: "transfer",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
            { name: "to", type: "address" },
            { name: "amount", type: "uint256" },
        ],
        outputs: [{ name: "", type: "bool" }],
    },
] as const;

export default function PaymentModal({
    isOpen,
    onClose,
    onPaymentComplete,
    serviceId,
    serviceName = "AI Agent Access",
    priceUSDC,
}: PaymentModalProps) {
    const { address, chain: currentChain } = useAccount();
    const [paymentRequest, setPaymentRequest] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedChainId, setSelectedChainId] = useState(
        process.env.NODE_ENV === "development" ? 84532 : 8453 // Base Sepolia for dev, Base for prod
    );
    const [txHash, setTxHash] = useState<string | null>(null);

    const {
        sendTransaction,
        isPending,
        isError: isSendError,
    } = useSendTransaction();
    const { switchChain, isPending: isSwitching } = useSwitchChain();

    const { isLoading: isConfirming, isSuccess: isConfirmed } =
        useWaitForTransactionReceipt({
            hash: txHash as `0x${string}` | undefined,
        });

    // Load payment request
    useEffect(() => {
        if (isOpen && address) {
            loadPaymentRequest();
        }
    }, [isOpen, address, selectedChainId]);

    // When transaction is confirmed, verify payment
    useEffect(() => {
        if (isConfirmed && txHash) {
            verifyPayment();
        }
    }, [isConfirmed, txHash]);

    const loadPaymentRequest = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/payment/request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    serviceId,
                    chainId: selectedChainId,
                    userAddress: address,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to load payment request");
            }

            setPaymentRequest(data.payment);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePay = async () => {
        if (!paymentRequest || !address) return;

        setError(null);

        try {
            // Switch chain if needed
            if (currentChain?.id !== selectedChainId) {
                await switchChain({ chainId: selectedChainId });
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }

            // Encode transfer function
            const data = encodeFunctionData({
                abi: ERC20_ABI,
                functionName: "transfer",
                args: [
                    paymentRequest.paymentReceiverAddress,
                    BigInt(paymentRequest.amountInBaseUnits),
                ],
            });

            // Send transaction
            sendTransaction(
                {
                    to: paymentRequest.usdcAddress as `0x${string}`,
                    data,
                    chainId: selectedChainId,
                },
                {
                    onSuccess: (hash) => {
                        setTxHash(hash);
                    },
                    onError: (error) => {
                        setError(error.message);
                    },
                }
            );
        } catch (err: any) {
            setError(err.message);
        }
    };

    const verifyPayment = async () => {
        if (!txHash || !address) return;

        try {
            const response = await fetch("/api/payment/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    serviceId,
                    txHash,
                    userAddress: address,
                    chainId: selectedChainId,
                }),
            });

            const data = await response.json();

            if (response.ok && data.verified) {
                onPaymentComplete();
                onClose();
            } else {
                setError(data.error || "Payment verification failed");
            }
        } catch (err: any) {
            setError(err.message);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">
                        ⚡ Payment Required
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                    >
                        ×
                    </button>
                </div>

                {/* Content */}
                <div className="space-y-4">
                    <p className="text-gray-600">
                        To access <strong>{serviceName}</strong>, please
                        complete a one-time payment.
                    </p>

                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-700 font-medium">
                                Price:
                            </span>
                            <span className="text-2xl font-bold text-purple-600">
                                {priceUSDC} USDC
                            </span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                            <span className="text-gray-700 font-medium">
                                Payment Type:
                            </span>
                            <span className="text-gray-900">Per message</span>
                        </div>
                    </div>

                    {/* Chain Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Payment Chain:
                        </label>
                        <select
                            value={selectedChainId}
                            onChange={(e) =>
                                setSelectedChainId(Number(e.target.value))
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            disabled={isPending || isConfirming}
                        >
                            <option value={8453}>Base</option>
                            <option value={84532}>
                                Base Sepolia (Testnet)
                            </option>
                            <option value={1}>Ethereum</option>
                            <option value={137}>Polygon</option>
                            <option value={42161}>Arbitrum</option>
                            <option value={10}>Optimism</option>
                        </select>
                    </div>

                    {/* QR Code */}
                    {paymentRequest && (
                        <div className="flex flex-col items-center p-4 bg-white border-2 border-gray-200 rounded-lg">
                            <p className="text-sm text-gray-600 mb-2">
                                Scan with mobile wallet:
                            </p>
                            <QRCode
                                value={paymentRequest.paymentURI}
                                size={180}
                            />
                        </div>
                    )}

                    {/* Error Display */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    {/* Transaction Status */}
                    {txHash && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-600">
                                {isConfirming
                                    ? "⏳ Confirming payment..."
                                    : "✅ Payment confirmed!"}
                            </p>
                        </div>
                    )}

                    {/* Pay Button */}
                    <button
                        onClick={handlePay}
                        disabled={
                            isPending ||
                            isConfirming ||
                            isSwitching ||
                            isLoading ||
                            !address
                        }
                        className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSwitching
                            ? "Switching Chain..."
                            : isPending
                            ? "Sending Payment..."
                            : isConfirming
                            ? "Confirming..."
                            : `Pay ${priceUSDC} USDC`}
                    </button>

                    <p className="text-xs text-gray-500 text-center">
                        Your payment is processed on-chain and verified
                        automatically.
                    </p>
                </div>
            </div>
        </div>
    );
}
