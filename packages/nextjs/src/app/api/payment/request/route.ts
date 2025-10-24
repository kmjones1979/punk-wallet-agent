import { NextRequest, NextResponse } from "next/server";
import { createX402PaymentRequest } from "../../../../config/x402";

/**
 * POST /api/payment/request
 *
 * Generate a payment request using x402 facilitator
 *
 * Body:
 * - serviceId: string (e.g., "ai-agent")
 * - chainId: number (e.g., 8453 for Base)
 * - userAddress: string (0x... address)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { serviceId, chainId, userAddress } = body;

        // Validate inputs
        if (!serviceId || !userAddress) {
            return NextResponse.json(
                {
                    error: "Missing required fields: serviceId, userAddress",
                },
                { status: 400 }
            );
        }

        // Create payment request using x402 facilitator
        const paymentRequest = await createX402PaymentRequest(
            serviceId,
            userAddress,
            chainId
        );

        return NextResponse.json({
            success: true,
            payment: paymentRequest,
        });
    } catch (error: any) {
        console.error("Payment request error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
