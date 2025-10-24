"use client";

import { Skeleton, Typography } from "antd";
import React from "react";
import Blockies from "react-blockies";

const { Text } = Typography;

const blockExplorerLink = (address: string, blockExplorer?: string) =>
    `${blockExplorer || "https://etherscan.io/"}address/${address}`;

interface AddressProps {
    address?: string;
    ensProvider?: any;
    blockExplorer?: string;
    fontSize?: number;
    size?: "short" | "long";
    minimized?: boolean;
    onChange?: (value: string) => void;
}

export default function Address({
    address,
    ensProvider,
    blockExplorer,
    fontSize,
    size,
    minimized,
    onChange,
}: AddressProps) {
    if (!address) {
        return (
            <span>
                <Skeleton avatar paragraph={{ rows: 1 }} />
            </span>
        );
    }

    let displayAddress = address.substr(0, 6);

    // TODO: Add ENS lookup when needed
    // const ens = useLookupAddress(ensProvider, address);
    // if (ens && ens.indexOf("0x") < 0) {
    //   displayAddress = ens;
    // } else
    if (size === "short") {
        displayAddress += "..." + address.substr(-4);
    } else if (size === "long") {
        displayAddress = address;
    }

    const etherscanLink = blockExplorerLink(address, blockExplorer);

    if (minimized) {
        return (
            <span style={{ verticalAlign: "middle" }}>
                <a
                    style={{ color: "#222222" }}
                    target="_blank"
                    href={etherscanLink}
                    rel="noopener noreferrer"
                >
                    <Blockies seed={address.toLowerCase()} size={8} scale={2} />
                </a>
            </span>
        );
    }

    let text;
    if (onChange) {
        text = (
            <Text editable={{ onChange }} copyable={{ text: address }}>
                <a
                    style={{ color: "#222222" }}
                    target="_blank"
                    href={etherscanLink}
                    rel="noopener noreferrer"
                >
                    {displayAddress}
                </a>
            </Text>
        );
    } else {
        text = (
            <Text copyable={{ text: address }}>
                <a
                    style={{ color: "#222222" }}
                    target="_blank"
                    href={etherscanLink}
                    rel="noopener noreferrer"
                >
                    {displayAddress}
                </a>
            </Text>
        );
    }

    return (
        <span>
            <span style={{ verticalAlign: "middle" }}>
                <Blockies
                    seed={address.toLowerCase()}
                    size={8}
                    scale={fontSize ? fontSize / 7 : 4}
                />
            </span>
            <span
                style={{
                    verticalAlign: "middle",
                    paddingLeft: 8,
                    fontSize: fontSize ? fontSize : 28,
                }}
            >
                {text}
            </span>
        </span>
    );
}
