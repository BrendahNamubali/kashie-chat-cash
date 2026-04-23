import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { getProfile, updateProfile } from "@/lib/finance";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }
    (async () => {
      const profile = await getProfile();
      if (profile?.onboarding_completed) {
        navigate("/chat", { replace: true });
        return;
      }
      // Pre-fill if data already exists from signup metadata
      if (profile?.full_name) setFullName(profile.full_name);
      if (profile?.business_name) setBusinessName(profile.business_name);
      if (profile?.contact) setContact(profile.contact);
      setChecking(false);
    })();
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fn = fullName.trim();
    const bn = businessName.trim();
    if (!fn || !bn || loading) return;
    setLoading(true);
    const { error } = await updateProfile({
      full_name: fn,
      business_name: bn,
      contact: contact.trim() || null,
      onboarding_completed: true,
    });
    if (error) {
      toast.error("Couldn't save that. Try again?");
      setLoading(false);
      return;
    }
    navigate("/chat", { replace: true });
  };

  if (authLoading || checking) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-semibold mb-4">
            K
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Welcome to Kashie 👋
          </h1>
          <p className="text-sm text-muted-foreground max-w-sm">
            A few quick details so we can keep things personal.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="fullName" className="text-sm font-medium text-foreground">
              Your name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Bree"
              autoFocus
              required
              maxLength={100}
              className="w-full h-11 px-4 rounded-xl border border-border bg-card text-[15px] text-foreground placeholder:text-muted-foreground outline-none focus:border-ring transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="businessName" className="text-sm font-medium text-foreground">
              Business name
            </label>
            <input
              id="businessName"
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Bree's Bakery"
              required
              maxLength={100}
              className="w-full h-11 px-4 rounded-xl border border-border bg-card text-[15px] text-foreground placeholder:text-muted-foreground outline-none focus:border-ring transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="contact" className="text-sm font-medium text-foreground">
              Phone or email <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              id="contact"
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="e.g. +1 555 0100"
              maxLength={100}
              className="w-full h-11 px-4 rounded-xl border border-border bg-card text-[15px] text-foreground placeholder:text-muted-foreground outline-none focus:border-ring transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={!fullName.trim() || !businessName.trim() || loading}
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center gap-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40"
          >
            {loading ? "Setting up..." : "Continue"}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Onboarding;
