import { createConnector } from "wagmi";
import { Wallet } from "ethers";

const STORAGE_KEY = "burnerWallets";
const ACTIVE_WALLET_KEY = "activeBurnerIndex";

export interface BurnerWallet {
    address: string;
    privateKey: string;
    name: string;
    createdAt: number;
}

// Get all burner wallets from storage
export function getAllBurnerWallets(): BurnerWallet[] {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
}

// Save all burner wallets to storage
function saveBurnerWallets(wallets: BurnerWallet[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wallets));
}

// Get active wallet index
export function getActiveWalletIndex(): number {
    if (typeof window === "undefined") return 0;
    const stored = localStorage.getItem(ACTIVE_WALLET_KEY);
    return stored ? parseInt(stored) : 0;
}

// Set active wallet index
export function setActiveWalletIndex(index: number) {
    if (typeof window === "undefined") return;
    localStorage.setItem(ACTIVE_WALLET_KEY, index.toString());
}

// Get current active burner wallet
export function getActiveBurnerWallet(): BurnerWallet | null {
    const wallets = getAllBurnerWallets();
    const index = getActiveWalletIndex();
    return wallets[index] || null;
}

// Create a new burner wallet
export function createNewBurnerWallet(name?: string): BurnerWallet {
    const wallet = Wallet.createRandom();
    const wallets = getAllBurnerWallets();

    const newWallet: BurnerWallet = {
        address: wallet.address,
        privateKey: wallet.privateKey,
        name: name || `Burner #${wallets.length + 1}`,
        createdAt: Date.now(),
    };

    wallets.push(newWallet);
    saveBurnerWallets(wallets);
    setActiveWalletIndex(wallets.length - 1);

    return newWallet;
}

// Import a burner wallet from a private key
export function importBurnerWalletFromPrivateKey(privateKey: string, name?: string): BurnerWallet | null {
    try {
        // Ensure private key starts with 0x
        const formattedPk = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
        
        // Create wallet from private key
        const wallet = new Wallet(formattedPk);
        const wallets = getAllBurnerWallets();

        // Check if wallet already exists
        const existingIndex = wallets.findIndex(w => w.address.toLowerCase() === wallet.address.toLowerCase());
        if (existingIndex >= 0) {
            // Switch to existing wallet
            setActiveWalletIndex(existingIndex);
            return wallets[existingIndex];
        }

        // Add new imported wallet
        const newWallet: BurnerWallet = {
            address: wallet.address,
            privateKey: wallet.privateKey,
            name: name || `Imported #${wallets.length + 1}`,
            createdAt: Date.now(),
        };

        wallets.push(newWallet);
        saveBurnerWallets(wallets);
        setActiveWalletIndex(wallets.length - 1);

        return newWallet;
    } catch (error) {
        console.error('Failed to import private key:', error);
        return null;
    }
}

// Load private key from URL hash (e.g., /pk#0xc458e6e3...)
export function loadPrivateKeyFromUrl(): BurnerWallet | null {
    if (typeof window === 'undefined') return null;
    
    const hash = window.location.hash;
    
    // Check if URL contains /pk# pattern
    if (hash && hash.startsWith('#0x') && hash.length > 60) {
        const privateKey = hash.substring(1); // Remove the # symbol
        console.log('🔑 Loading private key from URL...');
        
        const wallet = importBurnerWalletFromPrivateKey(privateKey, 'Imported from URL');
        
        // Clear the hash from URL for security
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        
        return wallet;
    }
    
    return null;
}

// Switch to a different burner wallet
export function switchBurnerWallet(index: number): BurnerWallet | null {
    const wallets = getAllBurnerWallets();
    if (index >= 0 && index < wallets.length) {
        setActiveWalletIndex(index);
        return wallets[index];
    }
    return null;
}

// Delete a burner wallet
export function deleteBurnerWallet(index: number) {
    const wallets = getAllBurnerWallets();
    if (index >= 0 && index < wallets.length) {
        wallets.splice(index, 1);
        saveBurnerWallets(wallets);

        // Adjust active index if needed
        const activeIndex = getActiveWalletIndex();
        if (activeIndex >= wallets.length) {
            setActiveWalletIndex(Math.max(0, wallets.length - 1));
        }
    }
}

// Rename a burner wallet
export function renameBurnerWallet(index: number, newName: string) {
    const wallets = getAllBurnerWallets();
    if (index >= 0 && index < wallets.length) {
        wallets[index].name = newName;
        saveBurnerWallets(wallets);
    }
}

// Import a burner wallet from private key
export function importBurnerWallet(
    privateKey: string,
    name?: string
): BurnerWallet | null {
    try {
        const wallet = new Wallet(privateKey);
        const wallets = getAllBurnerWallets();

        // Check if wallet already exists
        const existingIndex = wallets.findIndex(
            (w) => w.address === wallet.address
        );
        if (existingIndex !== -1) {
            setActiveWalletIndex(existingIndex);
            return wallets[existingIndex];
        }

        const newWallet: BurnerWallet = {
            address: wallet.address,
            privateKey: wallet.privateKey,
            name: name || `Imported #${wallets.length + 1}`,
            createdAt: Date.now(),
        };

        wallets.push(newWallet);
        saveBurnerWallets(wallets);
        setActiveWalletIndex(wallets.length - 1);

        return newWallet;
    } catch (error) {
        console.error("Invalid private key:", error);
        return null;
    }
}

// Migrate old single wallet to new multi-wallet system
function migrateOldWallet() {
    if (typeof window === "undefined") return;

    const oldKey = localStorage.getItem("metaPrivateKey");
    const wallets = getAllBurnerWallets();

    if (oldKey && wallets.length === 0) {
        try {
            const wallet = new Wallet(oldKey);
            const newWallet: BurnerWallet = {
                address: wallet.address,
                privateKey: wallet.privateKey,
                name: "Burner #1",
                createdAt: Date.now(),
            };
            saveBurnerWallets([newWallet]);
            setActiveWalletIndex(0);
            localStorage.removeItem("metaPrivateKey");
        } catch (error) {
            console.error("Failed to migrate old wallet:", error);
        }
    }
}

export function burnerWallet() {
    let currentChainId = 1; // Default to mainnet

    return createConnector((config) => ({
        id: "burner",
        name: "Burner Wallet",
        type: "burner",

        async connect() {
            // Migrate old wallet if exists
            migrateOldWallet();

            // Get or create first wallet
            let wallets = getAllBurnerWallets();
            if (wallets.length === 0) {
                createNewBurnerWallet();
                wallets = getAllBurnerWallets();
            }

            const provider = await this.getProvider();
            const accounts = await provider.request({
                method: "eth_accounts",
            });

            const chainId = await this.getChainId();
            currentChainId = chainId; // Initialize current chain ID

            return {
                accounts: accounts as `0x${string}`[],
                chainId,
            };
        },

        async disconnect() {
            // Keep wallets in storage on disconnect
        },

        async getAccounts() {
            const provider = await this.getProvider();
            const accounts = await provider.request({
                method: "eth_accounts",
            });
            return accounts as `0x${string}`[];
        },

        async getChainId() {
            const provider = await this.getProvider();
            const chainId = await provider.request({
                method: "eth_chainId",
            });
            return Number(chainId);
        },

        async getProvider() {
            if (typeof window === "undefined") {
                throw new Error("Burner wallet only works in browser");
            }

            const activeWallet = getActiveBurnerWallet();
            if (!activeWallet) {
                throw new Error("No active burner wallet");
            }

            const wallet = new Wallet(activeWallet.privateKey);

            // Create a minimal EIP-1193 provider
            const provider = {
                request: async ({ method, params }: any) => {
                    switch (method) {
                        case "eth_accounts":
                            return [wallet.address];
                        case "eth_chainId":
                            return `0x${currentChainId.toString(16)}`;
                        case "personal_sign":
                            return wallet.signMessage(params[0]);
                        case "eth_signTypedData_v4":
                            const { domain, types, message } = JSON.parse(
                                params[1]
                            );
                            return wallet._signTypedData(
                                domain,
                                types,
                                message
                            );
                        case "eth_sendTransaction":
                            // Sign and send the transaction
                            const tx = params[0];

                            // Convert 'gas' to 'gasLimit' for ethers.js compatibility
                            if (tx.gas && !tx.gasLimit) {
                                tx.gasLimit = tx.gas;
                                delete tx.gas;
                            }

                            // Get the current chain's RPC URL
                            const currentChain =
                                config.chains.find(
                                    (c) => c.id === currentChainId
                                ) ?? config.chains[0];
                            const rpcUrl = currentChain.rpcUrls.default.http[0];

                            // Estimate gas if not provided
                            if (!tx.gas && !tx.gasLimit) {
                                const gasEstimateResponse = await fetch(
                                    rpcUrl,
                                    {
                                        method: "POST",
                                        headers: {
                                            "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({
                                            jsonrpc: "2.0",
                                            id: Date.now(),
                                            method: "eth_estimateGas",
                                            params: [tx],
                                        }),
                                    }
                                );
                                const gasResult =
                                    await gasEstimateResponse.json();
                                if (gasResult.result) {
                                    // Add 20% buffer to gas estimate
                                    const estimatedGas = BigInt(
                                        gasResult.result
                                    );
                                    tx.gasLimit = `0x${(
                                        (estimatedGas * 120n) /
                                        100n
                                    ).toString(16)}`;
                                }
                            }

                            // Get gas price if not provided
                            if (!tx.gasPrice && !tx.maxFeePerGas) {
                                const gasPriceResponse = await fetch(rpcUrl, {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                        jsonrpc: "2.0",
                                        id: Date.now(),
                                        method: "eth_gasPrice",
                                        params: [],
                                    }),
                                });
                                const gasPriceResult =
                                    await gasPriceResponse.json();
                                if (gasPriceResult.result) {
                                    tx.gasPrice = gasPriceResult.result;
                                }
                            }

                            // Get nonce if not provided
                            if (tx.nonce === undefined) {
                                const nonceResponse = await fetch(rpcUrl, {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                        jsonrpc: "2.0",
                                        id: Date.now(),
                                        method: "eth_getTransactionCount",
                                        params: [wallet.address, "pending"],
                                    }),
                                });
                                const nonceResult = await nonceResponse.json();
                                if (nonceResult.result) {
                                    tx.nonce = nonceResult.result;
                                }
                            }

                            // Add chainId if not provided
                            if (!tx.chainId) {
                                tx.chainId = currentChainId;
                            }

                            const signedTx = await wallet.signTransaction(tx);

                            // Send the signed transaction using the configured RPC
                            const response = await fetch(rpcUrl, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    jsonrpc: "2.0",
                                    id: Date.now(),
                                    method: "eth_sendRawTransaction",
                                    params: [signedTx],
                                }),
                            });
                            const result = await response.json();
                            if (result.error) {
                                throw new Error(result.error.message);
                            }
                            return result.result;
                        default:
                            throw new Error(`Method ${method} not supported`);
                    }
                },
                on: () => {},
                removeListener: () => {},
            };

            return provider as any;
        },

        async isAuthorized() {
            if (typeof window === "undefined") return false;
            migrateOldWallet();
            return getAllBurnerWallets().length > 0;
        },

        async switchChain({ chainId }) {
            currentChainId = chainId;
            config.emitter.emit("change", { chainId });
            return (
                config.chains.find((x) => x.id === chainId) ?? config.chains[0]
            );
        },

        onAccountsChanged() {},
        onChainChanged() {},
        onDisconnect() {},
    }));
}

// Helper to copy to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        console.error("Failed to copy:", error);
        return false;
    }
}
