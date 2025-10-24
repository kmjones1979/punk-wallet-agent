import { NextRequest, NextResponse } from "next/server";
import {
    verifyX402Payment,
    checkX402PaymentStatus,
    setCachedPaymentStatus,
} from "../../../../config/x402";

/**
 * POST /api/payment/verify
 *
 * Verify a payment transaction using x402 facilitator
 *
 * Body:
 * - serviceId: string (e.g., "ai-agent")
 * - txHash: string (transaction hash)
 * - userAddress: string (0x... address)
 * - chainId: number
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { serviceId, txHash, userAddress, chainId } = body;

        // Validate inputs
        if (!serviceId || !txHash || !userAddress || !chainId) {
            return NextResponse.json(
                {
                    error: "Missing required fields: serviceId, txHash, userAddress, chainId",
                },
                { status: 400 }
            );
        }

        // Verify payment using x402 facilitator
        const result = await verifyX402Payment(
            serviceId,
            txHash,
            userAddress,
            chainId
        );

        if (!result.verified) {
            return NextResponse.json(
                {
                    success: false,
                    verified: false,
                    error: result.error || "Payment verification failed",
                },
                { status: 400 }
            );
        }

        // Cache the successful payment
        if (result.expiresAt) {
            setCachedPaymentStatus(
                userAddress,
                serviceId,
                true,
                result.expiresAt
            );
        }

        return NextResponse.json({
            success: true,
            verified: true,
            expiresAt: result.expiresAt,
            message: "Payment verified successfully",
        });
    } catch (error: any) {
        console.error("Payment verification error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/payment/verify?userAddress=0x...&serviceId=ai-agent
 *
 * Check if user has valid payment using x402 facilitator
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const userAddress = searchParams.get("userAddress");
        const serviceId = searchParams.get("serviceId");

        if (!userAddress || !serviceId) {
            return NextResponse.json(
                { error: "Missing userAddress or serviceId" },
                { status: 400 }
            );
        }

        // Check payment status with facilitator
        const status = await checkX402PaymentStatus(serviceId, userAddress);

        if (!status.valid) {
            return NextResponse.json({
                valid: false,
                message: "No valid payment found",
            });
        }

        // Cache the status
        if (status.expiresAt) {
            setCachedPaymentStatus(
                userAddress,
                serviceId,
                true,
                status.expiresAt
            );
        }

        return NextResponse.json({
            valid: true,
            expiresAt: status.expiresAt,
            timeRemaining: status.expiresAt
                ? Math.max(0, status.expiresAt - Date.now())
                : 0,
        });
    } catch (error: any) {
        console.error("Payment check error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
