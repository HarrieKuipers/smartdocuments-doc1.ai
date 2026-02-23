interface DocFooterProps {
  brandPrimary: string;
}

export default function DocFooter({ brandPrimary }: DocFooterProps) {
  return (
    <footer className="border-t bg-white py-6">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-6 text-center text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>Mogelijk gemaakt door</span>
          <a
            href="https://doc1.ai"
            className="inline-flex items-center font-bold text-base hover:opacity-80 transition-opacity"
          >
            <span className="text-gray-900">DOC</span>
            <span style={{ color: brandPrimary }}>1</span>
          </a>
        </div>
        <p className="text-xs text-muted-foreground">
          Een product van{" "}
          <a
            href="https://espire.agency"
            className="font-medium hover:underline"
          >
            Espire Agency
          </a>
        </p>
      </div>
    </footer>
  );
}
