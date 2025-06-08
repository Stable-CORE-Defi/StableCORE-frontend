// Network configurations
import { hardhat } from "viem/chains";

import { createPublicClient, http } from "viem";



// Custom hardhat configuration
const hardhatConfig = {
  ...hardhat,
  id: 31337,
  name: 'Hardhat',
  network: 'hardhat',
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:8545'],
    },
    public: {
      http: ['http://127.0.0.1:8545'],
    },
  },
};

export const supportedChains = {
  baseSepolia: {
    id: 84532,
    name: 'Base Sepolia',
    network: 'base-sepolia',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: ['https://sepolia.base.org'],
      },
      public: {
        http: ['https://sepolia.base.org'],
      },
    },
    blockExplorers: {
      default: {
        name: 'BaseScan',
        url: 'https://sepolia.basescan.org',
      },
    },
    testnet: true,
  },
  hardhat: hardhatConfig,
  pharos: {
    id: 50002,
    name: 'Pharos Network',
    network: 'pharos',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: [
          'https://devnet.dplabs-internal.com',
          'https://devnet.dplabs-internal.com/rpc', // Add fallback URL if available
        ],
        webSocket: ['wss://devnet.dplabs-internal.com/ws'], // Add WebSocket if available
      },
      public: {
        http: ['https://devnet.dplabs-internal.com'],
      },
    },
    blockExplorers: {
      default: {
        name: 'PharosScan',
        url: 'https://pharosscan.xyz',
      },
    },
    testnet: true,
  },
};

// Update the interfaces
interface BaseAddresses {
  USDC: string;
  LST: string;
  PUSD: string;
  sPUSD: string;
  Operator: string;
  Eigen: string;
  LoanManager: string;
}

// Remove empty interfaces and use type aliases instead
type HardhatAddresses = BaseAddresses;
type PharosAddresses = BaseAddresses;

export const contractAddresses: {
  hardhat: HardhatAddresses;
  pharos: PharosAddresses;
} = {
  hardhat: {
    USDC: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    PUSD: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0', // Changed from PUSDC to PUSD
    LST: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    sPUSD: '0x0165878A594ca255338adfa4d48449f69242Eb8F',
    Eigen: '0x0165878A594ca255338adfa4d48449f69242Eb8F',
    Operator: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
    LoanManager: '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6',
  },
  pharos: {
    USDC: '0x8182BEF887361F3312D344e229160C389616b6F0',
    LST: '0xBB6f0beF915a4baaF6818c11BFeb648041f70959',
    PUSD: '0x61edDE0E4B97D878C14F5f5706309d4572550Afa',
    sPUSD: '0xe1Fd27F4390DcBE165f4D60DBF821e4B9Bb02dEd',
    Operator: '0xc582Bc0317dbb0908203541971a358c44b1F3766',
    Eigen: '0xB377a2EeD7566Ac9fCb0BA673604F9BF875e2Bab',
    LoanManager: '0x66F625B8c4c635af8b74ECe2d7eD0D58b4af3C3d'
  }
};

// Update the getContractAddress function to use BaseAddresses
export const getContractAddress = (
  contractName: keyof BaseAddresses,
  chainId: number
): string => {
  // Pharos Network
  if (chainId === supportedChains.pharos.id) {
    return contractAddresses.pharos[contractName];
  }
  
  // Hardhat
  if (chainId === supportedChains.hardhat.id) {
    return contractAddresses.hardhat[contractName];
  }
  
  return '0x0000000000000000000000000000000000000000';
};

// ABIs
export const ABIs = {
  operatorRegistry: [
    // Add ABI here
  ],
  restakingLST: [
    // Add ABI here
  ],
};

// RPC URLs
export const getRpcUrl = (chainId: number): string => {
  if (chainId === supportedChains.pharos.id) {
    return supportedChains.pharos.rpcUrls.default.http[0];
  }
  
  if (chainId === supportedChains.baseSepolia.id) {
    return supportedChains.baseSepolia.rpcUrls.default.http[0];
  }
  
  if (chainId === supportedChains.hardhat.id) {
    return supportedChains.hardhat.rpcUrls.default.http[0];
  }
  
  // Default to Pharos
  return supportedChains.pharos.rpcUrls.default.http[0];
};

// Explorer URLs
export const getExplorerUrl = (chainId: number): string => {
  if (chainId === supportedChains.pharos.id) {
    return supportedChains.pharos.blockExplorers.default.url;
  }
  
  if (chainId === supportedChains.baseSepolia.id) {
    return supportedChains.baseSepolia.blockExplorers.default.url;
  }
  
  if (chainId === supportedChains.hardhat.id) {
    return '';
  }
  
  // Default to Pharos
  return supportedChains.pharos.blockExplorers.default.url;
};

// Helper to format transaction URL
export const getTransactionUrl = (chainId: number, txHash: string): string => {
  const explorerUrl = getExplorerUrl(chainId);
  if (!explorerUrl) return '';
  return `${explorerUrl}/tx/${txHash}`;
};

// Helper to format address URL
export const getAddressUrl = (chainId: number, address: string): string => {
  const explorerUrl = getExplorerUrl(chainId);
  if (!explorerUrl) return '';
  return `${explorerUrl}/address/${address}`;
};

// Add more configuration options as needed

// Add to wagmi config
export const chains = [supportedChains.pharos, supportedChains.baseSepolia, supportedChains.hardhat];

// Add timeout and retry configuration
export const rpcConfig = {
  pollingInterval: 4_000,
  timeout: 30_000, // Increase timeout to 30 seconds
  retryCount: 3,
  retryDelay: 1000,
};

// Update the client configuration
export const publicClient = createPublicClient({
  chain: supportedChains.pharos,
  transport: http(supportedChains.pharos.rpcUrls.default.http[0], {
    timeout: rpcConfig.timeout,
    retryCount: rpcConfig.retryCount,
    retryDelay: rpcConfig.retryDelay,
  }),
});