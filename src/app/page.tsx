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
import USBDJson from "@/contracts/USBD.sol/USBD.json";
import LoanManagerJson from "@/contracts/LoanManager.sol/LoanManager.json";

interface LoanContractResponse {
  0: bigint; // amount
  1: bigint; // interestRate
  2: bigint; // startTime
  3: bigint; // dueTime
  4: boolean; // isRepaid
  5: bigint; // collateralAmount
  6: bigint; // loanedUSBDAmount
}

const HomePage = () => {
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [USBDBalance, setUSBDBalance] = useState("0");
  const [CUSDBalance, setCUSDBalance] = useState("0");
  const [loading, setLoading] = useState(false);
  const [USBDLoading, setUSBDLoading] = useState(false);
  const [error, setError] = useState("");
  const [USBDError, setUSBDError] = useState("");
  const [success, setSuccess] = useState("");
  const [USBDSuccess, setUSBDSuccess] = useState("");

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
    USBD: "0x9155497EAE31D432C0b13dBCc0615a37f55a2c87",
    stCORE: "0xfB12F7170FF298CDed84C793dAb9aBBEcc01E798",
    CUSD: "0xc1EeD9232A0A44c2463ACB83698c162966FBc78d",
    sCUSD: "0xC220Ed128102d888af857d137a54b9B7573A41b2",
    Operator: "0xfaE849108F2A63Abe3BaB17E21Be077d07e7a9A2",
    Eigen: "0xce830DA8667097BB491A70da268b76a081211814",
    LoanManager: "0xD5bFeBDce5c91413E41cc7B24C8402c59A344f7c"
  };
  // above footer, show a table with devnet address from devnetAddresses
  const router = useRouter();

  // Fetch balances
  const fetchBalances = async () => {
    if (!address || !publicClient) return;

    try {
      console.log("Fetching balances for address:", address);

      // Get contract addresses for current network
      const usbdAddress = getContractAddress("USBD", chainId);
      const cusdAddress = getContractAddress("CUSD", chainId);

      console.log("USBD contract address:", usbdAddress);

      // Fetch USBD balance
      if (usbdAddress !== '0x0000000000000000000000000000000000000000') {
        const USBDBalanceData = await publicClient.readContract({
          address: usbdAddress as `0x${string}`,
          abi: USBDJson.abi,
          functionName: "balanceOf",
          args: [address],
        });

        console.log("Raw USBD balance data:", USBDBalanceData);
        const formattedBalance = formatUnits(USBDBalanceData as bigint, 18);
        console.log("Formatted USBD balance:", formattedBalance);
        setUSBDBalance(formattedBalance);
      } else {
        setUSBDBalance("0");
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

  // Handle USBD mint (fixed amount of 10 USBD)
  const handleUSBDMint = async () => {
    if (!walletClient || !publicClient) {
      setUSBDError("Wallet not connected properly");
      return;
    }

    setUSBDLoading(true);
    setUSBDError("");
    setUSBDSuccess("");

    try {
      console.log("Starting USBD mint process...");
      console.log("User address:", address);

      // Get USBD contract address for current network
      const usbdAddress = getContractAddress("USBD", chainId);
      if (usbdAddress === '0x0000000000000000000000000000000000000000') {
        setUSBDError("USBD contract not available on current network");
        setUSBDLoading(false);
        return;
      }

      console.log("USBD contract address:", usbdAddress);

      // Convert 10 USBD to units (18 decimals)
      const USBDAmountUnits = parseUnits("10", 18);
      console.log("USBD amount in units:", USBDAmountUnits.toString());

      // Prepare the mint transaction
      const { request } = await publicClient.simulateContract({
        address: usbdAddress as `0x${string}`,
        abi: USBDJson.abi,
        functionName: "mint",
        args: [USBDAmountUnits],
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

      setUSBDSuccess("Successfully minted 10 USBD!");
      console.log("USBD mint completed successfully");
    } catch (err: unknown) {
      console.error("Error minting USBD:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to mint USBD. Please try again.";
      setUSBDError(errorMessage);
    } finally {
      setUSBDLoading(false);
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
      const usbdAddress = getContractAddress("USBD", chainId);
      const cusdAddress = getContractAddress("CUSD", chainId);

      if (usbdAddress === '0x0000000000000000000000000000000000000000' ||
        cusdAddress === '0x0000000000000000000000000000000000000000') {
        setError("Contracts not available on current network");
        setLoading(false);
        return;
      }

      // First approve USBD spending
      const USBDAmount = parseUnits(amount, 18); // USBD has 18 decimals

      // Check if we have enough USBD
      if (parseFloat(USBDBalance) < parseFloat(amount)) {
        setError(`Insufficient USBD balance. You have ${USBDBalance} USBD.`);
        setLoading(false);
        return;
      }

      // Approve USBD
      const { request: approveRequest } = await publicClient.simulateContract({
        address: usbdAddress as `0x${string}`,
        abi: USBDJson.abi,
        functionName: "approve",
        args: [cusdAddress as `0x${string}`, USBDAmount],
        account: address,
      });

      const approveHash = await walletClient.writeContract(approveRequest);
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      // Now call depositAndMint on CUSD contract
      const { request: mintRequest } = await publicClient.simulateContract({
        address: cusdAddress as `0x${string}`,
        abi: CUSDJson.abi,
        functionName: "depositAndMint",
        args: [USBDAmount],
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
          loanedUSBDAmount: loanDetailsResponse[6] ? formatUnits(loanDetailsResponse[6], 18) : "0",
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

  // Calculate required collateral (stCORE) based on loan amount (USBD)
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
      showLoanNotification(`Successfully created loan for ${loanAmount} USBD`, "success");
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
          className="w-full mt-20 bg-black p-8 rounded-lg border border-gray-800"
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

      {/* How COREDOTMONEY Works Section */}
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
            HOW STABLECORE WORKS
          </h2>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="flex">
            {/* Left side - Steps with connecting line */}
            <div className="w-1/2 pr-8">
              <div className="relative">
                {/* Vertical connecting line */}
                <div className="absolute left-8 top-16 bottom-0 w-0.5 bg-gradient-to-b from-[#FF8C00] via-[#FF8C00] to-[#FF8C00] opacity-60"></div>

                <div className="space-y-12">
                  {/* Step 1 - Mint */}
                  <div
                    onClick={() => setSelectedStep("mint")}
                    className="flex items-start space-x-6 p-6 rounded-lg hover:bg-gray-900 transition-all duration-300 cursor-pointer group relative"
                  >
                    <div className="flex-shrink-0 relative z-10">
                      <div className="w-16 h-16 rounded-lg border-2 border-gray-600 hover:border-[#FF8C00] transition-colors duration-300 flex items-center justify-center bg-black group-hover:bg-[#FF8C00] group-hover:text-black">
                        <span className="text-2xl font-bold text-white group-hover:text-black transition-colors">1</span>
                      </div>
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-3xl font-bold text-white mb-3 group-hover:text-[#FF8C00] transition-colors">
                        MINT
                      </h3>
                      <p className="text-[#FF8C00] text-lg font-medium leading-relaxed">
                        Mint USBD and get CUSD stablecoins in return.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 - CUSD */}
                  <div
                    onClick={() => setSelectedStep("cusd")}
                    className="flex items-start space-x-6 p-6 rounded-lg hover:bg-gray-900 transition-all duration-300 cursor-pointer group relative"
                  >
                    <div className="flex-shrink-0 relative z-10">
                      <div className="w-16 h-16 rounded-lg border-2 border-gray-600 hover:border-[#FF8C00] transition-colors duration-300 flex items-center justify-center bg-black group-hover:bg-[#FF8C00] group-hover:text-black">
                        <span className="text-2xl font-bold text-white group-hover:text-black transition-colors">2</span>
                      </div>
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-3xl font-bold text-white mb-3 group-hover:text-[#FF8C00] transition-colors">
                        CUSD
                      </h3>
                      <p className="text-[#FF8C00] text-lg font-medium leading-relaxed">
                        CUSD can be converted to sCUSD for yield generation.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 - Restaking */}
                  <div
                    onClick={() => setSelectedStep("restaking")}
                    className="flex items-start space-x-6 p-6 rounded-lg hover:bg-gray-900 transition-all duration-300 cursor-pointer group relative"
                  >
                    <div className="flex-shrink-0 relative z-10">
                      <div className="w-16 h-16 rounded-lg border-2 border-gray-600 hover:border-[#FF8C00] transition-colors duration-300 flex items-center justify-center bg-black group-hover:bg-[#FF8C00] group-hover:text-black">
                        <span className="text-2xl font-bold text-white group-hover:text-black transition-colors">3</span>
                      </div>
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-3xl font-bold text-white mb-3 group-hover:text-[#FF8C00] transition-colors">
                        RESTAKING
                      </h3>
                      <p className="text-[#FF8C00] text-lg font-medium leading-relaxed">
                        Mint stCORE and delegate or undelegate to operators.
                      </p>
                    </div>
                  </div>

                  {/* Step 4 - Loan */}
                  <div
                    className="flex items-start space-x-6 p-6 rounded-lg hover:bg-gray-900 transition-all duration-300 cursor-pointer group relative"
                    onClick={() => setSelectedStep("loan")}
                  >
                    <div className="flex-shrink-0 relative z-10">
                      <div className="w-16 h-16 rounded-lg border-2 border-gray-600 hover:border-[#FF8C00] transition-colors duration-300 flex items-center justify-center bg-black group-hover:bg-[#FF8C00] group-hover:text-black">
                        <span className="text-2xl font-bold text-white group-hover:text-black transition-colors">4</span>
                      </div>
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-3xl font-bold text-white mb-3 group-hover:text-[#FF8C00] transition-colors">
                        LOAN
                      </h3>
                      <p className="text-[#FF8C00] text-lg font-medium leading-relaxed">
                        Take loans from operators using your collateral.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - Dynamic content based on selected step */}
            <div className="w-1/2 pl-8">
              {selectedStep === "mint" && (
                <div className="bg-black border border-gray-800 p-6 rounded-lg shadow-lg backdrop-blur-sm bg-[radial-gradient(#333_1px,transparent_1px)] bg-[size:10px_10px]">
                  <h2 className="text-2xl font-bold mb-6 text-[#FF8C00] font-mono">
                    MINT STABLECOINS
                  </h2>

                  {!isConnected ? (
                    <div className="bg-black border border-gray-800 p-4 rounded-lg">
                      <p className="text-center text-gray-300">
                        Please connect your wallet to mint stablecoins
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* USBD Mint Button */}
                      <div className="mb-6">
                        <div className="bg-black border border-gray-800 p-4 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-gray-300">
                                  Your USBD Balance:{" "}
                                  <span className="text-[#FF8C00] font-bold">
                                    {USBDBalance} USBD
                                  </span>
                                </p>
                                <button
                                  onClick={fetchBalances}
                                  className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300 hover:bg-gray-600"
                                  title="Refresh balance"
                                >
                                  🔄
                                </button>
                              </div>
                              <p className="text-sm text-gray-400">
                                Need USBD to mint CUSD? Get 10 USBD for testing
                              </p>
                            </div>

                            <button
                              onClick={handleUSBDMint}
                              disabled={USBDLoading}
                              className={`px-4 py-2 rounded-md text-white font-medium transition-colors ${USBDLoading ? "opacity-70" : ""
                                } bg-black border border-[#FF8C00] shadow-[0_0_15px_rgba(255,140,0,0.7)] hover:shadow-[0_0_20px_rgba(255,140,0,1)] hover:text-[#FF8C00]`}
                            >
                              {USBDLoading ? "Processing..." : "Mint 10 USBD"}
                            </button>
                          </div>

                          {USBDError && (
                            <p className="mt-2 text-red-400 text-sm">Error: {USBDError}</p>
                          )}

                          {USBDSuccess && (
                            <p className="mt-2 text-green-400 text-sm">{USBDSuccess}</p>
                          )}
                        </div>
                      </div>

                      {/* CUSD Mint Box */}
                      <div className="bg-black border border-gray-800 p-4 rounded-lg mb-4">
                        <h3 className="text-xl font-bold mb-4 text-[#FF8C00] font-mono">
                          MINT CUSD
                        </h3>

                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-gray-300">
                              Your USBD Balance:{" "}
                              <span className="text-[#FF8C00] font-bold">
                                {USBDBalance} USBD
                              </span>
                            </p>
                            <button
                              onClick={fetchBalances}
                              className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300 hover:bg-gray-600"
                              title="Refresh balance"
                            >
                              🔄
                            </button>
                          </div>
                          <p className="text-gray-300 mb-4">
                            Your CUSD Balance:{" "}
                            <span className="text-[#FF8C00] font-bold">
                              {CUSDBalance} CUSD
                            </span>
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <label
                              htmlFor="amount"
                              className="block text-sm font-medium text-[#FF8C00] mb-1"
                            >
                              Deposit
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                id="amount"
                                value={amount}
                                onChange={handleAmountChange}
                                placeholder="0.00"
                                className="w-full px-3 py-2 bg-black border border-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF8C00]"
                                disabled={loading}
                              />
                              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <span className="text-gray-400">USBD</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-[#FF8C00] mb-1">
                              Receive
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                value={amount || "0.0"}
                                readOnly
                                className="w-full px-3 py-2 bg-gray-800 bg-opacity-50 border border-gray-700 text-white rounded-md"
                              />
                              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <span className="text-gray-400">CUSD</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={handleMint}
                          disabled={loading || !amount}
                          className={`w-full py-3 px-4 rounded-md text-white font-medium transition-colors ${loading ? "opacity-70" : ""
                            } bg-black border border-[#FF8C00] shadow-[0_0_15px_rgba(255,140,0,0.7)] hover:shadow-[0_0_20px_rgba(255,140,0,1)] hover:text-[#FF8C00]`}
                        >
                          {loading ? "Processing..." : "Mint CUSD"}
                        </button>

                        {error && (
                          <p className="mt-2 text-red-400 text-sm">Error: {error}</p>
                        )}

                        {success && (
                          <p className="mt-2 text-green-400 text-sm">{success}</p>
                        )}
                      </div>

                      <div className="bg-black border border-gray-800 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold mb-2 text-[#FF8C00]">
                          About CUSD
                        </h3>
                        <p className="text-gray-300 mb-2">
                          CUSD is a yield-bearing stablecoin backed by USBD collateral.
                        </p>
                        <p className="text-gray-300">
                          When you mint CUSD, your USBD is deposited into the protocol and
                          used to generate yield through secure lending markets.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {selectedStep === "restaking" && (
                <div className="bg-black border border-gray-800 p-6 rounded-lg shadow-lg backdrop-blur-sm bg-[radial-gradient(#333_1px,transparent_1px)] bg-[size:10px_10px]">
                  <h2 className="text-2xl font-bold mb-6 text-[#FF8C00] font-mono">
                    RESTAKING
                  </h2>

                  {/* Notification */}
                  {restakingNotification.show && (
                    <div
                      className={`mb-4 p-3 rounded-md ${restakingNotification.type === "error"
                        ? "bg-red-900 bg-opacity-50 text-red-200"
                        : "bg-green-900 bg-opacity-50 text-green-200"
                        }`}
                    >
                      {restakingNotification.message}
                    </div>
                  )}

                  {!isConnected ? (
                    <div className="bg-black border border-gray-800 p-4 rounded-lg">
                      <p className="text-center text-gray-300">
                        Please connect your wallet to use restaking features
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* stCORE Mint Button - Above Main Content */}
                      <div className="mb-6">
                        <div className="bg-black border border-gray-800 p-4 rounded-lg shadow-lg backdrop-blur-sm bg-[radial-gradient(#333_1px,transparent_1px)] bg-[size:10px_10px]">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-gray-300 mb-1">
                                Your stCORE Balance:{" "}
                                <span className="text-[#FF8C00] font-bold">
                                  {stCOREBalance} stCORE
                                </span>
                              </p>
                              <p className="text-sm text-gray-400">
                                Need stCORE to delegate? Get 10 stCORE for testing
                              </p>
                            </div>

                            <button
                              onClick={handlestCOREMint}
                              disabled={stCORELoading}
                              className={`px-6 py-3 rounded-md text-white font-medium transition-colors ${stCORELoading ? "opacity-70" : ""
                                } bg-black border border-[#FF8C00] shadow-[0_0_15px_rgba(255,140,0,0.7)] hover:shadow-[0_0_20px_rgba(255,140,0,1)] hover:text-[#FF8C00]`}
                            >
                              {stCORELoading ? "Processing..." : "Mint 10 stCORE"}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Main Content */}
                      <div className="bg-black border border-gray-800 p-6 rounded-lg shadow-lg backdrop-blur-sm bg-[radial-gradient(#333_1px,transparent_1px)] bg-[size:10px_10px]">
                        {/* Tabs */}
                        <div className="flex mb-6 border-b border-gray-800">
                          <button
                            onClick={() => setActiveTab("delegate")}
                            className={`py-2 px-4 ${activeTab === "delegate"
                              ? "text-[#FF8C00] border-b-2 border-[#FF8C00]"
                              : "text-gray-400"
                              }`}
                          >
                            Delegate
                          </button>
                          <button
                            onClick={() => setActiveTab("undelegate")}
                            className={`py-2 px-4 ${activeTab === "undelegate"
                              ? "text-[#FF8C00] border-b-2 border-[#FF8C00]"
                              : "text-gray-400"
                              }`}
                          >
                            Undelegate
                          </button>
                        </div>

                        {/* Balance Display */}
                        <div className="mb-6 p-4 bg-gray-900 bg-opacity-50 rounded-lg">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-gray-400">Your stCORE Balance</span>
                            <span className="text-xl font-semibold">{stCOREBalance} stCORE</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Delegated stCORE</span>
                            <span className="text-xl font-semibold">
                              {delegatedAmount} stCORE
                            </span>
                          </div>
                        </div>

                        {/* Input Form */}
                        <div className="mb-6">
                          <label className="block text-sm font-medium text-[#FF8C00] mb-1">
                            {activeTab === "delegate"
                              ? "Amount to Delegate"
                              : "Amount to Undelegate"}
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={stCOREAmount}
                              onChange={handlestCOREAmountChange}
                              placeholder="0.00"
                              className="w-full px-3 py-2 bg-gray-800 bg-opacity-50 border border-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF8C00]"
                              disabled={restakingLoading}
                            />
                            <button
                              onClick={handlestCOREMaxClick}
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs bg-gray-700 px-2 py-1 rounded text-gray-300 hover:bg-gray-600"
                            >
                              MAX
                            </button>
                          </div>
                        </div>

                        {/* Action Button */}
                        <div>
                          <button
                            onClick={
                              activeTab === "delegate" ? handleDelegate : handleUndelegate
                            }
                            disabled={restakingLoading}
                            className={`w-full py-3 px-4 rounded-md text-white font-medium transition-colors ${restakingLoading ? "opacity-70" : ""
                              } bg-black border border-[#FF8C00] shadow-[0_0_15px_rgba(255,140,0,0.7)] hover:shadow-[0_0_20px_rgba(255,140,0,1)] hover:text-[#FF8C00]`}
                          >
                            {restakingLoading
                              ? "Processing..."
                              : activeTab === "delegate"
                                ? "Delegate Tokens"
                                : "Undelegate Tokens"}
                          </button>
                        </div>
                      </div>

                      {/* Additional Info - with plain background */}
                      <div className="mt-8 bg-black border border-gray-800 p-4 rounded-lg backdrop-blur-sm bg-[radial-gradient(#333_1px,transparent_1px)] bg-[size:10px_10px]">
                        <h2 className="text-lg font-semibold mb-2 text-[#FF8C00]">
                          About Restaking
                        </h2>
                        <p className="text-gray-300 mb-2">
                          Restaking allows you to earn rewards by providing security to the
                          network. Your delegated tokens help secure multiple blockchain
                          protocols simultaneously.
                        </p>
                        <p className="text-gray-300">
                          When you delegate your stCORE tokens to an operator, they can use your
                          stake to validate transactions across different networks, increasing
                          your potential rewards.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {selectedStep === "cusd" && (
                <div className="bg-black border border-gray-800 p-6 rounded-lg shadow-lg backdrop-blur-sm bg-[radial-gradient(#333_1px,transparent_1px)] bg-[size:10px_10px]">
                  <h2 className="text-2xl font-bold mb-6 text-[#FF8C00] font-mono">
                    SCUSD VAULT
                  </h2>

                  {/* Notification */}
                  {sCUSDNotification.show && (
                    <div
                      className={`mb-4 p-3 rounded-md ${sCUSDNotification.type === "error"
                        ? "bg-red-900 bg-opacity-50 text-red-200"
                        : "bg-green-900 bg-opacity-50 text-green-200"
                        }`}
                    >
                      {sCUSDNotification.message}
                    </div>
                  )}

                  {!isConnected ? (
                    <div className="bg-black border border-gray-800 p-4 rounded-lg">
                      <p className="text-center text-gray-300">
                        Please connect your wallet to use sCUSD vault
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Main sCUSD Vault Interface */}
                      <div className="bg-black border border-gray-800 p-4 rounded-lg mb-4">
                        {/* Tabs */}
                        <div className="flex mb-4 border-b border-gray-800">
                          <button
                            onClick={() => setSCUSDActiveTab("deposit")}
                            className={`py-2 px-4 ${sCUSDActiveTab === "deposit"
                              ? "text-[#FF8C00] border-b-2 border-[#FF8C00]"
                              : "text-gray-400"
                              }`}
                          >
                            Deposit
                          </button>
                          <button
                            onClick={() => setSCUSDActiveTab("withdraw")}
                            className={`py-2 px-4 ${sCUSDActiveTab === "withdraw"
                              ? "text-[#FF8C00] border-b-2 border-[#FF8C00]"
                              : "text-gray-400"
                              }`}
                          >
                            Withdraw
                          </button>
                        </div>

                        {/* Balances */}
                        <div className="mb-4 p-3 bg-gray-900 bg-opacity-50 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-400 text-sm">Your CUSD Balance</span>
                            <span className="text-lg font-semibold">{CUSDBalance} CUSD</span>
                          </div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-400 text-sm">Your Vault Balance</span>
                            <span className="text-lg font-semibold">{sCUSDBalance} CUSD</span>
                          </div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-400 text-sm">Your sCUSD Balance</span>
                            <span className="text-lg font-semibold">
                              {sCUSDShareBalance} sCUSD
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-sm">Exchange Rate</span>
                            <span className="text-lg font-semibold">
                              {sCUSDConversionRate} CUSD per sCUSD
                            </span>
                          </div>
                        </div>

                        {/* Deposit Preview - Show for deposit tab */}
                        {sCUSDActiveTab === "deposit" && (
                          <div className="mb-4">
                            <div className="p-4 bg-gray-900 bg-opacity-50 rounded-lg">
                              <p className="text-sm text-gray-400 mb-2">
                                Deposit Amount: <span className="text-[#FF8C00] font-bold">10 CUSD</span>
                              </p>
                              <p className="text-sm text-gray-400">
                                You will receive: <span className="text-[#FF8C00] font-bold">~{sCUSDDepositPreview} sCUSD</span>
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Amount Input - Only show for withdraw tab */}
                        {sCUSDActiveTab === "withdraw" && (
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-[#FF8C00] mb-1">
                              sCUSD Shares to Redeem
                            </label>
                            <input
                              type="text"
                              value={sCUSDAmount}
                              onChange={handleSCUSDAmountChange}
                              placeholder="0.00"
                              className="w-full px-3 py-2 bg-gray-800 bg-opacity-50 border border-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF8C00]"
                              disabled={sCUSDLoading}
                            />
                          </div>
                        )}

                        {/* Action Button */}
                        {sCUSDActiveTab === "deposit" ? (
                          <button
                            onClick={handleSCUSDDeposit}
                            disabled={sCUSDLoading || parseFloat(CUSDBalance) < 10}
                            className={`w-full py-3 px-4 rounded-md text-white font-medium transition-colors ${sCUSDLoading || parseFloat(CUSDBalance) < 10 ? "opacity-50 cursor-not-allowed" : ""
                              } bg-black border border-[#FF8C00] shadow-[0_0_15px_rgba(255,140,0,0.7)] hover:shadow-[0_0_20px_rgba(255,140,0,1)] hover:text-[#FF8C00]`}
                          >
                            {sCUSDLoading
                              ? "Processing..."
                              : parseFloat(CUSDBalance) < 10
                                ? "Insufficient CUSD Balance (Need 10+ CUSD)"
                                : "Deposit 10 CUSD"}
                          </button>
                        ) : (
                          <button
                            onClick={handleSCUSDWithdraw}
                            disabled={sCUSDLoading || !sCUSDAmount}
                            className={`w-full py-3 px-4 rounded-md text-white font-medium transition-colors ${sCUSDLoading ? "opacity-70" : ""
                              } bg-black border border-[#FF8C00] shadow-[0_0_15px_rgba(255,140,0,0.7)] hover:shadow-[0_0_20px_rgba(255,140,0,1)] hover:text-[#FF8C00]`}
                          >
                            {sCUSDLoading ? "Processing..." : "Withdraw CUSD"}
                          </button>
                        )}
                      </div>

                      {/* About sCUSD Vault */}
                      <div className="bg-black border border-gray-800 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold mb-2 text-[#FF8C00]">
                          About sCUSD Vault
                        </h3>
                        <p className="text-gray-300 mb-2 text-sm">
                          sCUSD is an ERC4626 tokenized vault that accepts CUSD deposits and
                          provides sCUSD shares in return.
                        </p>
                        <p className="text-gray-300 text-sm">
                          The vault automatically compounds yield from lending markets,
                          increasing the value of each sCUSD share over time.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {selectedStep === "loan" && (
                <div className="bg-black border border-gray-800 p-6 rounded-lg shadow-lg backdrop-blur-sm bg-[radial-gradient(#333_1px,transparent_1px)] bg-[size:10px_10px]">
                  <h2 className="text-2xl font-bold mb-6 text-[#FF8C00] font-mono">
                    LOAN MANAGEMENT
                  </h2>

                  {!isConnected ? (
                    <div className="bg-black border border-gray-800 p-4 rounded-lg">
                      <p className="text-center text-gray-300">
                        Please connect your wallet to manage loans
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Loan Notification */}
                      {loanNotification.show && (
                        <div
                          className={`mb-4 p-3 rounded-md ${loanNotification.type === "error"
                            ? "bg-red-900 bg-opacity-50 text-red-200"
                            : "bg-green-900 bg-opacity-50 text-green-200"
                            }`}
                        >
                          {loanNotification.message}
                        </div>
                      )}

                      {/* Tabs */}
                      <div className="flex mb-6 border-b border-gray-800">
                        <button
                          onClick={() => setLoanActiveTab("take")}
                          className={`py-2 px-4 ${loanActiveTab === "take"
                            ? "text-[#FF8C00] border-b-2 border-[#FF8C00]"
                            : "text-gray-400"
                            }`}
                        >
                          Take Loan
                        </button>
                        <button
                          onClick={() => setLoanActiveTab("repay")}
                          className={`py-2 px-4 ${loanActiveTab === "repay"
                            ? "text-[#FF8C00] border-b-2 border-[#FF8C00]"
                            : "text-gray-400"
                            }`}
                        >
                          Repay Loan
                        </button>
                      </div>

                      {/* Take Loan Tab */}
                      {loanActiveTab === "take" && (
                        <div>
                          {loanDetails &&
                            !loanDetails.isRepaid &&
                            parseFloat(loanDetails.amount) > 0 ? (
                            <div className="mb-6 p-4 bg-red-900 bg-opacity-50 rounded-lg">
                              <h3 className="text-xl font-semibold mb-4 text-red-200">
                                Existing Active Loan
                              </h3>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-gray-400">Loan Amount</p>
                                  <p className="font-medium">{loanDetails.amount} USBD</p>
                                </div>
                                <div>
                                  <p className="text-gray-400">Delegated stCORE</p>
                                  <p className="font-medium">
                                    {loanDetails.collateralAmount} stCORE
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-400">Due Date</p>
                                  <p className="font-medium">
                                    {new Date(
                                      Number(loanDetails.dueTime) * 1000
                                    ).toLocaleDateString()}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-400">Status</p>
                                  <p className="font-medium text-red-200">Active</p>
                                </div>
                              </div>
                              <p className="mt-4 text-red-200">
                                Please repay your existing loan before taking a new one.
                              </p>
                              <button
                                onClick={() => setLoanActiveTab("repay")}
                                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                              >
                                Go to Repay Loan
                              </button>
                            </div>
                          ) : (
                            <form onSubmit={handleTakeLoan}>
                              <div className="mb-6">
                                <label className="block text-gray-300 mb-2">
                                  Loan Amount (USBD)
                                </label>
                                <input
                                  type="number"
                                  value={loanAmount}
                                  onChange={handleLoanAmountChange}
                                  placeholder="Enter loan amount"
                                  className="w-full p-4 bg-gray-900 rounded-lg text-white outline-none"
                                  required
                                />
                              </div>

                              <div className="mb-6">
                                <label className="block text-gray-300 mb-2">
                                  Required Delegation (stCORE)
                                </label>
                                <input
                                  type="number"
                                  value={collateralAmount}
                                  readOnly
                                  className="w-full p-4 bg-gray-900 rounded-lg text-white outline-none"
                                />
                                <p className="text-sm text-gray-400 mt-2">
                                  Collateral ratio: 150%
                                </p>
                              </div>

                              <div className="mb-8 p-4 bg-gray-900 rounded-lg">
                                <h3 className="font-bold mb-2">Loan Terms</h3>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-gray-400">Interest Rate (APR)</p>
                                    <p className="font-medium">5.0%</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400">Term Length</p>
                                    <p className="font-medium">90 days</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400">Liquidation Threshold</p>
                                    <p className="font-medium">120%</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400">Origination Fee</p>
                                    <p className="font-medium">0.5%</p>
                                  </div>
                                </div>
                              </div>

                              <button
                                type="submit"
                                disabled={loanLoading}
                                className={`w-full bg-[#FF8C00] text-black py-4 rounded-lg font-bold text-lg hover:bg-opacity-90 transition duration-300 ${loanLoading ? "opacity-70" : ""
                                  }`}
                              >
                                {loanLoading ? "PROCESSING..." : "TAKE LOAN"}
                              </button>
                            </form>
                          )}
                        </div>
                      )}

                      {/* Repay Loan Tab */}
                      {loanActiveTab === "repay" && (
                        <div>
                          {loanDetails &&
                            !loanDetails.isRepaid &&
                            parseFloat(loanDetails.amount) > 0 ? (
                            <form onSubmit={handleRepayLoan}>
                              <div className="mb-6">
                                <label className="block text-gray-300 mb-2">
                                  Loan to Repay
                                </label>
                                <div className="w-full p-4 bg-gray-900 rounded-lg text-white">
                                  {loanDetails.amount} USBD (Due:{" "}
                                  {new Date(
                                    Number(loanDetails.dueTime) * 1000
                                  ).toLocaleDateString()}
                                  )
                                </div>
                              </div>

                              <div className="mb-6">
                                <label className="block text-gray-300 mb-2">
                                  Repayment Amount (USBD)
                                </label>
                                <input
                                  type="number"
                                  value={repayAmount}
                                  readOnly
                                  className="w-full p-4 bg-gray-900 rounded-lg text-white outline-none"
                                />
                                <p className="text-sm text-gray-400 mt-2">
                                  Full repayment will release all delegation
                                </p>
                              </div>

                              <div className="mb-8 p-4 bg-gray-900 rounded-lg">
                                <h3 className="font-bold mb-2">Loan Details</h3>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-gray-400">Principal</p>
                                    <p className="font-medium">{loanDetails.amount} USBD</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400">Interest Due</p>
                                    <p className="font-medium">
                                      {Number(loanDetails.amount).toFixed(2)} USBD
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400">Delegation to Release</p>
                                    <p className="font-medium">
                                      {loanDetails.collateralAmount} stCORE
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400">Due Date</p>
                                    <p className="font-medium">
                                      {new Date(
                                        Number(loanDetails.dueTime) * 1000
                                      ).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <button
                                type="submit"
                                className="w-full bg-[#FF8C00] text-black py-4 rounded-lg font-bold text-lg hover:bg-opacity-90 transition duration-300"
                                disabled={loanLoading}
                              >
                                {loanLoading ? "PROCESSING..." : "REPAY LOAN"}
                              </button>
                            </form>
                          ) : (
                            <div className="text-center py-8 text-gray-400">
                              <p className="mb-4">No active loans found to repay.</p>
                              <button
                                onClick={() => setLoanActiveTab("take")}
                                className="px-6 py-2 bg-[#FF8C00] text-black rounded-lg font-medium hover:bg-opacity-90 transition duration-300"
                              >
                                Take a New Loan
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {!selectedStep && (
                <div className="bg-black border border-gray-800 p-6 rounded-lg shadow-lg backdrop-blur-sm bg-[radial-gradient(#333_1px,transparent_1px)] bg-[size:10px_10px]">
                  <h2 className="text-2xl font-bold mb-6 text-[#FF8C00] font-mono">
                    SELECT A STEP
                  </h2>
                  <p className="text-gray-300">
                    Click on any step in the "How StableCORE Works" section to see the corresponding interface.
                  </p>
                </div>
              )}
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