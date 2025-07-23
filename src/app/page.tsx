"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import StablecoinAnimation from "./components/StablecoinAnimation";
import Link from "next/link";
import Image from "next/image";
import USDCJson from "@/contracts/USDC.sol/USDC.json";
import PUSDJson from "@/contracts/PUSD.sol/PUSD.json";
import LSTJson from "@/contracts/LST.sol/LST.json";
import EigenJson from "@/contracts/Eigen.sol/Eigen.json";
import ContractAddresses from "../deployed-address.json";

const HomePage = () => {
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [usdcBalance, setUsdcBalance] = useState("0");
  const [pusdBalance, setPusdBalance] = useState("0");
  const [loading, setLoading] = useState(false);
  const [usdcLoading, setUsdcLoading] = useState(false);
  const [error, setError] = useState("");
  const [usdcError, setUsdcError] = useState("");
  const [success, setSuccess] = useState("");
  const [usdcSuccess, setUsdcSuccess] = useState("");

  // Restaking states
  const [lstBalance, setLstBalance] = useState("0");
  const [lstAmount, setLstAmount] = useState("");
  const [lstLoading, setLstLoading] = useState(false);
  const [restakingLoading, setRestakingLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("delegate");
  const [delegatedAmount, setDelegatedAmount] = useState("0");
  const [restakingNotification, setRestakingNotification] = useState({
    show: false,
    message: "",
    type: "",
  });

  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const devnetAddresses = {
    USDC: "0x0230Af50C53eC0f30c7a4C85E4eE6e6165Afb45C",
    LST: "0x806fB8DbAF32176bE869FCa871dAdfa8d85cA4C5",
    PUSD: "0xfb14DF2d11888016ccDB4577f5e4b719523299b7",
    sPUSD: "0xe456cB1B47256331CcBa625C000ff639dC5a8349",
    Operator: "0x2Ab98Ca74DC10853F5702345a709e2ad0D1727C9",
    Eigen: "0x54d447731BC149381ab6DD94A35DCe70Ba0ea1Bc",
    LoanManager: "0x889F3dD9e729168b9162CCDFa6Aa7A9F6cE0a087",
  };
  // above footer, show a table with devnet address from devnetAddresses
  const router = useRouter();

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

  // Handle input change for PUSD
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers and decimals
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  // Handle USDC mint (fixed amount of 10 USDC)
  const handleUsdcMint = async () => {
    if (!walletClient || !publicClient) {
      setUsdcError("Wallet not connected properly");
      return;
    }

    setUsdcLoading(true);
    setUsdcError("");
    setUsdcSuccess("");

    try {
      // Convert 10 USDC to units (18 decimals)
      const usdcAmountUnits = parseUnits("10", 18);

      // Prepare the mint transaction
      const { request } = await publicClient.simulateContract({
        address: ContractAddresses.USDC as `0x${string}`,
        abi: USDCJson.abi,
        functionName: "mint",
        args: [usdcAmountUnits],
        account: address,
      });

      // Execute the transaction using the wallet's provider
      const hash = await walletClient.writeContract(request);

      // Wait for transaction to complete
      await publicClient.waitForTransactionReceipt({ hash });

      // Update balance
      fetchBalances();
      setUsdcSuccess("Successfully minted 10 USDC!");
    } catch (err: unknown) {
      console.error("Error minting USDC:", err);
      setUsdcError(
        err instanceof Error
          ? err.message
          : "Failed to mint USDC. Please try again."
      );
    } finally {
      setUsdcLoading(false);
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
    <div className="min-h-screen bg-black text-white">
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
                    Users deposit LST tokens as collateral into the protocol
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#FF8C00] mr-2">2.</span>
                  <span>
                    LST tokens are delegated to verified operators for restaking
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
                    Users receive PUSD stablecoins against their collateral
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#FF8C00] mr-2">5.</span>
                  <span>
                    PUSD can be deposited into sPUSD vault for yield generation
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
                        Mint USDC and get PUSD stablecoins in return.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 - PUSD */}
                  <div className="flex items-start space-x-6 p-6 rounded-lg hover:bg-gray-900 transition-all duration-300 cursor-pointer group relative">
                    <div className="flex-shrink-0 relative z-10">
                      <div className="w-16 h-16 rounded-lg border-2 border-gray-600 hover:border-[#FF8C00] transition-colors duration-300 flex items-center justify-center bg-black group-hover:bg-[#FF8C00] group-hover:text-black">
                        <span className="text-2xl font-bold text-white group-hover:text-black transition-colors">2</span>
                      </div>
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-3xl font-bold text-white mb-3 group-hover:text-[#FF8C00] transition-colors">
                        PUSD
                      </h3>
                      <p className="text-[#FF8C00] text-lg font-medium leading-relaxed">
                        PUSD can be converted to sPUSD for yield generation.
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
                        Mint LST and delegate or undelegate to operators.
                      </p>
                    </div>
                  </div>

                  {/* Step 4 - Loan */}
                  <div className="flex items-start space-x-6 p-6 rounded-lg hover:bg-gray-900 transition-all duration-300 cursor-pointer group relative">
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
                      {/* USDC Mint Button */}
                      <div className="mb-6">
                        <div className="bg-black border border-gray-800 p-4 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-gray-300 mb-1">
                                Your USDC Balance:{" "}
                                <span className="text-[#FF8C00] font-bold">
                                  {usdcBalance} USDC
                                </span>
                              </p>
                              <p className="text-sm text-gray-400">
                                Need USDC to mint PUSD? Get 10 USDC for testing
                              </p>
                            </div>
                            
                            <button
                              onClick={handleUsdcMint}
                              disabled={usdcLoading}
                              className={`px-4 py-2 rounded-md text-white font-medium transition-colors ${
                                usdcLoading ? "opacity-70" : ""
                              } bg-black border border-[#FF8C00] shadow-[0_0_15px_rgba(255,140,0,0.7)] hover:shadow-[0_0_20px_rgba(255,140,0,1)] hover:text-[#FF8C00]`}
                            >
                              {usdcLoading ? "Processing..." : "Mint 10 USDC"}
                            </button>
                          </div>

                          {usdcError && (
                            <p className="mt-2 text-red-400 text-sm">Error: {usdcError}</p>
                          )}

                          {usdcSuccess && (
                            <p className="mt-2 text-green-400 text-sm">{usdcSuccess}</p>
                          )}
                        </div>
                      </div>

                      {/* PUSD Mint Box */}
                      <div className="bg-black border border-gray-800 p-4 rounded-lg mb-4">
                        <h3 className="text-xl font-bold mb-4 text-[#FF8C00] font-mono">
                          MINT PUSD
                        </h3>
                        
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

                      <div className="bg-black border border-gray-800 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold mb-2 text-[#FF8C00]">
                          About PUSD
                        </h3>
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
              )}

              {selectedStep === "restaking" && (
                <div className="bg-black border border-gray-800 p-6 rounded-lg shadow-lg backdrop-blur-sm bg-[radial-gradient(#333_1px,transparent_1px)] bg-[size:10px_10px]">
                  <h2 className="text-2xl font-bold mb-6 text-[#FF8C00] font-mono">
                    RESTAKING
                  </h2>
                  <p className="text-gray-300">
                    Restaking functionality will be available here. Click on the RESTAKING step to see the interface.
                  </p>
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
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-2xl font-bold text-[#FF8C00] mb-4">StableCORE</h3>
              <p className="text-white mb-4 font-medium">
                The next generation stablecoin protocol with credible financial guarantees and institutional-grade security.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-white hover:text-[#FF8C00] transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                </a>
                <a href="#" className="text-white hover:text-[#FF8C00] transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.746-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z"/>
                  </svg>
                </a>
                <a href="#" className="text-white hover:text-[#FF8C00] transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
                <a href="#" className="text-white hover:text-[#FF8C00] transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </a>
              </div>
            </div>

          
            {/* Resources */}
            <div>
              <h4 className="text-lg font-bold text-[#FF8C00] mb-4">Resources</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-white hover:text-[#FF8C00] transition-colors">Documentation</a></li>

                <li><a href="#" className="text-white hover:text-[#FF8C00] transition-colors">Security</a></li>
                <li><a href="#" className="text-white hover:text-[#FF8C00] transition-colors">Audit Reports</a></li>
                
              </ul>
            </div>
          </div>

          {/* Stats Section */}
        

          {/* Bottom Section */}
          <div className="border-t border-gray-600 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="mb-4 md:mb-0">
                <p className="text-sm text-white font-medium">
                  StableCORE © 2025 All rights reserved.
                </p>
              </div>
              <div className="flex space-x-6 text-sm">
                <a href="#" className="text-white hover:text-[#FF8C00] transition-colors font-medium">Privacy Policy</a>
                <a href="#" className="text-white hover:text-[#FF8C00] transition-colors font-medium">Terms of Service</a>
                <a href="#" className="text-white hover:text-[#FF8C00] transition-colors font-medium">Cookie Policy</a>
                <a href="#" className="text-white hover:text-[#FF8C00] transition-colors font-medium">Support</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;