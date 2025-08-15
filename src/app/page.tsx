"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount, usePublicClient, useWalletClient, useChainId } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import StablecoinAnimation from "./components/StablecoinAnimation";
import Image from "next/image";
import CUSDJson from "@/contracts/CUSD.sol/CUSD.json";
import sCUSDJson from "@/contracts/sCUSD.sol/sCUSD.json";
import stCOREJson from "@/contracts/stCORE.sol/stCORE.json";
import EigenJson from "@/contracts/Eigen.sol/Eigen.json";
import { getContractAddress, supportedChains } from "../config";
import USDCJson from "@/contracts/USDC/USDC.json";
import LoanManagerJson from "@/contracts/LoanManager.sol/LoanManager.json";
import OperatorManagement from "./components/OperatorManagement";

interface LoanContractResponse {
  0: bigint; // amount
  1: bigint; // interestRate
  2: bigint; // startTime
  3: bigint; // dueTime
  4: boolean; // isRepaid
  5: bigint; // collateralAmount
  6: bigint; // loanedUSDCAmount
}

const HomePage = () => {
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [USDCBalance, setUSDCBalance] = useState("0");
  const [CUSDBalance, setCUSDBalance] = useState("0");
  const [loading, setLoading] = useState(false);
  const [USDCLoading, setUSDCLoading] = useState(false);
  const [error, setError] = useState("");
  const [USDCError, setUSDCError] = useState("");
  const [success, setSuccess] = useState("");
  const [USDCSuccess, setUSDCSuccess] = useState("");

  // sCUSD vault states
  const [sCUSDBalance, setSCUSDBalance] = useState("0");
  const [sCUSDShareBalance, setSCUSDShareBalance] = useState("0");
  const [sCUSDDepositPreview, setSCUSDDepositPreview] = useState("0");
  const [sCUSDConversionRate, setSCUSDConversionRate] = useState("1");
  const [sCUSDLoading, setSCUSDLoading] = useState(false);
  const [sCUSDNotification, setSCUSDNotification] = useState({
    show: false,
    message: "",
    type: "",
  });
  const [sCUSDAmount, setSCUSDAmount] = useState("");
  const [sCUSDActiveTab, setSCUSDActiveTab] = useState("deposit");

  // Restaking states
  const [stCOREBalance, setstCOREBalance] = useState("0");
  const [stCOREAmount, setstCOREAmount] = useState("");
  const [stCORELoading, setstCORELoading] = useState(false);
  const [restakingLoading, setRestakingLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("delegate");
  const [delegatedAmount, setDelegatedAmount] = useState("0");
  const [restakingNotification, setRestakingNotification] = useState({
    show: false,
    message: "",
    type: "",
  });

  // Loan states
  const [loanAmount, setLoanAmount] = useState("");
  const [collateralAmount, setCollateralAmount] = useState("");
  const [repayAmount, setRepayAmount] = useState("");
  const [loanDetails, setLoanDetails] = useState<any>(null);
  const [loanLoading, setLoanLoading] = useState(false);
  const [loanNotification, setLoanNotification] = useState({
    show: false,
    message: "",
    type: "",
  });
  const [loanActiveTab, setLoanActiveTab] = useState("take");



  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();

  const devnetAddresses = {
    "USDC": "0x3eCA9205a5A8b602067B2a58F60C30EA020FeCeb",
    "stCORE": "0x58f4BBC38d592F253fB98C53A4D2f55B8DBF51a7",
    "CUSD": "0x71E00C10F924355453bCF8fe86F6B63980f859DD",
    "sCUSD": "0x5BC5C3A0F7ee4465DFCC1ad9526d9Bf107361AD1",
    "Operator": "0x025f719646013A8b69b8568F105c67e60D14d8ab",
    "Eigen": "0x6C2ba32a3ADBA2D61a02F5EAe3bd86F59B6a7B18",
    "LoanManager": "0x0b3827aE16a73887F3C5c25d13CF5Ea4a2772c3C"
  };
  // above footer, show a table with devnet address from devnetAddresses
  const router = useRouter();

  // Fetch balances
  const fetchBalances = async () => {
    if (!address || !publicClient) return;

    try {
      console.log("Fetching balances for address:", address);

      // Get contract addresses for current network
      const USDCAddress = getContractAddress("USDC", chainId);
      const cusdAddress = getContractAddress("CUSD", chainId);

      console.log("USDC contract address:", USDCAddress);

      // Fetch USDC balance
      if (USDCAddress !== '0x0000000000000000000000000000000000000000') {
        const USDCBalanceData = await publicClient.readContract({
          address: USDCAddress as `0x${string}`,
          abi: USDCJson.abi,
          functionName: "balanceOf",
          args: [address],
        });

        console.log("Raw USDC balance data:", USDCBalanceData);
        const formattedBalance = formatUnits(USDCBalanceData as bigint, 18);
        console.log("Formatted USDC balance:", formattedBalance);
        setUSDCBalance(formattedBalance);
      } else {
        setUSDCBalance("0");
      }

      // Fetch CUSD balance
      if (cusdAddress !== '0x0000000000000000000000000000000000000000') {
        const CUSDBalanceData = await publicClient.readContract({
          address: cusdAddress as `0x${string}`,
          abi: CUSDJson.abi,
          functionName: "balanceOf",
          args: [address],
        });

        console.log("Raw CUSD balance data:", CUSDBalanceData);
        const formattedCUSDBalance = formatUnits(CUSDBalanceData as bigint, 18);
        console.log("Formatted CUSD balance:", formattedCUSDBalance);
        setCUSDBalance(formattedCUSDBalance);
      } else {
        setCUSDBalance("0");
      }
    } catch (err) {
      console.error("Error fetching balances:", err);
      // Set error state to show user there was an issue
      setError("Failed to fetch balances. Please try refreshing.");
    }
  };



  // Fetch balances on mount and when address changes
  useEffect(() => {
    if (isConnected && address && publicClient) {
      fetchBalances();
      fetchSCUSDVaultData();
      fetchActiveLoans();
      fetchRepaymentAmount();

      // Set up polling for balance updates
      const interval = setInterval(() => {
        fetchBalances();
        fetchSCUSDVaultData();
        fetchActiveLoans();
        fetchRepaymentAmount();
      }, 5000); // Poll every 5 seconds

      return () => clearInterval(interval);
    }
  }, [address, isConnected, publicClient, chainId]);

  // Handle input change for CUSD
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers and decimals
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  // Handle input change for sCUSD
  const handleSCUSDAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers and decimals
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setSCUSDAmount(value);
    }
  };

  // Handle USDC mint (fixed amount of 10 USDC)
  const handleUSDCMint = async () => {
    if (!walletClient || !publicClient) {
      setUSDCError("Wallet not connected properly");
      return;
    }

    setUSDCLoading(true);
    setUSDCError("");
    setUSDCSuccess("");

    try {
      console.log("Starting USDC mint process...");
      console.log("User address:", address);

      // Get USDC contract address for current network
      const USDCAddress = getContractAddress("USDC", chainId);
      if (USDCAddress === '0x0000000000000000000000000000000000000000') {
        setUSDCError("USDC contract not available on current network");
        setUSDCLoading(false);
        return;
      }

      console.log("USDC contract address:", USDCAddress);

      // Convert 10 USDC to units (18 decimals)
      const USDCAmountUnits = parseUnits("10", 18);
      console.log("USDC amount in units:", USDCAmountUnits.toString());

      // Prepare the mint transaction
      const { request } = await publicClient.simulateContract({
        address: USDCAddress as `0x${string}`,
        abi: USDCJson.abi,
        functionName: "mint",
        args: [USDCAmountUnits],
        account: address,
      });

      console.log("Transaction request prepared:", request);

      // Execute the transaction using the wallet's provider
      const hash = await walletClient.writeContract(request);
      console.log("Transaction hash:", hash);

      // Wait for transaction to complete
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log("Transaction receipt:", receipt);

      // Add a small delay to ensure the blockchain state is updated
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update balance
      console.log("Refreshing balances after mint...");
      await fetchBalances();

      setUSDCSuccess("Successfully minted 10 USDC!");
      console.log("USDC mint completed successfully");
    } catch (err: unknown) {
      console.error("Error minting USDC:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to mint USDC. Please try again.";
      setUSDCError(errorMessage);
    } finally {
      setUSDCLoading(false);
    }
  };

  // Handle approve and mint CUSD
  const handleMint = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (!walletClient || !publicClient) {
      setError("Wallet not connected properly");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Get contract addresses for current network
      const USDCAddress = getContractAddress("USDC", chainId);
      const cusdAddress = getContractAddress("CUSD", chainId);

      if (USDCAddress === '0x0000000000000000000000000000000000000000' ||
        cusdAddress === '0x0000000000000000000000000000000000000000') {
        setError("Contracts not available on current network");
        setLoading(false);
        return;
      }

      // First approve USDC spending
      const USDCAmount = parseUnits(amount, 18); // USDC has 18 decimals

      // Check if we have enough USDC
      if (parseFloat(USDCBalance) < parseFloat(amount)) {
        setError(`Insufficient USDC balance. You have ${USDCBalance} USDC.`);
        setLoading(false);
        return;
      }

      // Approve USDC
      const { request: approveRequest } = await publicClient.simulateContract({
        address: USDCAddress as `0x${string}`,
        abi: USDCJson.abi,
        functionName: "approve",
        args: [cusdAddress as `0x${string}`, USDCAmount],
        account: address,
      });

      const approveHash = await walletClient.writeContract(approveRequest);
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      // Now call depositAndMint on CUSD contract
      const { request: mintRequest } = await publicClient.simulateContract({
        address: cusdAddress as `0x${string}`,
        abi: CUSDJson.abi,
        functionName: "depositAndMint",
        args: [USDCAmount],
        account: address,
      });

      const mintHash = await walletClient.writeContract(mintRequest);
      await publicClient.waitForTransactionReceipt({ hash: mintHash });

      // Update balances and reset form
      fetchBalances();
      setAmount("");
      setSuccess(`Successfully minted CUSD!`);
    } catch (err: unknown) {
      console.error("Error minting CUSD:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to mint CUSD. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // sCUSD vault functions
  const fetchSCUSDVaultData = async () => {
    if (!address || !publicClient) return;

    try {
      // Get contract addresses for current network
      const cusdAddress = getContractAddress("CUSD", chainId);
      const scusdAddress = getContractAddress("sCUSD", chainId);

      if (cusdAddress === '0x0000000000000000000000000000000000000000' ||
        scusdAddress === '0x0000000000000000000000000000000000000000') {
        return;
      }

      // Fetch sCUSD balance (shares)
      const shareBalanceData = (await publicClient.readContract({
        address: scusdAddress as `0x${string}`,
        abi: sCUSDJson.abi,
        functionName: "balanceOf",
        args: [address],
      })) as bigint;
      setSCUSDShareBalance(formatUnits(shareBalanceData, 18));

      // Convert shares to assets to get the user's vault balance in CUSD
      if (shareBalanceData > BigInt(0)) {
        const vaultBalanceData = (await publicClient.readContract({
          address: scusdAddress as `0x${string}`,
          abi: sCUSDJson.abi,
          functionName: "convertToAssets",
          args: [shareBalanceData],
        })) as bigint;
        setSCUSDBalance(formatUnits(vaultBalanceData, 18));
      } else {
        setSCUSDBalance("0");
      }

      // Get total assets and shares to calculate conversion rate
      const totalAssets = (await publicClient.readContract({
        address: scusdAddress as `0x${string}`,
        abi: sCUSDJson.abi,
        functionName: "totalAssets",
        args: [],
      })) as bigint;
      const totalShares = (await publicClient.readContract({
        address: scusdAddress as `0x${string}`,
        abi: sCUSDJson.abi,
        functionName: "totalSupply",
        args: [],
      })) as bigint;

      // Calculate conversion rate (assets per share)
      if (totalShares > BigInt(0)) {
        const assetsPerShare = Number(totalAssets) / Number(totalShares);
        setSCUSDConversionRate(assetsPerShare.toString());
      } else {
        // When no shares exist yet, the exchange rate is 1:1
        setSCUSDConversionRate("1");
      }

      // Preview shares for 10 CUSD deposit
      try {
        const assets = parseUnits("10", 18);
        const previewShares = (await publicClient.readContract({
          address: scusdAddress as `0x${string}`,
          abi: sCUSDJson.abi,
          functionName: "previewDeposit",
          args: [assets],
        })) as bigint;
        setSCUSDDepositPreview(formatUnits(previewShares, 18));
      } catch (err) {
        console.error("Error calculating deposit preview:", err);
        // If preview fails, just show the current share balance
      }
    } catch (err) {
      console.error("Error fetching sCUSD vault data:", err);
    }
  };

  // Helper function to check if contract has required functions
  const checkContractFunctions = async (contractAddress: string, abi: any) => {
    if (!publicClient) return false;

    try {
      // Try to call a basic function to check if contract exists and has expected interface
      await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: abi,
        functionName: "totalAssets",
        args: [],
      });
      return true;
    } catch (error) {
      console.error("Contract function check failed:", error);
      return false;
    }
  };

  // Helper function to log contract details for debugging
  const logContractDetails = async (contractAddress: string, contractName: string) => {
    if (!publicClient) return;

    try {
      console.log(`Checking ${contractName} contract at address:`, contractAddress);

      // Try to get contract code to verify it exists
      const code = await publicClient.getBytecode({ address: contractAddress as `0x${string}` });
      if (!code || code === '0x') {
        console.error(`${contractName} contract has no code at address:`, contractAddress);
        return;
      }

      console.log(`${contractName} contract exists at address:`, contractAddress);
    } catch (error) {
      console.error(`Error checking ${contractName} contract:`, error);
    }
  };

  // Show sCUSD notification helper
  const showSCUSDNotification = (message: string, type: string) => {
    setSCUSDNotification({ show: true, message, type });
    setTimeout(() => {
      setSCUSDNotification({ show: false, message: "", type: "" });
    }, 5000);
  };

  // Handle sCUSD deposit (fixed amount of 10 CUSD)
  const handleSCUSDDeposit = async () => {
    if (!walletClient || !publicClient) {
      showSCUSDNotification("Wallet not connected properly", "error");
      return;
    }

    // Check if user has at least 10 CUSD
    if (parseFloat(CUSDBalance) < 10) {
      showSCUSDNotification("Insufficient CUSD balance. You need at least 10 CUSD to deposit.", "error");
      return;
    }

    setSCUSDLoading(true);
    try {
      // Get contract addresses for current network
      const cusdAddress = getContractAddress("CUSD", chainId);
      const scusdAddress = getContractAddress("sCUSD", chainId);

      if (cusdAddress === '0x0000000000000000000000000000000000000000' ||
        scusdAddress === '0x0000000000000000000000000000000000000000') {
        showSCUSDNotification("Contracts not available on current network", "error");
        setSCUSDLoading(false);
        return;
      }

      // Log contract details for debugging
      await logContractDetails(scusdAddress, "sCUSD");
      await logContractDetails(cusdAddress, "CUSD");

      // Check if sCUSD contract has the expected functions
      const hasContractFunctions = await checkContractFunctions(scusdAddress, sCUSDJson.abi);
      if (!hasContractFunctions) {
        showSCUSDNotification("sCUSD contract not properly deployed or has different interface", "error");
        setSCUSDLoading(false);
        return;
      }

      const depositAmount = "10"; // Fixed amount of 10 CUSD

      // First approve CUSD
      const { request: approveRequest } = await publicClient.simulateContract({
        address: cusdAddress as `0x${string}`,
        abi: CUSDJson.abi,
        functionName: "approve",
        args: [scusdAddress, parseUnits(depositAmount, 18)],
        account: address,
      });

      const approveHash = await walletClient.writeContract(approveRequest);
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      // Try to deposit assets using the deposit function first
      try {
        console.log("Attempting to use deposit function...");
        const { request: depositRequest } = await publicClient.simulateContract({
          address: scusdAddress as `0x${string}`,
          abi: sCUSDJson.abi,
          functionName: "deposit",
          args: [parseUnits(depositAmount, 18), address],
          account: address,
        });

        const depositHash = await walletClient.writeContract(depositRequest);
        await publicClient.waitForTransactionReceipt({ hash: depositHash });
        console.log("Deposit function succeeded");
      } catch (depositError) {
        console.log("Deposit function failed, trying mint function...", depositError);

        try {
          // If deposit fails, try using mint function instead
          // First, calculate how many shares we would get for the assets
          const sharesToMint = (await publicClient.readContract({
            address: scusdAddress as `0x${string}`,
            abi: sCUSDJson.abi,
            functionName: "previewDeposit",
            args: [parseUnits(depositAmount, 18)],
          })) as bigint;

          console.log("Calculated shares to mint:", sharesToMint.toString());

          const { request: mintRequest } = await publicClient.simulateContract({
            address: scusdAddress as `0x${string}`,
            abi: sCUSDJson.abi,
            functionName: "mint",
            args: [sharesToMint, address],
            account: address,
          });

          const mintHash = await walletClient.writeContract(mintRequest);
          await publicClient.waitForTransactionReceipt({ hash: mintHash });
          console.log("Mint function succeeded");
        } catch (mintError) {
          console.log("Mint function also failed:", mintError);

          // If both fail, try a direct transfer approach (fallback)
          try {
            console.log("Trying direct transfer approach...");
            const { request: transferRequest } = await publicClient.simulateContract({
              address: cusdAddress as `0x${string}`,
              abi: CUSDJson.abi,
              functionName: "transfer",
              args: [scusdAddress, parseUnits(depositAmount, 18)],
              account: address,
            });

            const transferHash = await walletClient.writeContract(transferRequest);
            await publicClient.waitForTransactionReceipt({ hash: transferHash });
            console.log("Direct transfer succeeded");
          } catch (transferError) {
            console.log("All deposit methods failed:", transferError);
            throw new Error("All deposit methods failed. Please check contract deployment and try again.");
          }
        }
      }

      fetchSCUSDVaultData();
      showSCUSDNotification(`Successfully deposited ${depositAmount} CUSD`, "success");
    } catch (error: unknown) {
      console.error("Error depositing:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to deposit";
      const networkName = getCurrentNetworkName();
      const scusdAddress = getContractAddress("sCUSD", chainId);

      showSCUSDNotification(
        `Deposit failed on ${networkName}. Contract: ${scusdAddress}. Error: ${errorMessage}`,
        "error"
      );
    } finally {
      setSCUSDLoading(false);
    }
  };

  // Handle sCUSD withdraw
  const handleSCUSDWithdraw = async () => {
    if (!sCUSDAmount || parseFloat(sCUSDAmount) <= 0) {
      showSCUSDNotification("Please enter a valid amount", "error");
      return;
    }

    if (!walletClient || !publicClient) {
      showSCUSDNotification("Wallet not connected properly", "error");
      return;
    }

    setSCUSDLoading(true);
    try {
      // Get contract addresses for current network
      const scusdAddress = getContractAddress("sCUSD", chainId);

      if (scusdAddress === '0x0000000000000000000000000000000000000000') {
        showSCUSDNotification("Contracts not available on current network", "error");
        setSCUSDLoading(false);
        return;
      }

      const { request } = await publicClient.simulateContract({
        address: scusdAddress as `0x${string}`,
        abi: sCUSDJson.abi,
        functionName: "redeem",
        args: [parseUnits(sCUSDAmount, 18), address, address],
        account: address,
      });

      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });

      fetchSCUSDVaultData();
      setSCUSDAmount("");
      showSCUSDNotification(
        `Successfully withdrawn ${sCUSDAmount} CUSD`,
        "success"
      );
    } catch (error: unknown) {
      console.error("Error withdrawing:", error);
      showSCUSDNotification(
        error instanceof Error ? error.message : "Failed to withdraw",
        "error"
      );
    } finally {
      setSCUSDLoading(false);
    }
  };

  // Restaking functions
  // Fetch stCORE balance and delegated amount
  const fetchstCOREBalance = async () => {
    if (!address || !publicClient) return;

    try {
      // Get contract addresses for current network
      const stcoreAddress = getContractAddress("stCORE", chainId);
      const eigenAddress = getContractAddress("Eigen", chainId);

      if (stcoreAddress === '0x0000000000000000000000000000000000000000') {
        return;
      }

      const balanceData = await publicClient.readContract({
        address: stcoreAddress as `0x${string}`,
        abi: stCOREJson.abi,
        functionName: "balanceOf",
        args: [address],
      });

      setstCOREBalance(formatUnits(balanceData as bigint, 18));

      // Also fetch delegated amount
      if (eigenAddress !== '0x0000000000000000000000000000000000000000') {
        try {
          const delegatedData = await publicClient.readContract({
            address: eigenAddress as `0x${string}`,
            abi: EigenJson.abi,
            functionName: "getDelegatedAmount",
            args: [address],
          });

          setDelegatedAmount(formatUnits(delegatedData as bigint, 18));
        } catch (err) {
          console.error("Error fetching delegated amount:", err);
          // If this fails, we'll just show 0 delegated
        }
      }
    } catch (err) {
      console.error("Error fetching stCORE balance:", err);
    }
  };

  // Fetch stCORE balance on mount and when address changes
  useEffect(() => {
    if (isConnected && address && publicClient) {
      fetchstCOREBalance();

      // Set up polling for stCORE balance updates
      const interval = setInterval(() => {
        fetchstCOREBalance();
      }, 5000); // Poll every 5 seconds

      return () => clearInterval(interval);
    }
  }, [address, isConnected, publicClient, chainId]);

  // Handle stCORE amount input change
  const handlestCOREAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers and decimals
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setstCOREAmount(value);
    }
  };

  // Handle max button click for restaking
  const handlestCOREMaxClick = () => {
    if (activeTab === "delegate") {
      setstCOREAmount(stCOREBalance);
    } else {
      setstCOREAmount(delegatedAmount);
    }
  };

  // Show restaking notification
  const showRestakingNotification = (message: string, type: string) => {
    setRestakingNotification({ show: true, message, type });
    setTimeout(() => {
      setRestakingNotification({ show: false, message: "", type: "" });
    }, 5000);
  };

  // Handle stCORE mint (fixed amount of 10 stCORE)
  const handlestCOREMint = async () => {
    if (!walletClient || !publicClient) {
      showRestakingNotification("Wallet not connected properly", "error");
      return;
    }

    setstCORELoading(true);
    try {
      // Get contract addresses for current network
      const stcoreAddress = getContractAddress("stCORE", chainId);

      if (stcoreAddress === '0x0000000000000000000000000000000000000000') {
        showRestakingNotification("stCORE contract not available on current network", "error");
        setstCORELoading(false);
        return;
      }

      // Convert 10 stCORE to units (18 decimals)
      const stCOREAmountUnits = parseUnits("10", 18);

      // Prepare the mint transaction
      const { request } = await publicClient.simulateContract({
        address: stcoreAddress as `0x${string}`,
        abi: stCOREJson.abi,
        functionName: "mint",
        args: [stCOREAmountUnits],
        account: address,
      });

      // Execute the transaction using the wallet's provider
      const hash = await walletClient.writeContract(request);

      // Wait for transaction to complete
      await publicClient.waitForTransactionReceipt({ hash });

      // Update balance
      fetchstCOREBalance();
      showRestakingNotification("Successfully minted 10 stCORE!", "success");
    } catch (error: unknown) {
      console.error("Error minting stCORE:", error);
      showRestakingNotification(
        error instanceof Error ? error.message : "Failed to mint stCORE. Please try again.",
        "error"
      );
    } finally {
      setstCORELoading(false);
    }
  };

  // Handle delegate action (addDelegation)
  const handleDelegate = async () => {
    if (!stCOREAmount || parseFloat(stCOREAmount) <= 0) {
      showRestakingNotification("Please enter a valid amount", "error");
      return;
    }

    if (!walletClient || !publicClient) {
      showRestakingNotification("Wallet not connected properly", "error");
      return;
    }

    setRestakingLoading(true);
    try {
      // Get contract addresses for current network
      const eigenAddress = getContractAddress("Eigen", chainId);

      if (eigenAddress === '0x0000000000000000000000000000000000000000') {
        showRestakingNotification("Eigen contract not available on current network", "error");
        setRestakingLoading(false);
        return;
      }

      const { request } = await publicClient.simulateContract({
        address: eigenAddress as `0x${string}`,
        abi: EigenJson.abi,
        functionName: "addDelegation",
        args: [parseUnits(stCOREAmount, 18)],
        account: address,
      });

      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });

      // Update balance
      fetchstCOREBalance();

      showRestakingNotification(`Successfully delegated ${stCOREAmount} stCORE`, "success");
      setstCOREAmount("");
    } catch (error: unknown) {
      console.error("Delegation error:", error);
      showRestakingNotification(
        error instanceof Error ? error.message : "Failed to delegate tokens",
        "error"
      );
    } finally {
      setRestakingLoading(false);
    }
  };

  // Get current network name
  const getCurrentNetworkName = () => {
    if (chainId === supportedChains.coreTestnet2.id) {
      return "Core Testnet2";
    } else if (chainId === supportedChains.hardhat.id) {
      return "Hardhat";
    }
    return "Unknown Network";
  };

  // Handle undelegate action (removeDelegation)
  const handleUndelegate = async () => {
    if (!stCOREAmount || parseFloat(stCOREAmount) <= 0) {
      showRestakingNotification("Please enter a valid amount", "error");
      return;
    }

    if (!walletClient || !publicClient) {
      showRestakingNotification("Wallet not connected properly", "error");
      return;
    }

    setRestakingLoading(true);
    try {
      // Get contract addresses for current network
      const eigenAddress = getContractAddress("Eigen", chainId);

      if (eigenAddress === '0x0000000000000000000000000000000000000000') {
        showRestakingNotification("Eigen contract not available on current network", "error");
        setRestakingLoading(false);
        return;
      }

      // Call removeDelegation with separate parameters
      const { request } = await publicClient.simulateContract({
        address: eigenAddress as `0x${string}`,
        abi: EigenJson.abi,
        functionName: "removeDelegation",
        args: [parseUnits(stCOREAmount, 18)],
        account: address,
      });

      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });

      // Update balance
      fetchstCOREBalance();

      showRestakingNotification(`Successfully undelegated ${stCOREAmount} stCORE`, "success");
      setstCOREAmount("");
    } catch (error: unknown) {
      console.error("Undelegation error:", error);
      showRestakingNotification(
        error instanceof Error ? error.message : "Failed to undelegate tokens",
        "error"
      );
    } finally {
      setRestakingLoading(false);
    }
  };

  // Loan-related functions
  const showLoanNotification = (message: string, type: string) => {
    setLoanNotification({ show: true, message, type });
    setTimeout(() => {
      setLoanNotification({ show: false, message: "", type: "" });
    }, 5000);
  };



  // Fetch active loan details
  const fetchActiveLoans = async () => {
    if (!address || !publicClient) return;

    try {
      const loanManagerAddress = getContractAddress("LoanManager", chainId);
      if (loanManagerAddress === '0x0000000000000000000000000000000000000000') {
        return;
      }

      const loanDetailsResponse = (await publicClient.readContract({
        address: loanManagerAddress as `0x${string}`,
        abi: LoanManagerJson.abi,
        functionName: "getLoanDetails",
        args: [],
      })) as LoanContractResponse;

      if (loanDetailsResponse) {
        setLoanDetails({
          amount: loanDetailsResponse[0] ? formatUnits(loanDetailsResponse[0], 18) : "0",
          interestRate: loanDetailsResponse[1] ? Number(loanDetailsResponse[1]) / 100 : 0,
          startTime: loanDetailsResponse[2] ? Number(loanDetailsResponse[2]) : 0,
          dueTime: loanDetailsResponse[3] ? Number(loanDetailsResponse[3]) : 0,
          isRepaid: loanDetailsResponse[4] || false,
          collateralAmount: delegatedAmount,
          loanedUSDCAmount: loanDetailsResponse[6] ? formatUnits(loanDetailsResponse[6], 18) : "0",
        });
      }
    } catch (err) {
      console.error("Error fetching active loan:", err);
    }
  };

  // Fetch repayment amount
  const fetchRepaymentAmount = async () => {
    if (!publicClient) return;

    try {
      const loanManagerAddress = getContractAddress("LoanManager", chainId);
      if (loanManagerAddress === '0x0000000000000000000000000000000000000000') {
        return;
      }

      const repaymentAmount = await publicClient.readContract({
        address: loanManagerAddress as `0x${string}`,
        abi: LoanManagerJson.abi,
        functionName: "calculateRepaymentAmount",
        args: [],
      });

      setRepayAmount(formatUnits(repaymentAmount as bigint, 18));
    } catch (err) {
      console.error("Error fetching repayment amount:", err);
    }
  };

  // Handle loan amount change and calculate required collateral
  const handleLoanAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLoanAmount(value);
    setCollateralAmount(calculateCollateral(value));
  };

  // Calculate required collateral (stCORE) based on loan amount (USDC)
  const calculateCollateral = (amount: string) => {
    const loanValue = parseFloat(amount) || 0;
    return (loanValue * 1.5).toFixed(2);
  };

  // Handle take loan action
  const handleTakeLoan = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!loanAmount || parseFloat(loanAmount) <= 0) {
      showLoanNotification("Please enter a valid loan amount", "error");
      return;
    }

    if (!walletClient || !publicClient) {
      showLoanNotification("Wallet not connected properly", "error");
      return;
    }

    setLoanLoading(true);
    try {
      const loanManagerAddress = getContractAddress("LoanManager", chainId);
      if (loanManagerAddress === '0x0000000000000000000000000000000000000000') {
        showLoanNotification("LoanManager contract not available on current network", "error");
        setLoanLoading(false);
        return;
      }

      const loanAmountInWei = parseUnits(loanAmount, 18);

      const { request } = await publicClient.simulateContract({
        address: loanManagerAddress as `0x${string}`,
        abi: LoanManagerJson.abi,
        functionName: "createLoan",
        args: [loanAmountInWei],
        account: address,
      });

      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });

      fetchActiveLoans();
      showLoanNotification(`Successfully created loan for ${loanAmount} USDC`, "success");
      setLoanAmount("");
      setCollateralAmount("");
    } catch (error: unknown) {
      console.error("Error creating loan:", error);
      showLoanNotification(
        error instanceof Error ? error.message : "Failed to create loan",
        "error"
      );
    } finally {
      setLoanLoading(false);
    }
  };

  // Handle repay loan action
  const handleRepayLoan = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!repayAmount || parseFloat(repayAmount) <= 0) {
      showLoanNotification("Please enter a valid repayment amount", "error");
      return;
    }

    if (!walletClient || !publicClient) {
      showLoanNotification("Wallet not connected properly", "error");
      return;
    }

    setLoanLoading(true);
    try {
      const loanManagerAddress = getContractAddress("LoanManager", chainId);
      if (loanManagerAddress === '0x0000000000000000000000000000000000000000') {
        showLoanNotification("LoanManager contract not available on current network", "error");
        setLoanLoading(false);
        return;
      }

      const { request } = await publicClient.simulateContract({
        address: loanManagerAddress as `0x${string}`,
        abi: LoanManagerJson.abi,
        functionName: "repayLoan",
        args: [],
        account: address,
      });

      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });

      fetchActiveLoans();
      showLoanNotification(`Successfully repaid loan`, "success");
      setRepayAmount("");
    } catch (error: unknown) {
      console.error("Error repaying loan:", error);
      showLoanNotification(
        error instanceof Error ? error.message : "Failed to repay loan",
        "error"
      );
    } finally {
      setLoanLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Network Indicator */}
      <div className="container mx-auto px-4 pt-4">
        <div className="text-center">
          <p className="text-gray-300">
            Network: <span className="text-[#FF8C00] font-bold">{getCurrentNetworkName()}</span>
          </p>
        </div>
      </div>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="md:w-1/2 mb-10 md:mb-0">
            <h1
              className="text-6xl font-bold mb-4 font-mono"
              style={{
                letterSpacing: "0.05em",
                textShadow:
                  "0.05em 0 0 rgba(255,0,0,0.75), -0.025em -0.05em 0 rgba(0,255,0,0.75), 0.025em 0.05em 0 rgba(0,0,255,0.75)",
                fontFamily: "monospace",
              }}
            >
              VERIFIABLE MONEY
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-300">
              Stablecoin protocol with credible financial guarantees
            </p>
            <button
              onClick={() => router.push("/mint")}
              className="px-8 py-3 bg-black text-[#FF8C00] text-lg font-semibold border-2 border-[#FF8C00] rounded-md hover:bg-[#FF8C00] hover:text-black transition-colors shadow-[0_0_15px_rgba(198,209,48,0.7)] hover:shadow-[0_0_25px_rgba(198,209,48,1)]"
            >
              LAUNCH APP
            </button>
          </div>

          <div className="md:w-1/2 h-[500px]">
            <StablecoinAnimation />
          </div>
        </div>

        {/* Flow Diagram - Full Width */}
        <div
          className="w-full mt-20 bg-black/90 backdrop-blur-md p-8 rounded-lg border border-gray-700"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)",
            backgroundSize: "10px 10px",
          }}
        >
          <Image
            src="/flow.png"
            alt="Protocol Flow Diagram"
            width={1200}
            height={600}
            className="w-full rounded-lg shadow-lg"
            priority
            style={{
              filter:
                "invert(1) hue-rotate(180deg) brightness(2) contrast(1.5)",
              mixBlendMode: "difference",
              backgroundColor: "transparent",
            }}
          />

          {/* Diagram Explanation */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-[#FF8C00]">
                Collateral Flow
              </h3>
              <ul className="space-y-4 text-gray-300">
                <li className="flex items-start">
                  <span className="text-[#FF8C00] mr-2">1.</span>
                  <span>
                    Users deposit stCORE tokens as collateral into the protocol
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#FF8C00] mr-2">2.</span>
                  <span>
                    stCORE tokens are delegated to verified operators for restaking
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#FF8C00] mr-2">3.</span>
                  <span>
                    Operators provide security across multiple networks
                  </span>
                </li>
              </ul>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-[#FF8C00]">
                Stablecoin Flow
              </h3>
              <ul className="space-y-4 text-gray-300">
                <li className="flex items-start">
                  <span className="text-[#FF8C00] mr-2">4.</span>
                  <span>
                    Users receive CUSD stablecoins against their collateral
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#FF8C00] mr-2">5.</span>
                  <span>
                    CUSD can be deposited into sCUSD vault for yield generation
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#FF8C00] mr-2">6.</span>
                  <span>
                    Yield is generated from operator rewards and lending markets
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Why Choose COREDOTMONEY Section */}
      <div className="container mx-auto px-4 py-20 border-t border-gray-800">
        <div className="text-left mb-16">
          <h2
            className="text-4xl font-bold mb-4 font-mono"
            style={{
              letterSpacing: "0.05em",
              textShadow:
                "0.05em 0 0 rgba(255,140,0,0.75), -0.025em -0.05em 0 rgba(255,127,80,0.75), 0.025em 0.05em 0 rgba(255,99,71,0.75)",
              fontFamily: "monospace",
            }}
          >
            WHY CHOOSE STABLECORECORE
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl">
            Earn yield safely while maintaining access to your funds.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature Box 1 */}
          <div
            className="bg-black p-8 rounded-lg border border-gray-800 hover:border-[#FF8C00] transition duration-300 flex flex-col justify-between min-h-[220px] group"
            style={{
              backgroundImage:
                "radial-gradient(rgba(255, 255, 255, 0.3) 1px, transparent 1px)",
              backgroundSize: "10px 10px",
            }}
          >
            <h3 className="text-xl font-bold mb-4 text-white group-hover:text-gray-200 transition-colors">
              NON-CUSTODIAL
            </h3>
            <div className="bg-black p-4 rounded-lg border border-[#FF8C00] border-opacity-50">
              <p className="text-[#FF8C00] font-bold leading-relaxed">
                No party has access to unsecured user deposits
              </p>
            </div>
          </div>

          {/* Feature Box 2 */}
          <div
            className="bg-black p-8 rounded-lg border border-gray-800 hover:border-[#FF8C00] transition duration-300 flex flex-col justify-between min-h-[220px] group"
            style={{
              backgroundImage:
                "radial-gradient(rgba(255, 255, 255, 0.3) 1px, transparent 1px)",
              backgroundSize: "10px 10px",
            }}
          >
            <h3 className="text-xl font-bold mb-4 text-white group-hover:text-gray-200 transition-colors">
              PRIVATE CREDIT
            </h3>
            <div className="bg-black p-4 rounded-lg border border-[#FF8C00] border-opacity-50">
              <p className="text-[#FF8C00] font-bold leading-relaxed">
                Competitive yield generated by efficient markets
              </p>
            </div>
          </div>

          {/* Feature Box 3 */}
          <div
            className="bg-black p-8 rounded-lg border border-gray-800 hover:border-[#FF8C00] transition duration-300 flex flex-col justify-between min-h-[220px] group"
            style={{
              backgroundImage:
                "radial-gradient(rgba(255, 255, 255, 0.3) 1px, transparent 1px)",
              backgroundSize: "10px 10px",
            }}
          >
            <h3 className="text-xl font-bold mb-4 text-white group-hover:text-gray-200 transition-colors">
              FULLY COVERED YIELD
            </h3>
            <div className="bg-black p-4 rounded-lg border border-[#FF8C00] border-opacity-50">
              <p className="text-[#FF8C00] font-bold leading-relaxed">
                Shared security model underwrites counterparty activity
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-20 border-t border-gray-800">
        <h2
          className="text-4xl font-bold mb-8 font-mono text-center"
          style={{
            letterSpacing: "0.05em",
            textShadow:
              "0.05em 0 0 rgba(255,140,0,0.75), -0.025em -0.05em 0 rgba(255,127,80,0.75), 0.025em 0.05em 0 rgba(255,99,71,0.75)",
            fontFamily: "monospace",
          }}
        >
          STABLECORE TESTNET DEPLOYMENT ADDRESSES
        </h2>
        <div
          className="max-w-4xl mx-auto bg-black p-8 rounded-lg border border-gray-800"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)",
            backgroundSize: "10px 10px",
          }}
        >
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border border-gray-800 p-4 text-left text-[#FF8C00]">
                  Token
                </th>
                <th className="border border-gray-800 p-4 text-left text-[#FF8C00]">
                  Address
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(devnetAddresses).map(([token, address]) => (
                <tr key={token} className="hover:bg-gray-900 transition-colors">
                  <td className="border border-gray-800 p-4 text-gray-300">
                    {token}
                  </td>
                  <td className="border border-gray-800 p-4 text-gray-300 font-mono">
                    {address}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <footer
        className="mt-20 bg-black"
        style={{
          boxShadow: "inset 0 10px 30px -10px rgba(0,0,0,0.3)",
        }}
      >
        {/* Gray top line */}
        <div className="border-t border-gray-600"></div>

        <div className="container mx-auto px-4 py-12">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Company Info */}
            <div className="col-span-1 md:col-span-4">
              <h3 className="text-2xl font-bold text-[#FF8C00] mb-4">StableCORE</h3>
              <p className="text-white mb-4 font-medium">
                The next generation stablecoin protocol with credible <br /> financial guarantees and institutional-grade security.
              </p>
              <div className="flex space-x-4">

              </div>
            </div>
          </div>
        </div>

      </footer>
    </div>
  );
};

export default HomePage;