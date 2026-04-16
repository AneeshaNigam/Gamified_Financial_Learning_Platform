/** @format */

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface LocationState {
  email: string;
  flow: "login" | "signup";
  password?: string;
}

const VerifyOtp = () => {
  const [otp, setOtp] = useState<string[]>(Array(7).fill(""));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const isSubmittingRef = useRef(false); // prevent double auto-submit
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyOtp, resendOtp } = useAuth();

  const state = location.state as LocationState | null;

  // Redirect if no state
  useEffect(() => {
    if (!state?.email || !state?.flow) {
      navigate("/login");
    }
  }, [state, navigate]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // digits only
    const newOtp = [...otp];

    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, "").slice(0, 7 - index);
      for (let i = 0; i < digits.length; i++) {
        newOtp[index + i] = digits[i];
      }
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 6);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 6) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = useCallback(async () => {
    const code = otp.join("");
    if (code.length !== 7) {
      toast.error("Please enter all 7 digits");
      return;
    }
    if (!state) return;

    // Prevent double-submission (auto-submit effect can fire multiple times)
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    setLoading(true);
    try {
      await verifyOtp(state.email, code, state.flow);
      toast.success(
        state.flow === "signup"
          ? "Account created! Welcome to MoneyMaster!"
          : "Welcome back!"
      );
      navigate("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid or expired verification code";
      toast.error(message);
      setOtp(Array(7).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  }, [otp, state, verifyOtp, navigate]);

  // Auto-submit when all 7 digits are filled
  useEffect(() => {
    if (otp.every((d) => d !== "") && otp.join("").length === 7) {
      handleSubmit();
    }
  }, [otp, handleSubmit]);

  const handleResend = async () => {
    if (!state) return;
    setResending(true);
    try {
      await resendOtp(state.email, state.flow, state.password);
      setTimeLeft(600);
      setOtp(Array(7).fill(""));
      inputRefs.current[0]?.focus();
      toast.success("New verification code sent to your email");
    } catch {
      toast.error("Failed to resend code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  if (!state?.email) return null;

  const isLogin = state.flow === "login";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md bg-card rounded-2xl shadow-xl p-8 animate-scale-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <svg
              className="w-8 h-8 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">
            {isLogin ? "Verify Your Login" : "Verify Your Email"}
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            We sent a 7-digit code to{" "}
            <span className="font-semibold text-foreground">{state.email}</span>
          </p>
        </div>

        {/* OTP Inputs */}
        <div className="flex gap-2 justify-center mb-6">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={7}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onFocus={(e) => e.target.select()}
              className="w-10 h-12 text-center text-lg font-bold border-2 rounded-lg bg-background text-foreground
                         border-border focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none
                         transition-all duration-150"
              autoFocus={index === 0}
            />
          ))}
        </div>

        {/* Timer */}
        <div className="text-center mb-6">
          {timeLeft > 0 ? (
            <p className="text-sm text-muted-foreground">
              Code expires in{" "}
              <span
                className={`font-semibold tabular-nums ${
                  timeLeft < 60 ? "text-destructive" : "text-primary"
                }`}
              >
                {formatTime(timeLeft)}
              </span>
            </p>
          ) : (
            <p className="text-sm text-destructive font-medium">
              Code has expired. Please request a new one.
            </p>
          )}
        </div>

        {/* Verify Button */}
        <Button
          onClick={handleSubmit}
          disabled={loading || otp.join("").length !== 7}
          className="w-full bg-primary hover:bg-primary/90 mb-4"
          size="lg"
        >
          {loading ? "Verifying..." : "Verify Code"}
        </Button>

        {/* Resend */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Didn't receive the code?
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResend}
            disabled={resending || timeLeft > 540} // allow resend after 1 min
            className="text-primary hover:text-primary/80"
          >
            {resending ? "Sending..." : "Resend Code"}
          </Button>
          {timeLeft > 540 && (
            <p className="text-xs text-muted-foreground mt-1">
              You can resend after {formatTime(timeLeft - 540)}
            </p>
          )}
        </div>

        {/* Back link */}
        <div className="text-center mt-6 pt-6 border-t border-border">
          <button
            onClick={() => navigate(isLogin ? "/login" : "/signup")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to {isLogin ? "Login" : "Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtp;
