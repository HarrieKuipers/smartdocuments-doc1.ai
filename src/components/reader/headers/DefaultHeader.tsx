interface DefaultHeaderProps {
  title: string;
  organization: { name: string; logo?: string };
  brandPrimary: string;
}

export default function DefaultHeader({ title, organization, brandPrimary }: DefaultHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b bg-white shadow-sm">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900 md:text-xl lg:text-2xl">
          {title}
        </h1>
      </div>
    </header>
  );
}
