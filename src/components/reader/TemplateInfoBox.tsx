import { Info } from "lucide-react";

interface TemplateInfoBoxProps {
  brandPrimary: string;
  primaryLight: string;
  label: string;
}

export default function TemplateInfoBox({ brandPrimary, primaryLight, label }: TemplateInfoBoxProps) {
  return (
    <div
      className="mt-8 rounded-lg border-l-4 p-6"
      style={{ backgroundColor: primaryLight, borderLeftColor: brandPrimary }}
    >
      <h3
        className="mb-3 flex items-center gap-3 font-semibold"
        style={{ color: brandPrimary }}
      >
        <Info className="h-5 w-5" />
        {label}
      </h3>
      <p className="leading-relaxed text-gray-700">
        Voor volledige details en uitvoeringsplannen, zie het oorspronkelijke document.
      </p>
    </div>
  );
}
