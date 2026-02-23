"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Monitor, Smartphone, Tablet, MapPin } from "lucide-react";
import { formatDuration } from "@/lib/analytics/helpers";

interface Viewer {
  device: string;
  city?: string;
  currentSection?: string;
  duration: number;
}

interface LiveData {
  activeViewers: number;
  viewers: Viewer[];
}

interface LiveViewersProps {
  documentId: string;
}

const deviceIcons: Record<string, typeof Monitor> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

export default function LiveViewers({ documentId }: LiveViewersProps) {
  const [data, setData] = useState<LiveData | null>(null);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(
      `/api/analytics/documents/${documentId}/live`
    );
    eventSourceRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (event) => {
      try {
        const parsed: LiveData = JSON.parse(event.data);
        setData(parsed);
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      setConnected(false);
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [documentId]);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <span
            className={`h-2.5 w-2.5 rounded-full ${connected ? "animate-pulse bg-emerald-500" : "bg-gray-300"}`}
          />
          Nu Live: {data?.activeViewers || 0} bezoeker
          {(data?.activeViewers || 0) !== 1 ? "s" : ""}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data?.viewers && data.viewers.length > 0 ? (
          <div className="space-y-3">
            {data.viewers.map((viewer, i) => {
              const DeviceIcon = deviceIcons[viewer.device] || Monitor;
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg bg-gray-50 p-3"
                >
                  <DeviceIcon className="mt-0.5 h-4 w-4 text-gray-400" />
                  <div className="flex-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700 capitalize">
                        {viewer.device}
                      </span>
                      {viewer.city && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <MapPin className="h-3 w-3" />
                          {viewer.city}
                        </span>
                      )}
                    </div>
                    {viewer.currentSection && (
                      <p className="mt-0.5 text-xs text-gray-500">
                        Leest: {viewer.currentSection}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-gray-400">
                      Tijd: {formatDuration(viewer.duration)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-gray-400">
            {connected
              ? "Geen actieve bezoekers op dit moment"
              : "Verbinding wordt opgezet..."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
