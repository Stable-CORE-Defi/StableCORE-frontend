"use client";

import React, { useState, useEffect } from "react";
import { useAccount, usePublicClient, useWalletClient, useChainId } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import USDCJson from "@/contracts/USDC/USDC.json";
import sCUSDJson from "@/contracts/sCUSD.sol/sCUSD.json";
import CUSDJson from "@/contracts/CUSD.sol/CUSD.json";
import { getContractAddress, supportedChains } from "../../config";

const SwapPage = () => {
  const [fromToken, setFromToken] = useState("USDC");
  const [toToken, setToToken] = useState("sCUSD");
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [USDCBalance, setUSDCBalance] = useState("0");
  const [sCUSDBalance, setSCUSDBalance] = useState("0");

  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();

  // Fetch balances
  const fetchBalances = async () => {
    if (!address || !publicClient) return;

    try {
      const USDCAddress = getContractAddress("USDC", chainId);
      const sCUSDAddress = getContractAddress("sCUSD", chainId);

      // Fetch USDC balance
      if (USDCAddress !== '0x0000000000000000000000000000000000000000') {
        const USDCBalanceData = await publicClient.readContract({
          address: USDCAddress as `0x${string}`,
          abi: USDCJson.abi,
          functionName: "balanceOf",
          args: [address],
        });
        setUSDCBalance(formatUnits(USDCBalanceData as bigint, 18));
      }

      // Fetch sCUSD balance
      if (sCUSDAddress !== '0x0000000000000000000000000000000000000000') {
        const sCUSDBalanceData = await publicClient.readContract({
          address: sCUSDAddress as `0x${string}`,
          abi: sCUSDJson.abi,
          functionName: "balanceOf",
          args: [address],
        });
        setSCUSDBalance(formatUnits(sCUSDBalanceData as bigint, 18));
      }
    } catch (err) {
      console.error("Error fetching balances:", err);
    }
  };

  // Calculate preview
  const calculateSwap = async () => {
    if (!fromAmount || !publicClient) {
      setToAmount("");
      return;
    }

    try {
      const sCUSDAddress = getContractAddress("sCUSD", chainId);
      if (sCUSDAddress === '0x0000000000000000000000000000000000000000') {
        setToAmount(fromAmount); // 1:1 rate if contract not available
        return;
      }

      const inputAmount = parseUnits(fromAmount, 18);
      
      // Get preview of shares for the input amount
      const previewShares = await publicClient.readContract({
        address: sCUSDAddress as `0x${string}`,
        abi: sCUSDJson.abi,
        functionName: "previewDeposit",
        args: [inputAmount],
      });

      const sharesAmount = formatUnits(previewShares as bigint, 18);
      setToAmount(sharesAmount);
    } catch (err) {
      console.error("Error calculating swap:", err);
      setToAmount(fromAmount); // Fallback to 1:1
    }
  };

  // Handle swap
  const handleSwap = async () => {
    if (!fromAmount || !toAmount || !walletClient || !publicClient) {
      setError("Please enter valid amounts and ensure wallet is connected");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const USDCAddress = getContractAddress("USDC", chainId);
      const sCUSDAddress = getContractAddress("sCUSD", chainId);
      const CUSDAddress = getContractAddress("CUSD", chainId);

      if (!USDCAddress || !sCUSDAddress || !CUSDAddress) {
        throw new Error("Contract addresses not found");
      }

      const inputAmount = parseUnits(fromAmount, 18);

      // First, approve USDC spending by sCUSD vault
      const { request: approveRequest } = await publicClient.simulateContract({
        address: USDCAddress as `0x${string}`,
        abi: USDCJson.abi,
        functionName: "approve",
        args: [sCUSDAddress as `0x${string}`, inputAmount],
        account: address,
      });

      const approveHash = await walletClient.writeContract(approveRequest);
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      // Then deposit USDC to get sCUSD
      const { request: depositRequest } = await publicClient.simulateContract({
        address: sCUSDAddress as `0x${string}`,
        abi: sCUSDJson.abi,
        functionName: "deposit",
        args: [inputAmount, address],
        account: address,
      });

      const depositHash = await walletClient.writeContract(depositRequest);
      await publicClient.waitForTransactionReceipt({ hash: depositHash });

      setSuccess(`Successfully swapped ${fromAmount} USDC for ${toAmount} sCUSD!`);
      setFromAmount("");
      setToAmount("");
      
      // Refresh balances
      setTimeout(() => {
        fetchBalances();
      }, 2000);

    } catch (err: any) {
      console.error("Swap error:", err);
      setError(err.message || "Failed to execute swap");
    } finally {
      setLoading(false);
    }
  };

  // Handle input change
  const handleFromAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setFromAmount(value);
    }
  };

  // Handle max button
  const handleMaxClick = () => {
    setFromAmount(USDCBalance);
  };

  // Fetch balances on mount and when address changes
  useEffect(() => {
    if (isConnected && address && publicClient) {
      fetchBalances();
    }
  }, [address, isConnected, publicClient, chainId]);

  // Calculate swap when fromAmount changes
  useEffect(() => {
    calculateSwap();
  }, [fromAmount]);

  const getCurrentNetworkName = () => {
    if (chainId === supportedChains.coreTestnet2.id) {
      return "Core Testnet2";
    } else if (chainId === supportedChains.hardhat.id) {
      return "Hardhat";
    }
    return "Unknown Network";
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 relative">
      {/* Dotted Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }}></div>
      </div>
      
      <div className="container mx-auto max-w-2xl relative z-10">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-[#FF8C00] mb-2">Swap Tokens</h1>
          <p className="text-gray-400">Trade USDC for sCUSD instantly</p>
        </div>

        {/* Main Swap Card */}
        <div className="bg-black/90 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-gray-700 animate-slide-up relative">
          {/* Dotted Background Pattern for Swap Card */}
          <div className="absolute inset-0 opacity-20 rounded-3xl overflow-hidden">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
              backgroundSize: '15px 15px'
            }}></div>
          </div>
          <div className="relative z-10">
          {/* Network Info */}
          <div className="text-center mb-6">
            <span className="text-sm text-gray-400">Network: </span>
            <span className="text-[#FF8C00] font-semibold">{getCurrentNetworkName()}</span>
          </div>

          {/* From Token */}
          <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 mb-3 border border-gray-700 animate-slide-up" style={{animationDelay: '0.1s'}}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400 text-sm">From</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-400">Balance: {parseFloat(USDCBalance).toFixed(4)}</span>
                <button
                  onClick={handleMaxClick}
                  className="text-[#FF8C00] text-sm hover:text-[#FFA500] transition-colors"
                >
                  MAX
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={fromAmount}
                  onChange={handleFromAmountChange}
                  placeholder="0.0"
                  className="w-full bg-transparent text-2xl font-bold text-white outline-none placeholder-gray-500"
                />
              </div>
              <div className="flex items-center space-x-2 bg-gray-700 rounded-lg px-3 py-1">
                <div className="w-6 h-6 bg-[#FF8C00] rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xs">U</span>
                </div>
                <span className="font-semibold text-sm">USDC</span>
              </div>
            </div>
          </div>

          {/* Swap Arrow */}
          <div className="flex justify-center my-2">
            <div className="w-8 h-8 bg-gray-700/80 backdrop-blur-sm rounded-full flex items-center justify-center border border-gray-600">
              <svg className="w-4 h-4 text-[#FF8C00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </div>
          </div>

          {/* To Token */}
          <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 mb-6 border border-gray-700 animate-slide-up" style={{animationDelay: '0.2s'}}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400 text-sm">To</span>
              <span className="text-sm text-gray-400">Balance: {parseFloat(sCUSDBalance).toFixed(4)}</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={toAmount}
                  readOnly
                  placeholder="0.0"
                  className="w-full bg-transparent text-2xl font-bold text-white outline-none placeholder-gray-500"
                />
              </div>
              <div className="flex items-center space-x-2 bg-gray-700 rounded-lg px-3 py-1">
                <div className="w-6 h-6 bg-[#FF6347] rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xs">S</span>
                </div>
                <span className="font-semibold text-sm">sCUSD</span>
              </div>
            </div>
          </div>



          {/* Swap Button */}
          <button
            onClick={handleSwap}
            disabled={loading || !fromAmount || !isConnected}
            className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-500 animate-slide-up ${
              loading || !fromAmount || !isConnected
                ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-[#FF8C00] to-[#FF6347] text-white hover:from-[#FFA500] hover:to-[#FF8C00] transform hover:scale-105"
            }`}
            style={{animationDelay: '0.5s'}}
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Swapping...</span>
              </div>
            ) : !isConnected ? (
              "Connect Wallet"
            ) : !fromAmount ? (
              "Enter Amount"
            ) : (
              `Swap ${fromAmount} USDC for ${toAmount} sCUSD`
            )}
          </button>

          {/* Error/Success Messages */}
          {error && (
            <div className="mt-4 p-4 bg-red-900/20 border border-red-500 rounded-xl text-red-400 animate-slide-up" style={{animationDelay: '0.6s'}}>
              {error}
            </div>
          )}
          {success && (
            <div className="mt-4 p-4 bg-green-900/20 border border-green-500 rounded-xl text-green-400 animate-slide-up" style={{animationDelay: '0.6s'}}>
              {success}
            </div>
          )}
          </div>
        </div>

        {/* Info Card */}
        <div className="mt-8">
          <div className="bg-black/90 backdrop-blur-md rounded-2xl p-6 border border-gray-700 animate-slide-up hover:scale-105 transition-transform duration-500 relative" style={{animationDelay: '0.7s'}}>
            {/* Dotted Background Pattern for Info Card */}
            <div className="absolute inset-0 opacity-20 rounded-2xl overflow-hidden">
              <div className="absolute inset-0" style={{
                backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
                backgroundSize: '15px 15px'
              }}></div>
            </div>
            <div className="relative z-10">
              <h3 className="text-lg font-semibold text-[#FF8C00] mb-3">About USDC</h3>
              <p className="text-gray-400 text-sm mb-4">
                USDC is a stablecoin pegged to the US Dollar. It's used as the base asset for trading and lending in the StableCORE ecosystem.
              </p>
              <h3 className="text-lg font-semibold text-[#FF6347] mb-3">About sCUSD</h3>
              <p className="text-gray-400 text-sm">
                sCUSD represents shares in the CUSD vault. By swapping USDC for sCUSD, you're depositing into the vault and earning yield.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwapPage;
