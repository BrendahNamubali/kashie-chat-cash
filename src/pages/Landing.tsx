import { Link } from "react-router-dom";
import { ArrowRight, ChartNoAxesCombined, MessageCircle, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import shopImage from "@/assets/kashie-shop.jpg";

const benefits = [
  { title: "Track your money", detail: "Keep daily sales and expenses together, without the paperwork.", icon: ChartNoAxesCombined },
  { title: "Understand your business", detail: "See what you keep, what you spend, and what needs attention.", icon: PackageCheck },
  { title: "Make better decisions", detail: "Ask Kashie about your numbers and your next move.", icon: MessageCircle },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between">
        <Link to="/" className="group flex items-center gap-2.5 font-semibold text-lg transition-opacity hover:opacity-85" aria-label="Kashie home"><span className="size-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-sm transition-transform duration-200 group-hover:scale-105">K</span>Kashie</Link>
        <Button asChild variant="ghost" size="sm"><Link to="/auth">Sign In <ArrowRight className="ml-1 size-4" /></Link></Button>
      </header>
      <main>
        <section className="relative min-h-[470px] md:min-h-[520px] flex items-center overflow-hidden bg-foreground">
          <img src={shopImage} alt="Business owner at her shop counter" width={1600} height={900} className="absolute inset-0 size-full object-cover object-[62%_center]" />
          <div className="absolute inset-0 bg-foreground/65 md:bg-foreground/50" />
          <div className="relative mx-auto max-w-6xl w-full px-5 py-14 text-primary-foreground">
            <div className="max-w-xl">
              <p className="text-sm font-medium mb-4 text-primary-foreground/85">FOR THE BUSINESS YOU BUILT</p>
              <h1 className="text-4xl md:text-6xl font-semibold leading-tight max-w-[13ch]">Your AI CFO for the business you built.</h1>
              <p className="mt-5 text-base md:text-lg leading-relaxed text-primary-foreground/90 max-w-lg">Track your money, understand your profit, manage stock, and make better financial decisions with Kashie.</p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button asChild size="lg"><Link to="/auth?mode=signup">Start 7-Day Free Trial <ArrowRight className="ml-2 size-4" /></Link></Button>
                <Button asChild size="lg" variant="outline" className="border-primary-foreground/70 bg-transparent text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"><Link to="/auth">Sign In</Link></Button>
              </div>
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-5 py-9 md:py-12">
          <div className="grid gap-6 md:grid-cols-3">
            {benefits.map(({ title, detail, icon: Icon }) => (
              <div key={title} className="flex gap-3.5">
                <Icon className="size-5 shrink-0 mt-0.5 text-primary" />
                <div><h2 className="font-semibold text-base">{title}</h2><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{detail}</p></div>
              </div>
            ))}
          </div>
          <p className="mt-10 border-t border-border pt-5 text-sm text-muted-foreground">After the 7-day trial, plans start at UGX 20,000/month.</p>
        </section>
      </main>
    </div>
  );
}
