"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, ThumbsDown } from "lucide-react";

interface Question {
  _id: string;
  question: string;
  category?: string;
  feedback?: {
    type: "positive" | "negative" | null;
  };
  timestamp: string;
}

interface QuestionsTableProps {
  questions: Question[];
}

const CATEGORY_LABELS: Record<string, string> = {
  definition: "Definitie",
  explanation: "Uitleg",
  comparison: "Vergelijking",
  procedure: "Procedure",
  factual: "Feitelijk",
  opinion: "Mening",
  application: "Toepassing",
  clarification: "Verduidelijking",
  summary: "Samenvatting",
  other: "Overig",
};

export default function QuestionsTable({ questions }: QuestionsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[400px]">Vraag</TableHead>
          <TableHead>Categorie</TableHead>
          <TableHead className="text-center">Feedback</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {questions.map((q) => (
          <TableRow key={q._id}>
            <TableCell className="max-w-[400px]">
              <span className="line-clamp-2 text-sm">{q.question}</span>
            </TableCell>
            <TableCell>
              {q.category && (
                <Badge variant="secondary" className="text-xs">
                  {CATEGORY_LABELS[q.category] || q.category}
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-center">
              {q.feedback?.type === "positive" && (
                <ThumbsUp className="mx-auto h-4 w-4 text-emerald-500" />
              )}
              {q.feedback?.type === "negative" && (
                <ThumbsDown className="mx-auto h-4 w-4 text-red-500" />
              )}
            </TableCell>
          </TableRow>
        ))}
        {questions.length === 0 && (
          <TableRow>
            <TableCell colSpan={3} className="py-8 text-center text-gray-400">
              Geen vragen gevonden
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
