import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  Languages,
  MessageSquare,
  ArrowRight,
  CheckCircle,
  Shield,
  Zap,
  Users,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI-verrijkte documenten",
    description:
      "Automatische samenvattingen, hoofdpunten en bevindingen gegenereerd door AI.",
  },
  {
    icon: Languages,
    title: "Meerdere taalniveaus",
    description:
      "Herschrijf content op B1, B2 of C1 niveau voor maximale toegankelijkheid.",
  },
  {
    icon: MessageSquare,
    title: "AI Chat per document",
    description:
      "Lezers kunnen direct vragen stellen over het document en krijgen instant antwoord.",
  },
  {
    icon: Shield,
    title: "Veilig & Beheerbaar",
    description:
      "Wachtwoordbeveiliging, toegangsbeheer en volledige controle over je documenten.",
  },
  {
    icon: Zap,
    title: "Snel & Mooi",
    description:
      "Professionele reader views die snel laden en er prachtig uitzien op elk apparaat.",
  },
  {
    icon: Users,
    title: "Team & Huisstijl",
    description:
      "Werk samen met je team en pas de huisstijl aan per organisatie of document.",
  },
];

const pricingPlans = [
  {
    name: "Free",
    price: "€0",
    period: "voor altijd",
    features: ["1 document", "AI Chat", "B1 taalniveau", "Standaard huisstijl"],
    cta: "Gratis starten",
    popular: false,
  },
  {
    name: "Pro",
    price: "€49",
    period: "per maand",
    features: [
      "25 documenten",
      "AI Chat",
      "B1, B2, C1 taalniveaus",
      "Alle huisstijlen + custom",
      "Collecties",
      "Volledige analytics",
      "Wachtwoordbeveiliging",
      "5 teamleden",
    ],
    cta: "Start met Pro",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Op maat",
    period: "",
    features: [
      "Onbeperkt documenten",
      "Alles in Pro",
      "Custom domein",
      "Onbeperkt teamleden",
      "Prioriteit support",
      "API toegang",
    ],
    cta: "Neem contact op",
    popular: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo_DOC1_dark.svg"
              alt="doc1.ai"
              width={120}
              height={45}
              priority
            />
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-sm text-muted-foreground hover:text-gray-900">
              Features
            </a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-gray-900">
              Prijzen
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Inloggen
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">
                Gratis starten
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <Badge className="mb-6 bg-primary/10 text-primary">
          AI-powered document platform
        </Badge>
        <h1 className="mx-auto mb-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Maak elk document{" "}
          <span className="text-primary">slim, toegankelijk</span> en{" "}
          <span className="text-primary">interactief</span>
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
          Transformeer PDF en DOCX bestanden in interactieve webdocumenten met
          AI-samenvattingen, meerdere taalniveaus en een ingebouwde chat-assistent.
          Ideaal voor overheden en organisaties.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/register">
            <Button size="lg">
              Gratis starten
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="#features">
            <Button size="lg" variant="outline">
              Meer weten
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold">
              Alles wat je nodig hebt
            </h2>
            <p className="text-muted-foreground">
              Van upload tot interactief webdocument in een paar klikken
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mb-2 font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold">Hoe het werkt</h2>
            <p className="text-muted-foreground">
              In drie stappen van statisch document naar interactieve ervaring
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Upload",
                description:
                  "Sleep je PDF of DOCX bestand in de upload zone. We accepteren bestanden tot 25MB.",
              },
              {
                step: "2",
                title: "AI Verwerking",
                description:
                  "Onze AI analyseert het document, genereert samenvattingen, identificeert hoofdpunten en herschrijft op verschillende taalniveaus.",
              },
              {
                step: "3",
                title: "Publiceer & Deel",
                description:
                  "Publiceer het interactieve document en deel de link. Lezers kunnen de samenvatting lezen, van taalniveau wisselen en vragen stellen aan de AI.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-white">
                  {item.step}
                </div>
                <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold">Eenvoudige Prijzen</h2>
            <p className="text-muted-foreground">
              Begin gratis, upgrade wanneer je wilt
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {pricingPlans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative ${
                  plan.popular ? "border-primary border-2 shadow-lg" : ""
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Meest gekozen
                  </Badge>
                )}
                <CardContent className="p-6">
                  <h3 className="mb-2 text-xl font-bold">{plan.name}</h3>
                  <div className="mb-6">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    {plan.period && (
                      <span className="text-muted-foreground">
                        {" "}
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <ul className="mb-6 space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/register">
                    <Button
                      className="w-full"
                      variant={plan.popular ? "default" : "outline"}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold">
            Klaar om je documenten te transformeren?
          </h2>
          <p className="mb-8 text-muted-foreground">
            Begin vandaag nog gratis. Geen creditcard nodig.
          </p>
          <Link href="/register">
            <Button size="lg">
              Gratis starten
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-8">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <Image
                src="/logo_DOC1_dark.svg"
                alt="doc1.ai"
                width={90}
                height={34}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Een product van{" "}
              <a href="https://espire.agency" className="hover:underline">
                Espire Agency
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
