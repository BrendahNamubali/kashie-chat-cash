import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { getBusinessProfile, saveBusinessProfile } from "@/lib/finance";

const ONBOARDED_KEY = "kashie_onboarded";

const Onboarding = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const done = localStorage.getItem(ONBOARDED_KEY);
      if (done) {
        navigate("/chat", { replace: true });
        return;
      }
      const profile = await getBusinessProfile();
      if (profile?.business_name) {
        localStorage.setItem(ONBOARDED_KEY, "1");
        navigate("/chat", { replace: true });
        return;
      }
      setChecking(false);
    })();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    await saveBusinessProfile(trimmed, contact);
    localStorage.setItem(ONBOARDED_KEY, "1");
    navigate("/chat", { replace: true });
  };

  if (checking) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-semibold mb-4">
            K
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Welcome to Kashie 👋
          </h1>
          <p className="text-sm text-muted-foreground max-w-sm">
            Your friendly finance buddy. Let's get to know you so we can keep things personal.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium text-foreground">
              Your name or business name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Maria's Bakery"
              autoFocus
              required
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
              placeholder="e.g. maria@email.com"
              className="w-full h-11 px-4 rounded-xl border border-border bg-card text-[15px] text-foreground placeholder:text-muted-foreground outline-none focus:border-ring transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim() || loading}
            className="w-full h-11 rounded-xl bg-foreground text-background flex items-center justify-center gap-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {loading ? "Setting up..." : "Continue"}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <p className="text-[11px] text-center text-muted-foreground mt-6">
          No password needed. We just want to greet you properly.
        </p>
      </div>
    </div>
  );
};

export default Onboarding;
