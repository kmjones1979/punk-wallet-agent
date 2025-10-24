# 💳 EIP-681 Payment QR Code Integration

Zap Wallet now supports **EIP-681** payment request QR codes, enabling seamless crypto payments at POS terminals and merchant systems!

## 🎯 Features

-   **📷 QR Code Scanner**: Floating scan button on the main page
-   **💰 Payment Parsing**: Automatic parsing of EIP-681 URIs
-   **✅ Smart Confirmation**: Beautiful payment confirmation modal with all details
-   **🔄 Multi-Chain Support**: Automatic network switching for payments
-   **🪙 Token Support**: Both ETH and ERC-20 token payments

## 📱 How It Works

### For Users

1. **Open Zap Wallet** and connect your wallet
2. **Tap the floating QR button** (bottom-right corner)
3. **Scan the merchant's QR code**
4. **Review payment details** in the confirmation modal
5. **Approve & Pay** - the wallet handles the rest!

### For Merchants

Generate QR codes using the **EIP-681** standard format:

## 🔗 EIP-681 URI Format

### ETH Transfer

```
ethereum:0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb@1?value=1000000000000000000&label=Coffee%20Payment
```

**Parameters:**

-   `0x742d35Cc...`: Recipient address
-   `@1`: Chain ID (1 = Ethereum Mainnet, 8453 = Base, etc.)
-   `value`: Amount in Wei (18 decimals)
-   `label`: Description for the payment

**Example Values:**

-   0.01 ETH = `10000000000000000` wei
-   0.1 ETH = `100000000000000000` wei
-   1 ETH = `1000000000000000000` wei

### ERC-20 Token Transfer (USDC Example)

```
ethereum:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48@1/transfer?address=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb&uint256=1000000&decimals=6&symbol=USDC&label=Coffee%20Payment
```

**Parameters:**

-   `0xA0b86991...`: Token contract address (USDC on Ethereum)
-   `@1`: Chain ID
-   `/transfer`: Function to call
-   `address`: Recipient address
-   `uint256`: Amount in token's smallest unit
-   `decimals`: Token decimals (USDC = 6)
-   `symbol`: Token symbol
-   `label`: Description

**Example Values (USDC with 6 decimals):**

-   $1 USDC = `1000000`
-   $10 USDC = `10000000`
-   $100 USDC = `100000000`

## 🛠️ Supported Chains

The wallet will automatically switch to the correct network:

| Chain            | Chain ID | Example                           |
| ---------------- | -------- | --------------------------------- |
| Ethereum Mainnet | 1        | `ethereum:0xaddress@1?...`        |
| Base             | 8453     | `ethereum:0xaddress@8453?...`     |
| Base Sepolia     | 84532    | `ethereum:0xaddress@84532?...`    |
| Sepolia          | 11155111 | `ethereum:0xaddress@11155111?...` |

## 🎨 Integration Examples

### JavaScript/TypeScript (Generate QR Code)

```typescript
import QRCode from "qrcode";

// ETH Payment
const ethPaymentUri = `ethereum:0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb@1?value=100000000000000000&label=Coffee`;

// USDC Payment on Base
const usdcPaymentUri = `ethereum:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913@8453/transfer?address=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb&uint256=5000000&decimals=6&symbol=USDC&label=Coffee`;

// Generate QR Code
QRCode.toDataURL(ethPaymentUri, (err, url) => {
    console.log(url); // Display this QR code image
});
```

### Python (Generate QR Code)

```python
import qrcode

# ETH Payment
eth_uri = "ethereum:0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb@1?value=100000000000000000&label=Coffee"

# Generate QR Code
qr = qrcode.QRCode(version=1, box_size=10, border=5)
qr.add_data(eth_uri)
qr.make(fit=True)

img = qr.make_image(fill_color="black", back_color="white")
img.save("payment_qr.png")
```

### HTML/CSS (Display QR Code)

```html
<!DOCTYPE html>
<html>
    <head>
        <title>Payment QR</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
    </head>
    <body>
        <div id="qrcode"></div>
        <script>
            const paymentUri =
                "ethereum:0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb@1?value=100000000000000000&label=Coffee";
            new QRCode(document.getElementById("qrcode"), paymentUri);
        </script>
    </body>
</html>
```

## 🏪 POS Integration Example

```typescript
// Example POS system integration
interface PaymentRequest {
    amount: number;
    currency: "ETH" | "USDC";
    chainId: number;
    merchantAddress: string;
    description: string;
}

function generatePaymentQR(request: PaymentRequest): string {
    if (request.currency === "ETH") {
        // Convert ETH to wei
        const valueWei = (request.amount * 1e18).toString();
        return `ethereum:${request.merchantAddress}@${
            request.chainId
        }?value=${valueWei}&label=${encodeURIComponent(request.description)}`;
    } else if (request.currency === "USDC") {
        // USDC contract addresses
        const usdcContracts = {
            1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // Ethereum
            8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base
        };

        const tokenContract =
            usdcContracts[request.chainId as keyof typeof usdcContracts];
        const amountInSmallestUnit = (request.amount * 1e6).toString(); // USDC has 6 decimals

        return `ethereum:${tokenContract}@${request.chainId}/transfer?address=${
            request.merchantAddress
        }&uint256=${amountInSmallestUnit}&decimals=6&symbol=USDC&label=${encodeURIComponent(
            request.description
        )}`;
    }

    throw new Error("Unsupported currency");
}

// Usage
const payment: PaymentRequest = {
    amount: 5.99,
    currency: "USDC",
    chainId: 8453,
    merchantAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    description: "Coffee & Pastry",
};

const qrUri = generatePaymentQR(payment);
console.log(qrUri);
// Generate and display QR code from this URI
```

## 🧪 Testing

Test the payment flow with these example URIs:

### Test ETH Payment (0.001 ETH)

```
ethereum:0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@1?value=1000000000000000&label=Test%20Payment
```

### Test USDC Payment ($5 on Base)

```
ethereum:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913@8453/transfer?address=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045&uint256=5000000&decimals=6&symbol=USDC&label=Test%20Payment
```

## 🔒 Security Features

-   ✅ **User Confirmation Required**: All payments require explicit user approval
-   ✅ **Clear Details Display**: Amount, recipient, and description shown before payment
-   ✅ **Network Verification**: Automatic chain switching with user notification
-   ✅ **Transaction Preview**: Complete transaction details before signing

## 📚 Resources

-   [EIP-681 Specification](https://eips.ethereum.org/EIPS/eip-681)
-   [URI Scheme RFC](https://www.rfc-editor.org/rfc/rfc3986)
-   [QR Code Standards](https://www.qrcode.com/en/about/standards.html)

## 🚀 Future Enhancements

-   [ ] Support for EIP-3770 chain-specific addresses
-   [ ] Payment request expiry timestamps
-   [ ] Multi-recipient payments
-   [ ] Invoice number/reference tracking
-   [ ] Receipt generation after payment
-   [ ] Payment history in wallet

---

**Built with ❤️ for Zap Wallet**
