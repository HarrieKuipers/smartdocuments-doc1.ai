"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronUp, ChevronDown } from "lucide-react";
import { formatDuration } from "@/lib/analytics/helpers";

interface DocumentStat {
  _id: string;
  title: string;
  shortId: string;
  views: number;
  uniqueVisitors: number;
  downloads: number;
  chatMessages: number;
  avgReadTime: number;
}

interface DocumentsTableProps {
  documents: DocumentStat[];
}

type SortKey = "views" | "uniqueVisitors" | "downloads" | "chatMessages" | "avgReadTime";

export default function DocumentsTable({ documents }: DocumentsTableProps) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("views");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = [...documents].sort((a, b) => {
    const diff = a[sortKey] - b[sortKey];
    return sortDir === "desc" ? -diff : diff;
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) return null;
    return sortDir === "desc" ? (
      <ChevronDown className="ml-1 inline h-3.5 w-3.5" />
    ) : (
      <ChevronUp className="ml-1 inline h-3.5 w-3.5" />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[250px]">Document</TableHead>
          <TableHead
            className="cursor-pointer text-right"
            onClick={() => handleSort("views")}
          >
            Views <SortIcon column="views" />
          </TableHead>
          <TableHead
            className="cursor-pointer text-right"
            onClick={() => handleSort("uniqueVisitors")}
          >
            Uniek <SortIcon column="uniqueVisitors" />
          </TableHead>
          <TableHead
            className="cursor-pointer text-right"
            onClick={() => handleSort("avgReadTime")}
          >
            Leestijd <SortIcon column="avgReadTime" />
          </TableHead>
          <TableHead
            className="cursor-pointer text-right"
            onClick={() => handleSort("downloads")}
          >
            Downloads <SortIcon column="downloads" />
          </TableHead>
          <TableHead
            className="cursor-pointer text-right"
            onClick={() => handleSort("chatMessages")}
          >
            Chat <SortIcon column="chatMessages" />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((doc) => (
          <TableRow
            key={doc._id}
            className="cursor-pointer hover:bg-gray-50"
            onClick={() =>
              router.push(`/dashboard/analytics/${doc._id}`)
            }
          >
            <TableCell className="font-medium">
              <span className="line-clamp-1">{doc.title}</span>
            </TableCell>
            <TableCell className="text-right">{doc.views}</TableCell>
            <TableCell className="text-right">
              {doc.uniqueVisitors}
            </TableCell>
            <TableCell className="text-right">
              {formatDuration(doc.avgReadTime)}
            </TableCell>
            <TableCell className="text-right">{doc.downloads}</TableCell>
            <TableCell className="text-right">
              {doc.chatMessages}
            </TableCell>
          </TableRow>
        ))}
        {sorted.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="py-8 text-center text-gray-400">
              Geen data beschikbaar voor deze periode
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
