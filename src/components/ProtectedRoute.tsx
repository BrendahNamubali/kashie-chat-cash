import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getProfile } from "@/lib/finance";

interface Props {
  children: ReactNode;
  requireOnboarding?: boolean;
}

const ProtectedRoute = ({ children, requireOnboarding = true }: Props) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [checkingProfile, setCheckingProfile] = useState(requireOnboarding);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (loading || !user || !requireOnboarding) {
      setCheckingProfile(false);
      return;
    }
    (async () => {
      const profile = await getProfile();
      setNeedsOnboarding(!profile?.onboarding_completed);
      setCheckingProfile(false);
    })();
  }, [user, loading, requireOnboarding]);

  if (loading || checkingProfile) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  if (requireOnboarding && needsOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
