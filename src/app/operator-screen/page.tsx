"use client";

import React, { useState, useEffect } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import PUSDJson from "@/contracts/PUSD.sol/PUSD.json";
import LoanManagerJson from "@/contracts/LoanManager.sol/LoanManager.json";
import ContractAddresses from "../../deployed-address.json";
import EigenJson from "@/contracts/Eigen.sol/Eigen.json";

interface LoanDetails {
  amount: string;
  interestRate: number;
  startTime: number;
  dueTime: number;
  isRepaid: boolean;
  collateralAmount: string;
  loanedUSBDAmount: string;
}

interface LoanContractResponse {
  0: bigint; // amount
  1: bigint; // interestRate
  2: bigint; // startTime
  3: bigint; // dueTime
  4: boolean; // isRepaid
  5: bigint; // collateralAmount
  6: bigint; // loanedUSBDAmount
}

// Mock data for RWA
const rwaData = {
  currentYield: "5.93",
  baseYield: "3.50",
  restaking: {
    totalRestaked: "15,000",
    loanTaken: "8,500",
    loanAvailable: "6,500",
  },
  assets: [
    {
      id: 1,
      name: "US Treasury Bond",
      amount: "10,000",
      yield: "4.2%",
      value: "10,250",
    },
    {
      id: 2,
      name: "Corporate Bond ETF",
      amount: "5,000",
      yield: "5.8%",
      value: "5,120",
    },
    {
      id: 3,
      name: "Real Estate Fund",
      amount: "15,000",
      yield: "7.1%",
      value: "15,600",
    },
  ],
  opportunities: [
    {
      name: "US Treasury Bonds",
      description: "Low risk government securities",
      yield: "4.2%",
    },
    {
      name: "Corporate Bond ETF",
      description: "Diversified corporate debt",
      yield: "5.8%",
    },
    {
      name: "Real Estate Fund",
      description: "Commercial property portfolio",
      yield: "7.1%",
    },
  ],
};

export default function OperatorScreen() {
  const [activeTab, setActiveTab] = useState("rwa");
  const [loanAmount, setLoanAmount] = useState("");
  const [collateralAmount, setCollateralAmount] = useState("");
  const [repayAmount, setRepayAmount] = useState("");
  const [loanDetails, setLoanDetails] = useState<LoanDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "",
  });
  const [USBDBalance, setUSBDBalance] = useState("0");
  const [operatorBalance, setOperatorBalance] = useState("0");
  const [delegatedAmount, setDelegatedAmount] = useState("0");

  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // Fetch balances and active loans
  useEffect(() => {
    if (isConnected && address && publicClient) {
      fetchBalances();
      fetchActiveLoans();
      fetchOperatorBalance();
      fetchRepaymentAmount();
    }
  }, [address, isConnected, publicClient]);

  // Fetch stCORE and USBD balances
  const fetchBalances = async () => {
    if (!address || !publicClient) return;

    try {
      // Fetch USBD balance
      const USBDBalanceData = await publicClient.readContract({
        address: ContractAddresses.PUSD as `0x${string}`,
        abi: PUSDJson.abi,
        functionName: "balanceOf",
        args: [address],
      });

      setUSBDBalance(formatUnits(USBDBalanceData as bigint, 18));

      // Fetch delegated amount from Eigen contract
      const delegatedData = await publicClient.readContract({
        address: ContractAddresses.Eigen as `0x${string}`,
        abi: EigenJson.abi,
        functionName: "getDelegatedAmount",
        args: [address],
      });

      setDelegatedAmount(formatUnits(delegatedData as bigint, 18));
    } catch (err) {
      console.error("Error fetching balances:", err);
    }
  };

  // Fetch active loan details directly
  const fetchActiveLoans = async () => {
    if (!address || !publicClient) return;

    try {
      console.log("Fetching active loan for address:", address);

      // Directly call getLoanDetails without a loan ID
      const loanDetailsResponse = (await publicClient.readContract({
        address: ContractAddresses.LoanManager as `0x${string}`,
        abi: LoanManagerJson.abi,
        functionName: "getLoanDetails",
        args: [],
      })) as LoanContractResponse;

      console.log("Loan details:", loanDetailsResponse);

      // Check if loanDetails has valid values before formatting
      if (loanDetailsResponse) {
        // Get the delegated amount from the Eigen contract
        const delegatedData = await publicClient.readContract({
          address: ContractAddresses.Eigen as `0x${string}`,
          abi: EigenJson.abi,
          functionName: "getDelegatedAmount",
          args: [address],
        });

        const delegatedAmount = formatUnits(delegatedData as bigint, 18);

        // Format the collateral amount to a readable number
        const collateralAmount = delegatedAmount || "0";

        // Set the loan directly in the component state
        setLoanDetails({
          amount: loanDetailsResponse[0]
            ? formatUnits(loanDetailsResponse[0], 18)
            : "0",
          interestRate: loanDetailsResponse[1]
            ? Number(loanDetailsResponse[1]) / 100
            : 0,
          startTime: loanDetailsResponse[2]
            ? Number(loanDetailsResponse[2])
            : 0,
          dueTime: loanDetailsResponse[3] ? Number(loanDetailsResponse[3]) : 0,
          isRepaid: loanDetailsResponse[4] || false,
          collateralAmount: collateralAmount,
          loanedUSBDAmount: loanDetailsResponse[6]
            ? formatUnits(loanDetailsResponse[6], 18)
            : "0",
        });

        // Pre-fill the repay form with this loan's details
        // if (loanDetailsResponse[0]) {
        //   setRepayAmount(
        //     loanDetailsResponse[6]
        //       ? formatUnits(loanDetailsResponse[6], 6)
        //       : "0"
        //   );
        // }
      }
    } catch (err) {
      console.error("Error fetching active loan:", err);
    }
  };

  // Fetch operator balance
  const fetchOperatorBalance = async () => {
    if (!publicClient) return;

    try {
      const operatorBalanceData = await publicClient.readContract({
        address: ContractAddresses.PUSD as `0x${string}`,
        abi: PUSDJson.abi,
        functionName: "balanceOf",
        args: [ContractAddresses.Operator],
      });

      setOperatorBalance(formatUnits(operatorBalanceData as bigint, 18));
    } catch (err) {
      console.error("Error fetching operator balance:", err);
    }
  };

  // Fetch repayment amount from LoanManager
  const fetchRepaymentAmount = async () => {
    if (!publicClient) return;

    try {
      const repaymentAmount = await publicClient.readContract({
        address: ContractAddresses.LoanManager as `0x${string}`,
        abi: LoanManagerJson.abi,
        functionName: "calculateRepaymentAmount",
        args: [],
      });
      console.log("Repayment amount:", repaymentAmount);

      setRepayAmount(formatUnits(repaymentAmount as bigint, 18));
    } catch (err) {
      console.error("Error fetching repayment amount:", err);
    }
  };

  // Show notification
  const showNotification = (message: string, type: string) => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: "", type: "" });
    }, 5000);
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
      showNotification("Please enter a valid loan amount", "error");
      return;
    }

    if (!walletClient || !publicClient) {
      showNotification("Wallet not connected properly", "error");
      return;
    }

    setIsLoading(true);
    try {
      // Convert loan amount from PUSBD to wei
      const loanAmountInWei = parseUnits(loanAmount, 18); // 6 decimals for PUSBD

      // Now call createLoan on LoanManager contract
      const { request } = await publicClient.simulateContract({
        address: ContractAddresses.LoanManager as `0x${string}`,
        abi: LoanManagerJson.abi,
        functionName: "createLoan",
        args: [loanAmountInWei],
        account: address,
      });

      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });

      // Update balances and loans
      fetchBalances();
      fetchActiveLoans();

      showNotification(
        `Successfully created loan for ${loanAmount} PUSBD`,
        "success"
      );
      setLoanAmount("");
      setCollateralAmount("");
    } catch (error: unknown) {
      console.error("Error creating loan:", error);
      showNotification(
        error instanceof Error ? error.message : "Failed to create loan",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle repay loan action
  const handleRepayLoan = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!repayAmount || parseFloat(repayAmount) <= 0) {
      showNotification("Please enter a valid repayment amount", "error");
      return;
    }

    if (!walletClient || !publicClient) {
      showNotification("Wallet not connected properly", "error");
      return;
    }

    setIsLoading(true);
    try {
      // Now call repayLoan on LoanManager contract
      const { request } = await publicClient.simulateContract({
        address: ContractAddresses.LoanManager as `0x${string}`,
        abi: LoanManagerJson.abi,
        functionName: "repayLoan",
        args: [],
        account: address,
      });

      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });

      // Update balances and loans
      fetchBalances();
      fetchActiveLoans();

      showNotification(`Successfully repaid loan`, "success");
      setRepayAmount("");
    } catch (error: unknown) {
      console.error("Error repaying loan:", error);
      showNotification(
        error instanceof Error ? error.message : "Failed to repay loan",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Add this function to handle minting PUSBD to the operator
  const handleMintUSBD = async () => {
    if (!walletClient || !publicClient || !address) {
      showNotification("Wallet not connected properly", "error");
      return;
    }

    setIsLoading(true);
    try {
      // Call mintToOperator on PUSD contract
      const { request } = await publicClient.simulateContract({
        address: ContractAddresses.PUSD as `0x${string}`,
        abi: PUSDJson.abi,
        functionName: "mintToOperator",
        args: [parseUnits("10", 18)], // Mint 10 PUSD to operator
        account: address,
      });

      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });

      // Update balances
      fetchBalances();
      fetchOperatorBalance();

      showNotification("Successfully minted PUSD to operator", "success");
    } catch (error: unknown) {
      console.error("Error minting PUSD:", error);
      showNotification(
        error instanceof Error ? error.message : "Failed to mint PUSD",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pt-10 pb-20">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1
              className="text-4xl font-bold mb-4 font-mono"
              style={{
                letterSpacing: "0.05em",
                textShadow:
                  "0.05em 0 0 rgba(255,140,0,0.75), -0.025em -0.05em 0 rgba(255,127,80,0.75), 0.025em 0.05em 0 rgba(255,99,71,0.75)",
                fontFamily: "monospace",
              }}
            >
              OPERATOR DASHBOARD
            </h1>
            <p className="text-xl text-gray-300">
              Manage your loans and collateral
            </p>
          </div>

          {/* Notification */}
          {notification.show && (
            <div
              className={`mb-6 p-3 rounded-md ${
                notification.type === "error"
                  ? "bg-red-900 bg-opacity-50 text-red-200"
                  : "bg-green-900 bg-opacity-50 text-green-200"
              }`}
            >
              {notification.message}
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-gray-800 mb-8">
            <button
              className={`px-6 py-3 font-medium ${
                activeTab === "rwa"
                  ? "text-[#FF8C00] border-b-2 border-[#FF8C00]"
                  : "text-gray-400"
              }`}
              onClick={() => setActiveTab("rwa")}
            >
              About RWA
            </button>
            <button
              className={`px-6 py-3 font-medium ${
                activeTab === "loans"
                  ? "text-[#FF8C00] border-b-2 border-[#FF8C00]"
                  : "text-gray-400"
              }`}
              onClick={() => setActiveTab("loans")}
            >
              Existing Loans
            </button>
            <button
              className={`px-6 py-3 font-medium ${
                activeTab === "take"
                  ? "text-[#FF8C00] border-b-2 border-[#FF8C00]"
                  : "text-gray-400"
              }`}
              onClick={() => setActiveTab("take")}
            >
              Take Loan
            </button>
            <button
              className={`px-6 py-3 font-medium ${
                activeTab === "repay"
                  ? "text-[#FF8C00] border-b-2 border-[#FF8C00]"
                  : "text-gray-400"
              }`}
              onClick={() => setActiveTab("repay")}
            >
              Repay Loan
            </button>
          </div>

          {/* RWA Tab */}
          {activeTab === "rwa" && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Current Yield Box */}
                <div
                  className="bg-black border border-gray-800 p-6 rounded-lg shadow-lg backdrop-blur-sm col-span-2"
                  style={{
                    backgroundImage:
                      "radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)",
                    backgroundSize: "10px 10px",
                  }}
                >
                  <h2 className="text-xl font-semibold mb-4 text-[#FF8C00]">
                    Current Yield
                  </h2>
                  <div className="flex items-end mb-6">
                    <span className="text-5xl font-bold text-white">
                      {rwaData.currentYield}%
                    </span>
                    <span className="text-gray-400 ml-2 mb-1">APY</span>
                  </div>

                  <div className="bg-gray-800 bg-opacity-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Base Yield</span>
                      <span className="text-xl font-semibold text-[#FF8C00]">
                        {rwaData.baseYield}%
                      </span>
                    </div>
                    <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#FF8C00]"
                        style={{
                          width: `${
                            (parseFloat(rwaData.baseYield) /
                              parseFloat(rwaData.currentYield)) *
                            100
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Restaking Overview */}
                <div
                  className="bg-black border border-gray-800 p-6 rounded-lg shadow-lg backdrop-blur-sm"
                  style={{
                    backgroundImage:
                      "radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)",
                    backgroundSize: "10px 10px",
                  }}
                >
                  <h2 className="text-xl font-semibold mb-4 text-[#FF8C00]">
                    Restaking Overview
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <p className="text-gray-400 text-sm">Total Restaked</p>
                      <p className="text-2xl font-bold">
                        ${rwaData.restaking.totalRestaked}
                      </p>
                      <div className="mt-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#FF8C00]"
                          style={{ width: "100%" }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <p className="text-gray-400 text-sm">Loan Taken</p>
                      <p className="text-2xl font-bold">
                        ${rwaData.restaking.loanTaken}
                      </p>
                      <div className="mt-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500"
                          style={{
                            width: `${
                              (parseFloat(
                                rwaData.restaking.loanTaken.replace(/,/g, "")
                              ) /
                                parseFloat(
                                  rwaData.restaking.totalRestaked.replace(
                                    /,/g,
                                    ""
                                  )
                                )) *
                              100
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <p className="text-gray-400 text-sm">Loan Available</p>
                      <p className="text-2xl font-bold">
                        ${rwaData.restaking.loanAvailable}
                      </p>
                      <div className="mt-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500"
                          style={{
                            width: `${
                              (parseFloat(
                                rwaData.restaking.loanAvailable.replace(
                                  /,/g,
                                  ""
                                )
                              ) /
                                parseFloat(
                                  rwaData.restaking.totalRestaked.replace(
                                    /,/g,
                                    ""
                                  )
                                )) *
                              100
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assets Section */}
              <div
                className="bg-black border border-gray-800 p-6 rounded-lg shadow-lg backdrop-blur-sm mb-8"
                style={{
                  backgroundImage:
                    "radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)",
                  backgroundSize: "10px 10px",
                }}
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-[#FF8C00]">
                    Your Assets
                  </h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left border-b border-gray-800">
                        <th className="pb-2">Asset</th>
                        <th className="pb-2">Amount (USBD)</th>
                        <th className="pb-2">Yield</th>
                        <th className="pb-2">Current Value</th>
                        <th className="pb-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rwaData.assets.map((asset) => (
                        <tr key={asset.id} className="border-b border-gray-800">
                          <td className="py-3">{asset.name}</td>
                          <td className="py-3">${asset.amount}</td>
                          <td className="py-3">{asset.yield}</td>
                          <td className="py-3">${asset.value}</td>
                          <td className="py-3">
                            <button className="text-[#FF8C00] hover:underline">
                              Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Market Opportunities */}
              <div
                className="bg-black border border-gray-800 p-6 rounded-lg shadow-lg backdrop-blur-sm"
                style={{
                  backgroundImage:
                    "radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)",
                  backgroundSize: "10px 10px",
                }}
              >
                <h2 className="text-xl font-semibold mb-4 text-[#FF8C00]">
                  Market Opportunities
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {rwaData.opportunities.map((opportunity, index) => (
                    <div
                      key={index}
                      className="bg-gray-800 bg-opacity-50 p-4 rounded-lg"
                    >
                      <h3 className="font-semibold mb-2">{opportunity.name}</h3>
                      <p className="text-gray-300 text-sm mb-2">
                        {opportunity.description}
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Yield</span>
                        <span className="text-green-400 font-semibold">
                          {opportunity.yield}
                        </span>
                      </div>
                      <button className="mt-4 w-full py-2 bg-black text-[#FF8C00] border border-[#FF8C00] rounded hover:bg-[#FF8C00] hover:text-black transition-colors">
                        Invest
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Existing Loans Tab */}
          {activeTab === "loans" && (
            <div
              className="bg-black p-8 rounded-lg border border-gray-800"
              style={{
                backgroundImage:
                  "radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)",
                backgroundSize: "10px 10px",
              }}
            >
              <h2 className="text-2xl font-bold mb-6">Your Active Loans</h2>

              {loanDetails &&
              !loanDetails.isRepaid &&
              parseFloat(loanDetails.amount) > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left border-b border-gray-800">
                        <th className="pb-3 pr-4">Amount (USBD)</th>
                        <th className="pb-3 pr-4">Delegation (stCORE)</th>
                        <th className="pb-3 pr-4">APR (%)</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3 pr-4">Due Date</th>
                        <th className="pb-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-800">
                        <td className="py-4 pr-4">{loanDetails.amount} USBD</td>
                        <td className="py-4 pr-4">
                          {loanDetails.collateralAmount} stCORE
                        </td>
                        <td className="py-4 pr-4">
                          {(Number(loanDetails.interestRate) / 100).toFixed(2)}%
                        </td>
                        <td className="py-4 pr-4">
                          <span className="px-2 py-1 rounded text-xs bg-green-900 text-green-300">
                            Active
                          </span>
                        </td>
                        <td className="py-4 pr-4">
                          {new Date(
                            Number(loanDetails.dueTime) * 1000
                          ).toLocaleDateString()}
                        </td>
                        <td className="py-4">
                          <button
                            onClick={() => {
                              setActiveTab("repay");
                              // setRepayAmount(loanDetails.loanedUSBDAmount);
                            }}
                            className="text-[#FF8C00] hover:underline"
                          >
                            Repay
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  No active loans found.
                </div>
              )}
            </div>
          )}

          {/* Take Loan Tab */}
          {activeTab === "take" && (
            <div
              className="bg-black p-8 rounded-lg border border-gray-800"
              style={{
                backgroundImage:
                  "radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)",
                backgroundSize: "10px 10px",
              }}
            >
              <h2 className="text-2xl font-bold mb-6">Take a New Loan</h2>

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
                      <p className="font-medium">{loanDetails.amount} PUSBD</p>
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
                    onClick={() => setActiveTab("repay")}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Go to Repay Loan
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-6 p-4 bg-gray-900 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-400">Your PUSBD Balance</p>
                        <p className="font-medium">{USBDBalance} PUSBD</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Total Delegated stCORE</p>
                        <p className="font-medium">{delegatedAmount} stCORE</p>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleTakeLoan}>
                    <div className="mb-6">
                      <label className="block text-gray-300 mb-2">
                        Loan Amount (PUSBD)
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
                      disabled={isLoading}
                      className={`w-full bg-[#FF8C00] text-black py-4 rounded-lg font-bold text-lg hover:bg-opacity-90 transition duration-300 ${
                        isLoading ? "opacity-70" : ""
                      }`}
                    >
                      {isLoading ? "PROCESSING..." : "TAKE LOAN"}
                    </button>
                  </form>
                </>
              )}
            </div>
          )}

          {/* Repay Loan Tab */}
          {activeTab === "repay" && (
            <div
              className="bg-black p-8 rounded-lg border border-gray-800"
              style={{
                backgroundImage:
                  "radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)",
                backgroundSize: "10px 10px",
              }}
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Repay Loan</h2>
                  <p className="text-gray-400 mt-1">
                    Operator PUSD Balance:{" "}
                    <span className="text-white font-medium">
                      {operatorBalance} PUSD
                    </span>
                  </p>
                </div>
                <button
                  onClick={handleMintUSBD}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Mint PUSD
                </button>
              </div>

              {loanDetails &&
              !loanDetails.isRepaid &&
              parseFloat(loanDetails.amount) > 0 ? (
                <form onSubmit={handleRepayLoan}>
                  <div className="mb-6">
                    <label className="block text-gray-300 mb-2">
                      Loan to Repay
                    </label>
                    <div className="w-full p-4 bg-gray-900 rounded-lg text-white">
                      {loanDetails.amount} PUSBD (Due:{" "}
                      {new Date(
                        Number(loanDetails.dueTime) * 1000
                      ).toLocaleDateString()}
                      )
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-gray-300 mb-2">
                      Repayment Amount (PUSBD)
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
                        <p className="font-medium">{loanDetails.amount} PUSD</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Interest Due</p>
                        <p className="font-medium">
                          {Number(loanDetails.amount).toFixed(2)} PUSD
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
                    disabled={isLoading}
                  >
                    {isLoading ? "PROCESSING..." : "REPAY LOAN"}
                  </button>
                </form>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p className="mb-4">No active loans found to repay.</p>
                  <button
                    onClick={() => setActiveTab("take")}
                    className="px-6 py-2 bg-[#FF8C00] text-black rounded-lg font-medium hover:bg-opacity-90 transition duration-300"
                  >
                    Take a New Loan
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}