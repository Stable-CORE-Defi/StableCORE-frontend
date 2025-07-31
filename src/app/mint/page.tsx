"use client";

import React, { useState, useEffect } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import USBDJson from "@/contracts/USBD/USBD.json";
import PUSDJson from "@/contracts/PUSD.sol/PUSD.json";
import ContractAddresses from "../../deployed-address.json";

const MintPage = () => {
  const [amount, setAmount] = useState("");
  const [USBDBalance, setUSBDBalance] = useState("0");
  const [pusdBalance, setPusdBalance] = useState("0");
  const [loading, setLoading] = useState(false);
  const [USBDLoading, setUSBDLoading] = useState(false);
  const [error, setError] = useState("");
  const [USBDError, setUSBDError] = useState("");
  const [success, setSuccess] = useState("");
  const [USBDSuccess, setUSBDSuccess] = useState("");

  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // Fetch balances
  const fetchBalances = async () => {
    if (!address || !publicClient) return;

    try {
      // Fetch USBD balance
      const USBDBalanceData = await publicClient.readContract({
        address: ContractAddresses.USBD as `0x${string}`,
        abi: USBDJson.abi,
        functionName: "balanceOf",
        args: [address],
      });

      setUSBDBalance(formatUnits(USBDBalanceData as bigint, 18)); // USBD has 18 decimals

      // Fetch PUSD balance
      const pusdBalanceData = await publicClient.readContract({
        address: ContractAddresses.PUSD as `0x${string}`,
        abi: PUSDJson.abi,
        functionName: "balanceOf",
        args: [address],
      });

      setPusdBalance(formatUnits(pusdBalanceData as bigint, 18)); // PUSD has 18 decimals
    } catch (err) {
      console.error("Error fetching balances:", err);
    }
  };

  // Fetch balances on mount and when address changes
  useEffect(() => {
    if (isConnected && address && publicClient) {
      fetchBalances();
    }
  }, [address, isConnected, publicClient]);

  // Handle input change for PUSD
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers and decimals
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
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
      // Convert 10 USBD to units (18 decimals)
      const USBDAmountUnits = parseUnits("10", 18);

      // Prepare the mint transaction
      const { request } = await publicClient.simulateContract({
        address: ContractAddresses.USBD as `0x${string}`,
        abi: USBDJson.abi,
        functionName: "mint",
        args: [USBDAmountUnits],
        account: address,
      });

      // Execute the transaction using the wallet's provider
      const hash = await walletClient.writeContract(request);

      // Wait for transaction to complete
      await publicClient.waitForTransactionReceipt({ hash });

      // Update balance
      fetchBalances();
      setUSBDSuccess("Successfully minted 10 USBD!");
    } catch (err: unknown) {
      console.error("Error minting USBD:", err);
      setUSBDError(
        err instanceof Error
          ? err.message
          : "Failed to mint USBD. Please try again."
      );
    } finally {
      setUSBDLoading(false);
    }
  };

  // Handle approve and mint PUSD
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
        address: ContractAddresses.USBD as `0x${string}`,
        abi: USBDJson.abi,
        functionName: "approve",
        args: [ContractAddresses.PUSD as `0x${string}`, USBDAmount],
        account: address,
      });

      const approveHash = await walletClient.writeContract(approveRequest);
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      // Now call depositAndMint on PUSD contract
      const { request: mintRequest } = await publicClient.simulateContract({
        address: ContractAddresses.PUSD as `0x${string}`,
        abi: PUSDJson.abi,
        functionName: "depositAndMint",
        args: [USBDAmount],
        account: address,
      });

      const mintHash = await walletClient.writeContract(mintRequest);
      await publicClient.waitForTransactionReceipt({ hash: mintHash });

      // Update balances and reset form
      fetchBalances();
      setAmount("");
      setSuccess(`Successfully minted PUSD!`);
    } catch (err: unknown) {
      console.error("Error minting PUSD:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to mint PUSD. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1
          className="text-4xl font-bold mb-6 text-center font-mono"
          style={{
            letterSpacing: "0.05em",
            textShadow:
              "0.05em 0 0 rgba(255,140,0,0.75), -0.025em -0.05em 0 rgba(255,127,80,0.75), 0.025em 0.05em 0 rgba(255,99,71,0.75)",
            fontFamily: "monospace",
          }}
        >
          MINT STABLECOINS
        </h1>

        {!isConnected ? (
          <div className="bg-black border border-gray-800 p-6 rounded-lg shadow-lg mb-6 backdrop-blur-sm bg-[radial-gradient(#333_1px,transparent_1px)] bg-[size:10px_10px]">
            <p className="text-center text-gray-300">
              Please connect your wallet to mint stablecoins
            </p>
          </div>
        ) : (
          <>
            {/* USBD Mint Button - Above PUSD Box */}
            <div className="max-w-2xl mx-auto mb-6">
              <div className="bg-black border border-gray-800 p-4 rounded-lg shadow-lg backdrop-blur-sm bg-[radial-gradient(#333_1px,transparent_1px)] bg-[size:10px_10px]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 mb-1">
                      Your USBD Balance:{" "}
                      <span className="text-[#FF8C00] font-bold">
                        {USBDBalance} USBD
                      </span>
                    </p>
                    <p className="text-sm text-gray-400">
                      Need USBD to mint PUSD? Get 10 USBD for testing
                    </p>
                  </div>
                  
                  <button
                    onClick={handleUSBDMint}
                    disabled={USBDLoading}
                    className={`px-6 py-3 rounded-md text-white font-medium transition-colors ${
                      USBDLoading ? "opacity-70" : ""
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

            {/* PUSD Mint Box */}
            <div className="max-w-2xl mx-auto">
              <div className="bg-black border border-gray-800 p-6 rounded-lg shadow-lg mb-6 backdrop-blur-sm bg-[radial-gradient(#333_1px,transparent_1px)] bg-[size:10px_10px]">
                <h2 className="text-2xl font-bold mb-4 text-[#FF8C00] font-mono">
                  MINT PUSD
                </h2>
                
                <div className="mb-4">
                  <p className="text-gray-300 mb-2">
                    Your USBD Balance:{" "}
                    <span className="text-[#FF8C00] font-bold">
                      {USBDBalance} USBD
                    </span>
                  </p>
                  <p className="text-gray-300 mb-4">
                    Your PUSD Balance:{" "}
                    <span className="text-[#FF8C00] font-bold">
                      {pusdBalance} PUSD
                    </span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-6">
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
                        <span className="text-gray-400">PUSD</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleMint}
                  disabled={loading || !amount}
                  className={`w-full py-3 px-4 rounded-md text-white font-medium transition-colors ${
                    loading ? "opacity-70" : ""
                  } bg-black border border-[#FF8C00] shadow-[0_0_15px_rgba(255,140,0,0.7)] hover:shadow-[0_0_20px_rgba(255,140,0,1)] hover:text-[#FF8C00]`}
                >
                  {loading ? "Processing..." : "Mint PUSD"}
                </button>

                {error && (
                  <p className="mt-2 text-red-400 text-sm">Error: {error}</p>
                )}

                {success && (
                  <p className="mt-2 text-green-400 text-sm">{success}</p>
                )}
              </div>

              <div className="bg-black border border-gray-800 p-4 rounded-lg backdrop-blur-sm bg-[radial-gradient(#333_1px,transparent_1px)] bg-[size:10px_10px]">
                <h2 className="text-lg font-semibold mb-2 text-[#FF8C00]">
                  About PUSD
                </h2>
                <p className="text-gray-300 mb-2">
                  PUSD is a yield-bearing stablecoin backed by USBD collateral.
                </p>
                <p className="text-gray-300">
                  When you mint PUSD, your USBD is deposited into the protocol and
                  used to generate yield through secure lending markets.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MintPage;



