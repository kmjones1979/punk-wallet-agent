"use client";

import React from "react";
import Blockies from "react-blockies";

interface ZapBlockieProps {
    address: string;
    size: number;
}

export default function ZapBlockie({ address, size }: ZapBlockieProps) {
    return (
        <div
            style={{
                width: size,
                height: size,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            <Blockies
                seed={address.toLowerCase()}
                size={8}
                scale={size / 8}
            />
        </div>
    );
}

