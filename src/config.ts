// Network configurations
import { hardhat } from "viem/chains";
import { createPublicClient, http } from "viem";
import { coreTestnet2 } from "viem/chains";

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
  coreTestnet2: {
    id: 84532,
    name: 'Core Testnet2',
    network: 'core-testnet2',
    nativeCurrency: {
      name: 'Core',
      symbol: 'CORE',
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
        name: 'CoreScan',
        url: 'https://sepolia.basescan.org',
      },
    },
    testnet: true,
  },
  hardhat: hardhatConfig,
};

// Update the interfaces
interface BaseAddresses {
  USBD: string;
  stCORE: string;
  CUSD: string;
  sCUSD: string;
  Operator: string;
  Eigen: string;
  LoanManager: string;
}

// Remove empty interfaces and use type aliases instead
type HardhatAddresses = BaseAddresses;
type CoreTestnet2Addresses = BaseAddresses;

export const contractAddresses: {
  hardhat: HardhatAddresses;
  coreTestnet2: CoreTestnet2Addresses;
} = {
  hardhat: {
    USBD: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    CUSD: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0', // Changed from PUSBD to CUSD
    stCORE: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    sCUSD: '0x0165878A594ca255338adfa4d48449f69242Eb8F',
    Eigen: '0x0165878A594ca255338adfa4d48449f69242Eb8F',
    Operator: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
    LoanManager: '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6',
  },
  coreTestnet2: {
    USBD: '0x8182BEF887361F3312D344e229160C389616b6F0',
    stCORE: '0xBB6f0beF915a4baaF6818c11BFeb648041f70959',
    CUSD: '0x61edDE0E4B97D878C14F5f5706309d4572550Afa',
    sCUSD: '0xe1Fd27F4390DcBE165f4D60DBF821e4B9Bb02dEd',
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
  // Core Testnet2
  if (chainId === supportedChains.coreTestnet2.id) {
    return contractAddresses.coreTestnet2[contractName];
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
  restakingstCORE: [
    // Add ABI here
  ],
};

// RPC URLs
export const getRpcUrl = (chainId: number): string => {
  if (chainId === supportedChains.coreTestnet2.id) {
    return supportedChains.coreTestnet2.rpcUrls.default.http[0];
  }
  
  if (chainId === supportedChains.hardhat.id) {
    return supportedChains.hardhat.rpcUrls.default.http[0];
  }
  
  // Default to Core Testnet2
  return supportedChains.coreTestnet2.rpcUrls.default.http[0];
};

// Explorer URLs
export const getExplorerUrl = (chainId: number): string => {
  if (chainId === supportedChains.coreTestnet2.id) {
    return supportedChains.coreTestnet2.blockExplorers.default.url;
  }
  
  if (chainId === supportedChains.hardhat.id) {
    return '';
  }
  
  // Default to Core Testnet2
  return supportedChains.coreTestnet2.blockExplorers.default.url;
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
export const chains = [supportedChains.coreTestnet2, supportedChains.hardhat];

// Add timeout and retry configuration
export const rpcConfig = {
  pollingInterval: 4_000,
  timeout: 30_000, // Increase timeout to 30 seconds
  retryCount: 3,
  retryDelay: 1000,
};

// Update the client configuration
export const publicClient = createPublicClient({
  chain: supportedChains.coreTestnet2,
  transport: http(supportedChains.coreTestnet2.rpcUrls.default.http[0], {
    timeout: rpcConfig.timeout,
    retryCount: rpcConfig.retryCount,
    retryDelay: rpcConfig.retryDelay,
  }),
});