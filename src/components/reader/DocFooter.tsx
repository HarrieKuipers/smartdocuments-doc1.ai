interface DocFooterProps {
  brandPrimary: string;
}

export default function DocFooter({ brandPrimary }: DocFooterProps) {
  return (
    <footer className="border-t bg-white py-6">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-6 text-center text-sm text-muted-foreground">
        <a
          href="https://doc1.ai"
          aria-label="DOC1.ai - Ga naar de DOC1 website"
          className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <img
            src="/logo_doc1_v2.svg"
            alt="DOC1"
            className="h-5"
          />
          <span className="text-xs font-medium text-muted-foreground">Smart Document</span>
        </a>
      </div>
    </footer>
  );
}
