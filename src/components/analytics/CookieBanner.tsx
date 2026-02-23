"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const CONSENT_KEY = "doc1_analytics_consent";

export function getAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  const consent = localStorage.getItem(CONSENT_KEY);
  // If no choice made yet, return false (no tracking until consent)
  return consent === "accepted";
}

export function hasConsentChoice(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(CONSENT_KEY) !== null;
}

export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Respect Do Not Track
    if (navigator.doNotTrack === "1") return;

    // Only show if no choice has been made
    if (!hasConsentChoice()) {
      setShow(true);
    }
  }, []);

  function handleAccept() {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setShow(false);
  }

  function handleDecline() {
    localStorage.setItem(CONSENT_KEY, "declined");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white p-4 shadow-lg">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 sm:flex-row">
        <p className="flex-1 text-sm text-gray-600">
          We gebruiken anonieme analytics om de leeservaring te verbeteren. Er
          worden geen persoonlijke gegevens opgeslagen — alleen geanonimiseerde
          gebruiksgegevens (apparaat, land, leestijd).
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDecline}>
            Weigeren
          </Button>
          <Button size="sm" onClick={handleAccept}>
            Accepteren
          </Button>
        </div>
      </div>
    </div>
  );
}
