import UploadZone from "@/components/documents/UploadZone";

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Document Uploaden</h1>
        <p className="text-muted-foreground">
          Upload een PDF of DOCX bestand om te beginnen met verwerken
        </p>
      </div>
      <UploadZone />
    </div>
  );
}
