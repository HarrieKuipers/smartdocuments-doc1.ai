import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import DocumentModel from "@/models/Document";
import DocumentEvent from "@/models/DocumentEvent";
import DocumentAnalyticsSummary from "@/models/DocumentAnalyticsSummary";
import { getDateRange } from "@/lib/analytics/helpers";
import { formatDuration } from "@/lib/analytics/helpers";
import type { Period } from "@/lib/analytics/constants";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { documentId } = await params;

    const doc = await DocumentModel.findOne({
      _id: documentId,
      organizationId: session.user.organizationId,
    }).lean();

    if (!doc) {
      return NextResponse.json(
        { error: "Document niet gevonden" },
        { status: 404 }
      );
    }

    const format = req.nextUrl.searchParams.get("format") || "csv";
    const period = (req.nextUrl.searchParams.get("period") ||
      "30d") as Period;
    const { start, end } = getDateRange(period);

    if (format === "csv") {
      return generateCSV(doc, start, end, period);
    }

    if (format === "pdf") {
      return generatePDF(doc, start, end, period);
    }

    return NextResponse.json(
      { error: "Unsupported format. Use ?format=csv or ?format=pdf" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Export analytics error:", error);
    return NextResponse.json(
      { error: "Failed to export analytics" },
      { status: 500 }
    );
  }
}

async function generateCSV(
  doc: any,
  start: Date,
  end: Date,
  period: string
) {
  const dailyData = await DocumentEvent.aggregate([
    {
      $match: {
        documentId: doc._id,
        timestamp: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: {
          date: {
            $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
          },
          eventType: "$eventType",
        },
        count: { $sum: 1 },
        uniqueSessions: { $addToSet: "$sessionId" },
        avgActiveSeconds: {
          $avg: {
            $cond: [
              { $eq: ["$eventType", "time_on_page"] },
              "$metadata.activeSeconds",
              null,
            ],
          },
        },
      },
    },
    { $sort: { "_id.date": 1 } },
  ]);

  const dateMap = new Map<
    string,
    {
      views: number;
      uniqueVisitors: number;
      downloads: number;
      chatMessages: number;
      avgReadTime: number;
      termClicks: number;
    }
  >();

  for (const row of dailyData) {
    const date = row._id.date;
    if (!dateMap.has(date)) {
      dateMap.set(date, {
        views: 0,
        uniqueVisitors: 0,
        downloads: 0,
        chatMessages: 0,
        avgReadTime: 0,
        termClicks: 0,
      });
    }
    const entry = dateMap.get(date)!;
    switch (row._id.eventType) {
      case "page_view":
        entry.views = row.count;
        entry.uniqueVisitors = row.uniqueSessions.length;
        break;
      case "pdf_download":
        entry.downloads = row.count;
        break;
      case "chat_message":
        entry.chatMessages = row.count;
        break;
      case "time_on_page":
        entry.avgReadTime = Math.round(row.avgActiveSeconds || 0);
        break;
      case "term_click":
        entry.termClicks = row.count;
        break;
    }
  }

  const csvHeader =
    "Datum,Views,Unieke Bezoekers,Downloads,Chat Berichten,Gem. Leestijd,Term Kliks\n";
  const csvRows = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([date, stats]) =>
        `${date},${stats.views},${stats.uniqueVisitors},${stats.downloads},${stats.chatMessages},${formatDuration(stats.avgReadTime)},${stats.termClicks}`
    )
    .join("\n");

  return new NextResponse(csvHeader + csvRows, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="analytics-${doc.shortId}-${period}.csv"`,
    },
  });
}

async function generatePDF(
  doc: any,
  start: Date,
  end: Date,
  period: string
) {
  // Fetch summary data
  const summaries = await DocumentAnalyticsSummary.find({
    documentId: doc._id,
    date: { $gte: start, $lte: end },
  })
    .sort({ date: 1 })
    .lean();

  // Calculate aggregated stats
  const totalViews = summaries.reduce((s, d) => s + d.views, 0);
  const totalUniqueVisitors = summaries.reduce(
    (s, d) => s + d.uniqueVisitors,
    0
  );
  const totalDownloads = summaries.reduce((s, d) => s + d.downloads, 0);
  const totalChatMessages = summaries.reduce(
    (s, d) => s + d.chatMessages,
    0
  );
  const avgReadTime =
    summaries.length > 0
      ? summaries.reduce((s, d) => s + d.avgReadTimeSeconds, 0) /
        summaries.length
      : 0;
  const avgBounceRate =
    summaries.length > 0
      ? Math.round(
          summaries.reduce((s, d) => s + d.bounceRate, 0) / summaries.length
        )
      : 0;
  const avgScrollDepth =
    summaries.length > 0
      ? Math.round(
          summaries.reduce((s, d) => s + d.avgScrollDepth, 0) /
            summaries.length
        )
      : 0;
  const avgCompletionRate =
    summaries.length > 0
      ? Math.round(
          summaries.reduce((s, d) => s + d.completionRate, 0) /
            summaries.length
        )
      : 0;

  // Generate PDF
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();

  // Header
  pdf.setFontSize(20);
  pdf.setTextColor(0, 98, 235); // #0062EB
  pdf.text("doc1.ai", 14, 20);

  pdf.setFontSize(10);
  pdf.setTextColor(102, 102, 102);
  pdf.text("Analytics Rapport", 14, 27);

  // Document title
  pdf.setFontSize(16);
  pdf.setTextColor(17, 17, 17);
  pdf.text(doc.title, 14, 40);

  // Period
  pdf.setFontSize(10);
  pdf.setTextColor(102, 102, 102);
  const dateStr = `Periode: ${start.toLocaleDateString("nl-NL")} - ${end.toLocaleDateString("nl-NL")}`;
  pdf.text(dateStr, 14, 48);

  // Separator line
  pdf.setDrawColor(240, 240, 240);
  pdf.setLineWidth(0.5);
  pdf.line(14, 52, pageWidth - 14, 52);

  // KPI Overview
  pdf.setFontSize(12);
  pdf.setTextColor(17, 17, 17);
  pdf.text("Overzicht", 14, 62);

  // KPI table
  autoTable(pdf, {
    startY: 66,
    head: [
      [
        "Views",
        "Unieke Bezoekers",
        "Gem. Leestijd",
        "Downloads",
        "AI Vragen",
        "Bounce Rate",
        "Scroll Diepte",
        "Completie",
      ],
    ],
    body: [
      [
        totalViews.toString(),
        totalUniqueVisitors.toString(),
        formatDuration(avgReadTime),
        totalDownloads.toString(),
        totalChatMessages.toString(),
        `${avgBounceRate}%`,
        `${avgScrollDepth}%`,
        `${avgCompletionRate}%`,
      ],
    ],
    theme: "grid",
    headStyles: {
      fillColor: [0, 98, 235],
      fontSize: 8,
      cellPadding: 3,
    },
    bodyStyles: { fontSize: 9, cellPadding: 4, halign: "center" },
    margin: { left: 14, right: 14 },
  });

  // Daily breakdown table
  const currentY = (pdf as any).lastAutoTable?.finalY || 100;
  pdf.setFontSize(12);
  pdf.setTextColor(17, 17, 17);
  pdf.text("Dagelijks Overzicht", 14, currentY + 12);

  const dailyRows = summaries.map((s) => [
    s.date.toLocaleDateString("nl-NL"),
    s.views.toString(),
    s.uniqueVisitors.toString(),
    formatDuration(s.avgReadTimeSeconds),
    s.downloads.toString(),
    s.chatMessages.toString(),
    `${s.bounceRate}%`,
  ]);

  autoTable(pdf, {
    startY: currentY + 16,
    head: [
      [
        "Datum",
        "Views",
        "Bezoekers",
        "Leestijd",
        "Downloads",
        "Chat",
        "Bounce",
      ],
    ],
    body: dailyRows,
    theme: "striped",
    headStyles: {
      fillColor: [0, 98, 235],
      fontSize: 8,
      cellPadding: 2,
    },
    bodyStyles: { fontSize: 8, cellPadding: 2 },
    margin: { left: 14, right: 14 },
  });

  // Top terms
  const allTerms = new Map<string, number>();
  for (const s of summaries) {
    for (const t of s.topTerms || []) {
      allTerms.set(t.term, (allTerms.get(t.term) || 0) + t.clicks);
    }
  }
  const topTerms = Array.from(allTerms.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (topTerms.length > 0) {
    const termsY = (pdf as any).lastAutoTable?.finalY || 200;

    if (termsY > 240) pdf.addPage();
    const startY = termsY > 240 ? 20 : termsY + 12;

    pdf.setFontSize(12);
    pdf.setTextColor(17, 17, 17);
    pdf.text("Top Begrippen", 14, startY);

    autoTable(pdf, {
      startY: startY + 4,
      head: [["Begrip", "Kliks"]],
      body: topTerms.map(([term, clicks]) => [term, clicks.toString()]),
      theme: "striped",
      headStyles: {
        fillColor: [0, 98, 235],
        fontSize: 8,
        cellPadding: 2,
      },
      bodyStyles: { fontSize: 8, cellPadding: 2 },
      margin: { left: 14, right: 14 },
      tableWidth: 120,
    });
  }

  // Footer
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(153, 153, 153);
    pdf.text(
      `Gegenereerd door doc1.ai — ${new Date().toLocaleDateString("nl-NL")}`,
      14,
      pdf.internal.pageSize.getHeight() - 10
    );
    pdf.text(
      `Pagina ${i} van ${pageCount}`,
      pageWidth - 14,
      pdf.internal.pageSize.getHeight() - 10,
      { align: "right" }
    );
  }

  const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="analytics-${doc.shortId}-${period}.pdf"`,
    },
  });
}
