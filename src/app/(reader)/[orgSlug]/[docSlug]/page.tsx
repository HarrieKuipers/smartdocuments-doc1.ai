"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function SEOReaderPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    // Lookup the document by org slug and doc slug, then redirect to shortId reader
    async function lookup() {
      try {
        const res = await fetch(
          `/api/reader/lookup?orgSlug=${params.orgSlug}&docSlug=${params.docSlug}`
        );
        if (res.ok) {
          const { shortId } = await res.json();
          router.replace(`/${shortId}`);
        } else {
          router.replace("/");
        }
      } catch {
        router.replace("/");
      }
    }
    lookup();
  }, [params.orgSlug, params.docSlug, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-spin h-8 w-8 border-2 border-[#0062EB] border-t-transparent rounded-full" />
    </div>
  );
}
