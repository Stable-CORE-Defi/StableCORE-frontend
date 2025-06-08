// import { defineChain } from 'viem'

// Define Pharos chain
export const pharosChain = {
    id: 50002,
    name: 'Pharos Network',
    nativeCurrency: {
      decimals: 18,
      name: 'Pharos Network',
      symbol: 'PHA',
    },
    rpcUrls: {
      default: {
        name: 'Pharos Network',
        http: ['https://devnet.dplabs-internal.com'],
      },
    },
    blockExplorers: {
      default: {
        name: 'PharosScan',
        url: 'https://pharosscan.xyz',
      },
    },
  //   contracts: {
  //     multicall3: {
  //       address: '0xca11bde05977b3631167028862be2a173976ca11' as `0x${string}`,
  //       blockCreated: 1,
  //     },
  //   },
  //   testnet: true,
  } 