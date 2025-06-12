"use client";

import React, { useState, useEffect } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { parseUnits, formatUnits } from "viem";

import USDCJson from "@/contracts/USDC.sol/USDC.json";
import ContractAddresses from "../../deployed-address.json";

const USDCMint = () => {
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // Fetch balance
  const fetchBalance = async () => {
    if (!address || !publicClient) return;

    try {
      const balanceData = await publicClient.readContract({
        address: ContractAddresses.USDC as `0x${string}`,
        abi: USDCJson.abi,
        functionName: "balanceOf",
        args: [address],
      });

      setBalance(formatUnits(balanceData as bigint, 18)); // USDC has 18 decimals
    } catch (err) {
      console.error("Error fetching balance:", err);
    }
  };

  // Fetch balance on mount and when address changes
  useEffect(() => {
    if (isConnected && address && publicClient) {
      fetchBalance();
    }
  }, [address, isConnected, publicClient]);

 

  // Handle input change
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers and decimals
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  // Handle mint button click
  const handleMint = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert("Please enter a valid amount");
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
      // Convert ETH amount to USDC units (18 decimals)
      const usdcAmount = parseUnits(amount, 18);

      // Prepare the mint transaction
      const { request } = await publicClient.simulateContract({
        address: ContractAddresses.USDC as `0x${string}`,
        abi: USDCJson.abi,
        functionName: "mint",
        args: [usdcAmount],
        account: address,
      });

      // Execute the transaction using the wallet's provider
      const hash = await walletClient.writeContract(request);

      // Wait for transaction to complete
      await publicClient.waitForTransactionReceipt({ hash });

      // Update balance and reset form
      fetchBalance();
      setAmount("");
      setSuccess(`Successfully minted ${amount} USDC!`);
    } catch (err: unknown) {
      console.error("Error minting USDC:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to mint USDC. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-2xl mx-auto">
        <h1
          className="text-4xl font-bold mb-6 text-center font-mono"
          style={{
            letterSpacing: "0.05em",
            textShadow:
              "0.05em 0 0 rgba(255,0,0,0.75), -0.025em -0.05em 0 rgba(0,255,0,0.75), 0.025em 0.05em 0 rgba(0,0,255,0.75)",
            fontFamily: "monospace",
          }}
        >
          USDC MINTER
        </h1>

        {!isConnected ? (
          <div className="bg-black border border-gray-800 p-6 rounded-lg shadow-lg mb-6 backdrop-blur-sm bg-[radial-gradient(#333_1px,transparent_1px)] bg-[size:10px_10px]">
            <p className="text-center text-gray-300">
              Please connect your wallet to mint USDC
            </p>
          </div>
        ) : (
          <>
            <div className="bg-black border border-gray-800 p-6 rounded-lg shadow-lg mb-6 backdrop-blur-sm bg-[radial-gradient(#333_1px,transparent_1px)] bg-[size:10px_10px]">
              <div className="mb-4">
                <p className="text-gray-300 mb-2">
                  Your USDC Balance:{" "}
                  <span className="text-[#C6D130] font-bold">
                    {balance} USDC
                  </span>
                </p>
              </div>

              <div className="mb-6">
                <label
                  htmlFor="amount"
                  className="block text-sm font-medium text-[#C6D130] mb-1"
                >
                  Amount to Mint
                </label>
                <input
                  type="text"
                  id="amount"
                  value={amount}
                  onChange={handleAmountChange}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-black border border-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-[#C6D130]"
                  disabled={loading}
                />
              </div>

              <button
                onClick={handleMint}
                disabled={loading || !amount}
                className={`w-full py-3 px-4 rounded-md text-white font-medium transition-colors ${
                  loading ? "opacity-70" : ""
                } bg-black border border-[#C6D130] shadow-[0_0_15px_rgba(198,209,48,0.7)] hover:shadow-[0_0_20px_rgba(198,209,48,1)] hover:text-[#C6D130]`}
              >
                {loading ? "Processing..." : "Mint USDC"}
              </button>

              {error && (
                <p className="mt-2 text-red-400 text-sm">Error: {error}</p>
              )}

              {success && (
                <p className="mt-2 text-green-400 text-sm">{success}</p>
              )}
            </div>

            <div className="bg-black border border-gray-800 p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-2 text-[#C6D130]">
                About USDC Minting
              </h2>
              <p className="text-gray-300 mb-2">
                This is a testnet version of USDC that you can mint freely for
                testing purposes.
              </p>
              <p className="text-gray-300">
                In production, USDC is a fully-collateralized US dollar
                stablecoin issued by Circle.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default USDCMint;