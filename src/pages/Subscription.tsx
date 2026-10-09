import { Link } from "react-router-dom";
import { CreditCard, ArrowRight, ShieldCheck } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";

export default function Subscription() {
  return <AppLayout><div className="max-w-5xl mx-auto px-4 py-8 md:px-8 space-y-7">
    <header className="border-b border-border pb-6"><CreditCard className="size-5 text-primary mb-3" /><h1 className="text-3xl font-semibold">Subscription</h1><p className="text-muted-foreground mt-2">Your plan and billing, in one place.</p></header>
    <section className="border-b border-border pb-6 space-y-4"><h2 className="text-lg font-semibold">Billing is not connected yet</h2><p className="text-sm text-muted-foreground max-w-xl">Kashie cannot verify an active paid plan, trial expiry, renewal date, or payment history yet. No subscription purchase can be made on this screen.</p><dl className="grid sm:grid-cols-3 gap-4 text-sm"><div><dt className="text-muted-foreground">Paid subscription</dt><dd className="font-medium mt-1">Not verified</dd></div><div><dt className="text-muted-foreground">Next payment</dt><dd className="font-medium mt-1">Not available</dd></div><div><dt className="text-muted-foreground">Payment method</dt><dd className="font-medium mt-1">Not available</dd></div></dl><Button asChild><Link to="/pricing">View pricing <ArrowRight className="size-4" /></Link></Button></section>
    <section className="space-y-3"><h2 className="font-semibold flex items-center gap-2"><ShieldCheck className="size-4 text-primary" />Your records stay yours</h2><p className="text-sm text-muted-foreground">Viewing this page does not change your access or your saved business data.</p><p className="text-sm text-primary">One next step: review pricing for the advertised starting offer.</p></section>
  </div></AppLayout>;
}