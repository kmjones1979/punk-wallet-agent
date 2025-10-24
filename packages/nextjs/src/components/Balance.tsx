"use client";

import { formatEther } from "@ethersproject/units";
import React, { useState } from "react";

interface BalanceProps {
    address?: string;
    provider?: any;
    balance?: any;
    value?: any;
    price?: number;
    dollarMultiplier?: number;
    dollarMode?: boolean;
    setDollarMode?: (mode: boolean) => void;
    size?: number;
}

export default function Balance({
    address,
    provider,
    balance,
    value,
    price,
    dollarMultiplier,
    dollarMode = false,
    setDollarMode,
    size,
}: BalanceProps) {
    const [localDollarMode, setLocalDollarMode] = useState(dollarMode);

    // TODO: Implement useBalance hook for Next.js
    // const balance = useBalance(provider, address);

    let floatBalance = parseFloat("0.00");
    let usingBalance = balance;

    if (typeof value !== "undefined") {
        usingBalance = value;
    }

    if (usingBalance) {
        const etherBalance = formatEther(usingBalance);
        floatBalance = parseFloat(etherBalance);
    }

    let displayBalance = floatBalance.toFixed(4);

    const currentPrice = price || dollarMultiplier;

    if (currentPrice && (dollarMode || localDollarMode)) {
        displayBalance = "$" + (floatBalance * currentPrice).toFixed(2);
    }

    const handleClick = () => {
        if (setDollarMode) {
            setDollarMode(!dollarMode);
        } else {
            setLocalDollarMode(!localDollarMode);
        }
    };

    return (
        <span
            style={{
                verticalAlign: "middle",
                fontSize: size ? size : 24,
                padding: 8,
                cursor: "pointer",
            }}
            onClick={handleClick}
        >
            {displayBalance}
        </span>
    );
}
