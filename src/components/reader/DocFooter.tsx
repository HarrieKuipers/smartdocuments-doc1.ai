interface DocFooterProps {
  brandPrimary: string;
}

export default function DocFooter({ brandPrimary }: DocFooterProps) {
  return (
    <footer className="border-t bg-white py-6">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-6 text-center text-sm text-muted-foreground">
        <a
          href="https://doc1.ai"
          className="inline-flex items-center hover:opacity-80 transition-opacity"
        >
          <img
            src="/logo_doc1_v2.svg"
            alt="DOC1"
            className="h-5"
          />
        </a>
      </div>
    </footer>
  );
}
