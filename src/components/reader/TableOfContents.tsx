"use client";

import { useState, useEffect, useCallback } from "react";
import { List, ChevronDown } from "lucide-react";

export interface TocSection {
  id: string;
  label: string;
  children?: { id: string; label: string }[];
}

interface TableOfContentsProps {
  sections: TocSection[];
  brandPrimary: string;
  onTocClick?: (sectionId: string, sectionTitle: string) => void;
}

export default function TableOfContents({
  sections,
  brandPrimary,
  onTocClick,
}: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("");
  const [mobileOpen, setMobileOpen] = useState(false);

  // Scroll-spy: observe all section headings
  useEffect(() => {
    const allIds = sections.flatMap((s) => [
      s.id,
      ...(s.children?.map((c) => c.id) || []),
    ]);

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the first visible entry
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );

    allIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  // Deep linking: scroll to hash on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      setTimeout(() => {
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          setActiveId(hash);
        }
      }, 300);
    }
  }, []);

  const scrollTo = useCallback(
    (id: string, label: string) => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        // Update URL hash without triggering scroll
        history.replaceState(null, "", `#${id}`);
        setActiveId(id);
        setMobileOpen(false);
        onTocClick?.(id, label);
      }
    },
    [onTocClick]
  );

  if (sections.length === 0) return null;

  const tocContent = (
    <nav aria-label="Inhoudsopgave">
      <ul className="space-y-1">
        {sections.map((section) => (
          <li key={section.id}>
            <button
              type="button"
              onClick={() => scrollTo(section.id, section.label)}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                activeId === section.id
                  ? "font-semibold text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
              style={
                activeId === section.id
                  ? { backgroundColor: brandPrimary }
                  : undefined
              }
            >
              {section.label}
            </button>
            {section.children && section.children.length > 0 && (
              <ul className="ml-3 mt-0.5 space-y-0.5 border-l-2 border-gray-100 pl-2">
                {section.children.map((child) => (
                  <li key={child.id}>
                    <button
                      type="button"
                      onClick={() => scrollTo(child.id, child.label)}
                      className={`w-full text-left px-2 py-1 rounded text-xs transition-colors truncate ${
                        activeId === child.id
                          ? "font-semibold"
                          : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                      }`}
                      style={
                        activeId === child.id
                          ? { color: brandPrimary }
                          : undefined
                      }
                      title={child.label}
                    >
                      {child.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );

  return (
    <>
      {/* Desktop: sticky sidebar block */}
      <div className="hidden lg:block rounded-2xl bg-white p-5 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
          <List className="h-4 w-4" style={{ color: brandPrimary }} />
          Inhoudsopgave
        </h3>
        {tocContent}
      </div>

      {/* Mobile: floating button + dropdown */}
      <div className="lg:hidden fixed bottom-20 left-4 z-40">
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-transform hover:scale-105"
          style={{ backgroundColor: brandPrimary }}
          aria-expanded={mobileOpen}
          aria-controls="mobile-toc"
        >
          <List className="h-4 w-4" />
          <span>Inhoud</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${mobileOpen ? "rotate-180" : ""}`}
          />
        </button>
        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setMobileOpen(false)}
            />
            <div
              id="mobile-toc"
              className="absolute bottom-full left-0 mb-2 w-72 max-h-80 overflow-y-auto rounded-2xl bg-white p-4 shadow-xl border z-40"
            >
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <List className="h-4 w-4" style={{ color: brandPrimary }} />
                Inhoudsopgave
              </h3>
              {tocContent}
            </div>
          </>
        )}
      </div>
    </>
  );
}
