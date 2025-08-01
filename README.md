This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Network Switching & USBD Minting

This application supports switching between Hardhat local network and Core Testnet2. The network switching functionality has been implemented with the following features:

### Network Switching
- **Navbar Network Switcher**: Use the network buttons in the navbar to switch between Hardhat and Core Testnet2
- **Dynamic Contract Addresses**: Contract addresses automatically update based on the selected network
- **Balance Polling**: Balances are automatically refreshed every 5 seconds and when switching networks

### USBD Minting
- **Dynamic Contract Resolution**: USBD contract addresses are resolved based on the current network
- **Real-time Balance Updates**: Balance is automatically updated after minting transactions
- **Transaction Status**: Shows transaction hash and status during minting
- **Error Handling**: Proper error messages for network-specific issues

### Testing USBD Minting
1. Connect your wallet
2. Switch to the desired network (Hardhat or Core Testnet2) using the navbar buttons
3. Navigate to the USBD page (`/usdc`) or use the mint page (`/mint`)
4. Enter the amount to mint
5. Click "Mint USBD"
6. The balance should update automatically after the transaction completes

### Supported Networks
- **Hardhat (Chain ID: 31337)**: Local development network
- **Core Testnet2 (Chain ID: 84532)**: Core blockchain testnet

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
