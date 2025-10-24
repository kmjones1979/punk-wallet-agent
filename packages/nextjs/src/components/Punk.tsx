"use client";

import React from "react";

interface PunkProps {
    address: string;
    size: number;
}

export default function Punk({ address, size }: PunkProps) {
    const part1 = address.substring(2, 22);
    const part2 = address.substring(22);

    const x = parseInt(part1, 16) % 100;
    const y = parseInt(part2, 16) % 100;

    return (
        <div
            style={{
                position: "relative",
                width: size,
                height: size,
                overflow: "hidden",
                backgroundColor: "#638596",
            }}
        >
            <img
                src="/punks.png"
                alt={`CryptoPunk for ${address}`}
                style={{
                    position: "absolute",
                    left: -size * x,
                    top: -size * y,
                    width: size * 100,
                    height: size * 100,
                    imageRendering: "pixelated",
                }}
            />
        </div>
    );
}
