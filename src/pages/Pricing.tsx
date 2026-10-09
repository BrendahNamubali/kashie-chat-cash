import { Link } from "react-router-dom";
import { ArrowRight, Check, CreditCard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import KashieLogo from "@/components/KashieLogo";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";

export default function Pricing() {
  const { user } = useAuth();
  const content = <div className="max-w-5xl mx-auto px-4 py-8 md:px-8 space-y-7">
    <header className="border-b border-border pb-6"><CreditCard className="size-5 text-primary mb-3" /><h1 className="text-3xl font-semibold">Pricing</h1><p className="text-muted-foreground mt-2">A little clarity for the business you built.</p></header>
    <section className="grid md:grid-cols-2 gap-8 items-start"><div className="border border-border rounded-lg bg-card p-6 space-y-5"><h2 className="text-xl font-semibold">Kashie</h2><p><span className="text-3xl font-semibold">UGX 20,000</span><span className="text-sm text-muted-foreground"> / month, starting price</span></p><p className="text-sm text-muted-foreground">7-day free trial</p><ul className="space-y-3 text-sm">{["Daily sales and expense tracking", "Ask Kashie about your business", "Stock tracking and business reports", "Tax preparation and draft PDFs", "Forecast and financing planning"].map((item) => <li key={item} className="flex gap-2"><Check className="size-4 text-primary shrink-0" />{item}</li>)}</ul><Button asChild className="w-full"><Link to={user ? "/subscription" : "/auth?mode=signup"}>{user ? "View subscription" : "Create an account"}<ArrowRight className="size-4" /></Link></Button></div><div className="space-y-5"><h2 className="text-lg font-semibold">Clear before you commit</h2><p className="text-sm text-muted-foreground">Online subscription checkout is not connected yet. This page does not charge you or activate a paid plan.</p><p className="text-sm text-muted-foreground">The starting price and trial are the advertised offer. Plan tiers, final charges, and renewal terms will be shown before paid subscriptions become available.</p><p className="text-sm text-primary">One next step: explore your business records before choosing a paid subscription.</p></div></section>
  </div>;
  return user ? <AppLayout>{content}</AppLayout> : <div className="min-h-screen bg-background"><header className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between"><Link to="/" aria-label="Kashie home"><KashieLogo className="w-40 h-14" /></Link><Button asChild variant="ghost"><Link to="/auth">Sign in</Link></Button></header>{content}</div>;
}