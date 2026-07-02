import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters")
  .max(100);

const Auth = () => {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  // For signup: shows "check your email" state
  const [signupSent, setSignupSent] = useState(false);

  useEffect(() => {
    if (!authLoading && session) {
      navigate("/", { replace: true });
    }
  }, [session, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const emailParse = emailSchema.safeParse(email);
    if (!emailParse.success) {
      toast.error(emailParse.error.errors[0].message);
      return;
    }
    const passParse = passwordSchema.safeParse(password);
    if (!passParse.success) {
      toast.error(passParse.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: emailParse.data,
          password: passParse.data,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) {
          // Supabase returns a generic error for existing emails in some configs
          if (
            error.message.toLowerCase().includes("already") ||
            error.message.toLowerCase().includes("registered")
          ) {
            toast.error("That email is already registered. Try signing in.");
          } else {
            toast.error(error.message);
          }
          return;
        }

        // If email confirmation is required, session will be null
        if (!data.session) {
          setSignupSent(true);
          return;
        }

        // Email confirmation disabled — go straight in
        toast.success("Welcome to Kashie 👋");
        navigate("/", { replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailParse.data,
          password: passParse.data,
        });

        if (error) {
          if (
            error.message.toLowerCase().includes("email not confirmed") ||
            error.message.toLowerCase().includes("not confirmed")
          ) {
            toast.error(
              "Please confirm your email first. Check your inbox for a link from Kashie.",
              { duration: 6000 }
            );
          } else if (
            error.message.toLowerCase().includes("invalid") ||
            error.message.toLowerCase().includes("credentials")
          ) {
            toast.error("Wrong email or password. Try again.");
          } else {
            toast.error(error.message);
          }
          return;
        }
        navigate("/", { replace: true });
      }
    } catch (err) {
      console.error("Auth error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/`,
      });
      if (result.error) {
        toast.error("Google sign-in failed. Try again.");
        setLoading(false);
        return;
      }
      if (result.redirected) return;
      navigate("/", { replace: true });
    } catch {
      toast.error("Google sign-in failed. Try again.");
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    const emailParse = emailSchema.safeParse(email);
    if (!emailParse.success) return;
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: emailParse.data,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    setLoading(false);
    if (error) {
      toast.error("Couldn't resend. Try again in a moment.");
    } else {
      toast.success("Confirmation email resent!");
    }
  };

  if (authLoading) return <div className="min-h-screen bg-background" />;

  // ---- Post-signup "check your email" screen ----
  if (signupSent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-5 text-3xl">
            📬
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Check your inbox
          </h1>
          <p className="text-sm text-muted-foreground mb-1">
            We sent a confirmation link to
          </p>
          <p className="text-sm font-medium text-foreground mb-6">{email}</p>
          <p className="text-xs text-muted-foreground mb-6">
            Click the link in the email to activate your account, then come back
            here to sign in. Check your spam folder if you don't see it.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setMode("signin");
                setSignupSent(false);
                setPassword("");
              }}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Go to sign in
            </button>
            <button
              onClick={handleResendConfirmation}
              disabled={loading}
              className="w-full h-11 rounded-xl border border-border text-sm text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
            >
              {loading ? "Sending..." : "Resend confirmation email"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Main auth screen ----
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo + headline */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-semibold mb-4">
            K
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-1.5">
            {mode === "signin" ? "Welcome back" : "Get started with Kashie"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === "signin"
              ? "Sign in to keep tracking your business"
              : "Create your account — takes 30 seconds"}
          </p>
        </div>

        {/* Google */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full h-11 rounded-xl border border-border bg-card flex items-center justify-center gap-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50 mb-4"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Email + password form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            required
            className="w-full h-11 px-4 rounded-xl border border-border bg-card text-[15px] text-foreground placeholder:text-muted-foreground outline-none focus:border-ring transition-colors"
          />

          {/* Password with show/hide toggle */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              className="w-full h-11 px-4 pr-11 rounded-xl border border-border bg-card text-[15px] text-foreground placeholder:text-muted-foreground outline-none focus:border-ring transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Forgot password — only on sign in */}
          {mode === "signin" && (
            <div className="text-right">
              <button
                type="button"
                onClick={async () => {
                  const emailParse = emailSchema.safeParse(email);
                  if (!emailParse.success) {
                    toast.error("Enter your email above first.");
                    return;
                  }
                  setLoading(true);
                  const { error } = await supabase.auth.resetPasswordForEmail(
                    emailParse.data,
                    { redirectTo: `${window.location.origin}/auth` }
                  );
                  setLoading(false);
                  if (error) {
                    toast.error("Couldn't send reset email. Try again.");
                  } else {
                    toast.success("Password reset email sent. Check your inbox.");
                  }
                }}
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading
              ? "Just a sec..."
              : mode === "signin"
              ? "Sign in"
              : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-5">
          {mode === "signin" ? "New here? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setPassword("");
              setSignupSent(false);
            }}
            className="text-primary font-medium hover:underline"
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
