"use client";

import { WalletOutlined } from "@ant-design/icons";
import { Button, Modal, Spin } from "antd";
import { useState } from "react";
import Address from "./Address";
import Balance from "./Balance";

interface WalletProps {
    provider?: any;
    address?: string;
    ensProvider?: any;
    price?: number;
}

export default function Wallet({
    provider,
    address,
    ensProvider,
    price,
}: WalletProps) {
    const [open, setOpen] = useState(false);

    const providerSend = provider ? (
        <WalletOutlined
            style={{ fontSize: 32, color: "#1890ff" }}
            onClick={() => {
                setOpen(!open);
            }}
        />
    ) : (
        ""
    );

    return (
        <span
            style={{ verticalAlign: "middle", paddingLeft: 16, fontSize: 32 }}
        >
            {providerSend}
            <Modal
                open={open}
                title={
                    <div>
                        {address ? (
                            <Address
                                address={address}
                                ensProvider={ensProvider}
                            />
                        ) : (
                            <Spin />
                        )}
                        <div style={{ float: "right", paddingRight: 25 }}>
                            <Balance
                                address={address}
                                provider={provider}
                                dollarMultiplier={price}
                            />
                        </div>
                    </div>
                }
                onOk={() => {
                    setOpen(!open);
                }}
                onCancel={() => {
                    setOpen(!open);
                }}
                footer={[
                    <Button
                        key="submit"
                        type="primary"
                        onClick={() => {
                            setOpen(!open);
                        }}
                    >
                        Close
                    </Button>,
                ]}
            >
                <div>
                    <p>Wallet functionality will be implemented here.</p>
                    <p>
                        This is a simplified version for the Next.js migration.
                    </p>
                </div>
            </Modal>
        </span>
    );
}
