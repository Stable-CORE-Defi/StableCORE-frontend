"use client";

import React, { useState, useEffect } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import USDCJson from "@/contracts/USDC.sol/USDC.json";
import PUSDJson from "@/contracts/PUSD.sol/PUSD.json";
import ContractAddresses from "../../deployed-address.json";

const MintPage = () => {
  const [amount, setAmount] = useState("");
  const [usdcBalance, setUsdcBalance] = useState("0");
  const [pusdBalance, setPusdBalance] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // Fetch balances
  const fetchBalances = async () => {
    if (!address || !publicClient) return;

    try {
      // Fetch USDC balance
      const usdcBalanceData = await publicClient.readContract({
        address: ContractAddresses.USDC as `0x${string}`,
        abi: USDCJson.abi,
        functionName: "balanceOf",
        args: [address],
      });

      setUsdcBalance(formatUnits(usdcBalanceData as bigint, 18)); // USDC has 18 decimals

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

  // Handle input change
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers and decimals
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  // Handle approve and mint
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
      // First approve USDC spending
      const usdcAmount = parseUnits(amount, 18); // USDC has 18 decimals

      // Check if we have enough USDC
      if (parseFloat(usdcBalance) < parseFloat(amount)) {
        setError(`Insufficient USDC balance. You have ${usdcBalance} USDC.`);
        setLoading(false);
        return;
      }

      // Approve USDC
      const { request: approveRequest } = await publicClient.simulateContract({
        address: ContractAddresses.USDC as `0x${string}`,
        abi: USDCJson.abi,
        functionName: "approve",
        args: [ContractAddresses.PUSD as `0x${string}`, usdcAmount],
        account: address,
      });

      const approveHash = await walletClient.writeContract(approveRequest);
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      // Now call depositAndMint on PUSD contract
      const { request: mintRequest } = await publicClient.simulateContract({
        address: ContractAddresses.PUSD as `0x${string}`,
        abi: PUSDJson.abi,
        functionName: "depositAndMint",
        args: [usdcAmount],
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
      <div className="max-w-2xl mx-auto">
        <h1
          className="text-4xl font-bold mb-6 text-center font-mono"
          style={{
            letterSpacing: "0.05em",
            textShadow:
              "0.05em 0 0 rgba(255,140,0,0.75), -0.025em -0.05em 0 rgba(255,127,80,0.75), 0.025em 0.05em 0 rgba(255,99,71,0.75)",
            fontFamily: "monospace",
          }}
        >
          MINT PUSD
        </h1>

        {!isConnected ? (
          <div className="bg-black border border-gray-800 p-6 rounded-lg shadow-lg mb-6 backdrop-blur-sm bg-[radial-gradient(#333_1px,transparent_1px)] bg-[size:10px_10px]">
            <p className="text-center text-gray-300">
              Please connect your wallet to mint PUSD
            </p>
          </div>
        ) : (
          <>
            <div className="bg-black border border-gray-800 p-6 rounded-lg shadow-lg mb-6 backdrop-blur-sm bg-[radial-gradient(#333_1px,transparent_1px)] bg-[size:10px_10px]">
              <div className="mb-4">
                <p className="text-gray-300 mb-2">
                  Your USDC Balance:{" "}
                  <span className="text-[#FF8C00] font-bold">
                    {usdcBalance} USDC
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
                      <span className="text-gray-400">USDC</span>
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
                PUSD is a yield-bearing stablecoin backed by USDC collateral.
              </p>
              <p className="text-gray-300">
                When you mint PUSD, your USDC is deposited into the protocol and
                used to generate yield through secure lending markets.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MintPage;



