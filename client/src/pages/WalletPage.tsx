/** @format */

import { useWallet } from "@/contexts/WalletContext";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Wallet as WalletIcon,
  PiggyBank,
} from "lucide-react";
import { Link } from "react-router-dom";

const Wallet = () => {
  const { wallet, transactions } = useWallet();

  const totalWealth = wallet.activeBalance + wallet.lucreBalance;

  const nextPayout = new Date(wallet.lastPayout);
  nextPayout.setDate(nextPayout.getDate() + 7);
  const daysUntilPayout = Math.ceil(
    (nextPayout.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Wallet 💰</h1>
          <p className="text-muted-foreground">
            Manage your finances and track your wealth
          </p>
        </div>

        {/* Total Wealth */}
        <Card className="p-8 bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
          <h2 className="text-lg text-muted-foreground mb-2">Total Wealth</h2>
          <p className="text-5xl font-bold mb-6">₹{totalWealth.toFixed(2)}</p>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">
                ₹{wallet.lucreBalance}
              </p>
              <p className="text-xs text-muted-foreground">Lucre</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary">
                ₹{wallet.activeBalance.toFixed(0)}
              </p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </div>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Lucre Account */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                <span className="text-2xl">🪙</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Lucre Account</h3>
                <p className="text-sm text-muted-foreground">
                  Temporary earnings wallet
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-3xl font-bold mb-1">
                  ₹{wallet.lucreBalance}
                </p>
                <p className="text-sm text-muted-foreground">Current balance</p>
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <div className="flex justify-between text-sm mb-2">
                  <span>This week's earnings</span>
                  <span className="font-medium">₹{wallet.lucreBalance}</span>
                </div>
                <div className="h-2 bg-background rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-accent transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (wallet.lucreBalance / 500) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-sm font-medium">
                  Next payout in {daysUntilPayout} days
                </p>
                <p className="text-xs text-muted-foreground">
                  Every Monday at 10:00 AM
                </p>
              </div>
            </div>
          </Card>

          {/* Active Balance */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
                <WalletIcon className="h-6 w-6 text-success" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Active Balance</h3>
                <p className="text-sm text-muted-foreground">
                  Available for spending
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-3xl font-bold mb-1">
                  ₹{wallet.discretionaryBalance.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Discretionary funds
                </p>
              </div>

              <div className="space-y-2">
                <Link to="/battles">
                  <Button className="w-full bg-primary hover:bg-primary/90">
                    Play Quiz Battle
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>

        {/* Expense Breakdown */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            📊 Weekly Expense Allocation
          </h3>
          <div className="space-y-3">
            {[
              {
                label: "Tax",
                amount: wallet.expenses.tax,
                percent: 20,
                color: "bg-destructive",
              },
              {
                label: "Rent",
                amount: wallet.expenses.rent,
                percent: 30,
                color: "bg-primary",
              },
              {
                label: "Food",
                amount: wallet.expenses.food,
                percent: 25,
                color: "bg-secondary",
              },
              {
                label: "Utilities",
                amount: wallet.expenses.utilities,
                percent: 15,
                color: "bg-accent",
              },
              {
                label: "Other",
                amount: wallet.expenses.other,
                percent: 10,
                color: "bg-success",
              },
            ].map((expense) => (
              <div key={expense.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{expense.label}</span>
                  <span className="font-medium">
                    ₹{expense.amount} ({expense.percent}%)
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${expense.color} transition-all`}
                    style={{ width: `${expense.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <div className="flex justify-between">
              <span className="font-medium">Discretionary Balance</span>
              <span className="font-bold text-success">
                ₹{wallet.discretionaryBalance.toFixed(2)}
              </span>
            </div>
          </div>
        </Card>

        {/* Transaction History */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">💳 Transaction History</h3>
          <div className="space-y-2">
            {transactions.slice(0, 20).map((txn) => (
              <div
                key={txn.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
              >
                <div
                  className={`
                  w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                  ${
                    txn.amount > 0
                      ? "bg-success/10 text-success"
                      : "bg-destructive/10 text-destructive"
                  }
                `}
                >
                  {txn.amount > 0 ? (
                    <TrendingUp className="h-5 w-5" />
                  ) : (
                    <TrendingDown className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{txn.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(txn.date).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-bold ${
                      txn.amount > 0 ? "text-success" : "text-destructive"
                    }`}
                  >
                    {txn.amount > 0 ? "+" : ""}₹
                    {Math.abs(txn.amount).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ₹{(txn.balance || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No transactions yet
              </p>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Wallet;
