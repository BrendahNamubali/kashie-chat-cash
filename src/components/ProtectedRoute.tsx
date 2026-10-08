import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { getProfile, updateProfile } from "@/lib/finance";
import { setCurrency } from "@/lib/currency";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import CurrencySelect, { isValidCurrency } from "@/components/CurrencySelect";

interface Props {
  children: ReactNode;
  requireOnboarding?: boolean;
}

// Reminder dismissal is temporary, per user, and never a saved currency choice.
const deferredCurrencyUsers = new Set<string>();

const ProtectedRoute = ({ children, requireOnboarding = true }: Props) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [checkingProfile, setCheckingProfile] = useState(requireOnboarding);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [needsCurrency, setNeedsCurrency] = useState(false);
  const [choice, setChoice] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading || !user || !requireOnboarding) {
      setCheckingProfile(false);
      return;
    }
    (async () => {
      const profile = await getProfile();
      setCurrency(profile?.currency);
      setNeedsOnboarding(!profile?.onboarding_completed);
      setNeedsCurrency(!!profile?.onboarding_completed && !profile?.currency && !deferredCurrencyUsers.has(user.id));
      setCheckingProfile(false);
    })();
  }, [user, loading, requireOnboarding]);

  const dismissCurrency = () => {
    if (saving || !user) return;
    deferredCurrencyUsers.add(user.id);
    setNeedsCurrency(false);
  };

  const saveCurrency = async () => {
    if (!isValidCurrency(choice)) return toast.error("Pick a currency first");
    setSaving(true);
    const { error } = await updateProfile({ currency: choice });
    setSaving(false);
    if (error) return toast.error("Couldn't save that. Try again?");
    setCurrency(choice);
    setNeedsCurrency(false);
    window.location.reload();
  };

  if (loading || checkingProfile) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  if (requireOnboarding && needsOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <>
      {children}
      <Dialog open={needsCurrency} onOpenChange={(open) => { if (!open) dismissCurrency(); }}>
        <DialogContent className="max-w-sm" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => { if (saving) e.preventDefault(); }}>
          <DialogHeader className="pr-6">
            <DialogTitle>Which currency does your business use?</DialogTitle>
            <DialogDescription>Kashie will show all your amounts in this currency. Your recorded numbers stay exactly the same.</DialogDescription>
          </DialogHeader>
          <CurrencySelect value={choice} onChange={setChoice} />
          <p className="text-sm text-muted-foreground">Not ready? You can choose your currency later in Settings.</p>
          <Button onClick={saveCurrency} disabled={saving || !isValidCurrency(choice)}>{saving ? "Saving…" : "Save currency"}</Button>
          <Button variant="ghost" onClick={dismissCurrency} disabled={saving}>Skip for now</Button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProtectedRoute;
