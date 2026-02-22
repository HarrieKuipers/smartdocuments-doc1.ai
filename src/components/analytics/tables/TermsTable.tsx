"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import TrendIndicator from "@/components/analytics/cards/TrendIndicator";

interface TermStat {
  term: string;
  clicks: number;
  trend: number;
}

interface TermsTableProps {
  terms: TermStat[];
}

export default function TermsTable({ terms }: TermsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Begrip</TableHead>
          <TableHead className="text-right">Kliks</TableHead>
          <TableHead className="text-right">Trend</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {terms.map((t) => (
          <TableRow key={t.term}>
            <TableCell className="font-medium">{t.term}</TableCell>
            <TableCell className="text-right">{t.clicks}</TableCell>
            <TableCell className="text-right">
              <TrendIndicator value={t.trend} />
            </TableCell>
          </TableRow>
        ))}
        {terms.length === 0 && (
          <TableRow>
            <TableCell colSpan={3} className="py-8 text-center text-gray-400">
              Geen term kliks gevonden
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
