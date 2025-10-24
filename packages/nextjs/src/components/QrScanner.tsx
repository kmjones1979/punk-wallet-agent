"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface QrScannerProps {
    onScan: (result: string) => void;
    onError?: (error: string) => void;
}

export default function QrScanner({ onScan, onError }: QrScannerProps) {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const mountedRef = useRef(true);
    const startedRef = useRef(false);

    useEffect(() => {
        // Prevent double initialization in React Strict Mode
        if (startedRef.current) return;
        startedRef.current = true;
        mountedRef.current = true;

        const startScanner = async () => {
            try {
                // Ensure any existing scanner is cleaned up first
                const existingScanner = Html5Qrcode.getCameras();

                const scanner = new Html5Qrcode("qr-reader");
                scannerRef.current = scanner;

                await scanner.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                    },
                    (decodedText) => {
                        if (mountedRef.current && scannerRef.current) {
                            onScan(decodedText);
                            // Stop scanning after successful scan
                            scannerRef.current
                                .stop()
                                .then(() => {
                                    setIsScanning(false);
                                })
                                .catch((err) => {
                                    console.debug("Stop error:", err);
                                });
                        }
                    },
                    (errorMessage) => {
                        // Silently ignore common scanning errors
                        if (
                            !errorMessage.includes("NotFoundException") &&
                            !errorMessage.includes("No MultiFormat Readers")
                        ) {
                            console.debug("QR Scanner:", errorMessage);
                        }
                    }
                );

                if (mountedRef.current) {
                    setIsScanning(true);
                }
            } catch (err) {
                console.error("Failed to start scanner:", err);
                if (onError && mountedRef.current) {
                    onError(
                        "Failed to access camera. Please check permissions."
                    );
                }
                startedRef.current = false;
            }
        };

        // Small delay to ensure DOM is ready
        const timeout = setTimeout(() => {
            startScanner();
        }, 100);

        return () => {
            clearTimeout(timeout);
            mountedRef.current = false;

            if (scannerRef.current) {
                const currentScanner = scannerRef.current;
                scannerRef.current = null;

                // Only try to stop if the scanner is actually running
                if (isScanning) {
                    currentScanner
                        .stop()
                        .then(() => {
                            currentScanner.clear();
                        })
                        .catch((err) => {
                            console.debug("Cleanup error:", err);
                        });
                }
            }

            startedRef.current = false;
        };
    }, []);

    return (
        <div className="w-full">
            <div id="qr-reader" className="w-full rounded-lg overflow-hidden" />
        </div>
    );
}
