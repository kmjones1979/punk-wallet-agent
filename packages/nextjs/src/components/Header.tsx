"use client";

import { PageHeader } from "antd";
import { useEffect, useState } from "react";

interface HeaderProps {
    extra?: React.ReactNode[];
}

export default function Header({ extra }: HeaderProps) {
    const [windowWidth, setWindowWidth] = useState(0);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        handleResize(); // Set initial value
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return (
        <PageHeader
            title={
                <a href="https://zapai.app">
                    {windowWidth < 600 ? "⚡" : "⚡ Zap Wallet"}
                </a>
            }
            subTitle={
                <a href="https://github.com/scaffold-eth/punk-wallet">
                    {windowWidth < 600 ? "" : "info/code"}
                </a>
            }
            style={{ cursor: "pointer", fontSize: 32 }}
            extra={extra}
        />
    );
}
