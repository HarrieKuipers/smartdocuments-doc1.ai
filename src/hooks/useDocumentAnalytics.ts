"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { UAParser } from "ua-parser-js";
import { getAnalyticsConsent } from "@/components/analytics/CookieBanner";

type EventType = string;
type Metadata = Record<string, unknown>;

interface QueuedEvent {
  documentId: string;
  sessionId: string;
  eventType: EventType;
  metadata: Metadata;
  timestamp: string;
}

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  let sessionId = sessionStorage.getItem("doc1_session");
  if (!sessionId) {
    sessionId = uuidv4();
    sessionStorage.setItem("doc1_session", sessionId);
  }
  return sessionId;
}

function getDeviceType(): "desktop" | "tablet" | "mobile" {
  if (typeof window === "undefined") return "desktop";
  const width = window.innerWidth;
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

function getBrowserInfo() {
  if (typeof window === "undefined") return { browser: "", os: "" };
  const parser = new UAParser(navigator.userAgent);
  return {
    browser: parser.getBrowser()?.name || "",
    os: parser.getOS()?.name || "",
  };
}

function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  ms: number
): T {
  let lastCall = 0;
  return ((...args: unknown[]) => {
    const now = Date.now();
    if (now - lastCall >= ms) {
      lastCall = now;
      fn(...args);
    }
  }) as T;
}

export function useDocumentAnalytics(documentId: string) {
  const sessionId = useRef<string>("");
  const startTime = useRef(Date.now());
  const activeTime = useRef(0);
  const lastHeartbeat = useRef(Date.now());
  const maxScrollDepth = useRef(0);
  const isActive = useRef(true);
  const eventQueue = useRef<QueuedEvent[]>([]);
  const flushTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [hasConsent, setHasConsent] = useState(false);

  // Initialize sessionId and check consent on mount
  useEffect(() => {
    sessionId.current = getOrCreateSessionId();
    setHasConsent(getAnalyticsConsent());

    // Listen for consent changes
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "doc1_analytics_consent") {
        setHasConsent(e.newValue === "accepted");
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const flushEvents = useCallback(async () => {
    if (eventQueue.current.length === 0) return;

    const events = [...eventQueue.current];
    eventQueue.current = [];

    try {
      await fetch("/api/analytics/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events }),
        keepalive: true,
      });
    } catch {
      // Put events back in queue on failure
      eventQueue.current = [...events, ...eventQueue.current];
    }
  }, []);

  const queueEvent = useCallback(
    (eventType: EventType, metadata: Metadata = {}) => {
      // Respect Do Not Track and cookie consent
      if (!hasConsent && typeof navigator !== "undefined" && navigator.doNotTrack === "1") return;

      const { browser, os } = getBrowserInfo();

      eventQueue.current.push({
        documentId,
        sessionId: sessionId.current,
        eventType,
        metadata: {
          ...metadata,
          device: getDeviceType(),
          browser,
          os,
          referrer: document.referrer || "direct",
        },
        timestamp: new Date().toISOString(),
      });

      // Flush if queue is large
      if (eventQueue.current.length >= 10) {
        flushEvents();
      }
    },
    [documentId, flushEvents, hasConsent]
  );

  useEffect(() => {
    // Initial page view
    queueEvent("page_view");

    // Heartbeat every 30 seconds
    const heartbeatInterval = setInterval(() => {
      if (isActive.current) {
        const now = Date.now();
        activeTime.current += (now - lastHeartbeat.current) / 1000;
        lastHeartbeat.current = now;

        queueEvent("time_on_page", {
          activeSeconds: Math.round(activeTime.current),
          totalSeconds: Math.round((now - startTime.current) / 1000),
        });
      }
    }, 30000);

    // Scroll tracking
    const handleScroll = throttle(() => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const scrollPercent = Math.round((scrollTop / docHeight) * 100);

      const milestones = [25, 50, 75, 100];
      for (const milestone of milestones) {
        if (
          scrollPercent >= milestone &&
          maxScrollDepth.current < milestone
        ) {
          maxScrollDepth.current = milestone;
          queueEvent("scroll_depth", { scrollPercentage: milestone });
        }
      }
    }, 500);

    // Visibility tracking
    const handleVisibility = () => {
      if (document.hidden) {
        isActive.current = false;
      } else {
        isActive.current = true;
        lastHeartbeat.current = Date.now();
      }
    };

    // Flush on page unload
    const handleUnload = () => {
      queueEvent("time_on_page", {
        activeSeconds: Math.round(activeTime.current),
        totalSeconds: Math.round(
          (Date.now() - startTime.current) / 1000
        ),
      });
      flushEvents();
    };

    window.addEventListener("scroll", handleScroll);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleUnload);

    // Periodic flush
    flushTimer.current = setInterval(flushEvents, 5000);

    return () => {
      clearInterval(heartbeatInterval);
      if (flushTimer.current) clearInterval(flushTimer.current);
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleUnload);
      flushEvents();
    };
  }, [documentId, queueEvent, flushEvents]);

  return {
    sessionId: sessionId.current,
    trackTermClick: (term: string, definition?: string) =>
      queueEvent("term_click", { term, termDefinition: definition }),
    trackSectionView: (sectionId: string, sectionTitle: string) =>
      queueEvent("section_view", { sectionId, sectionTitle }),
    trackTocClick: (sectionId: string, sectionTitle: string) =>
      queueEvent("toc_click", { targetSection: sectionTitle }),
    trackLinkClick: (url: string) =>
      queueEvent("link_click", { targetUrl: url }),
    trackSearch: (query: string, resultsCount: number) =>
      queueEvent("search_query", { searchQuery: query, resultsCount }),
    trackChatMessage: (question: string) =>
      queueEvent("chat_message", { question }),
    trackChatFeedback: (feedbackType: string, comment?: string) =>
      queueEvent("chat_feedback", {
        feedbackType,
        feedbackComment: comment,
      }),
    trackDownload: () => queueEvent("pdf_download"),
    trackShare: () => queueEvent("share_link_created"),
    trackPrint: () => queueEvent("print"),
    trackLanguageSwitch: () => queueEvent("language_switch"),
    trackSummaryExpand: () => queueEvent("summary_expand"),
    trackSummaryCollapse: () => queueEvent("summary_collapse"),
    trackReadingModeToggle: () => queueEvent("reading_mode_toggle"),
  };
}
