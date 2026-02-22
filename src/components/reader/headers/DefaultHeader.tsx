interface DefaultHeaderProps {
  organization: { name: string; logo?: string };
  brandPrimary: string;
}

export default function DefaultHeader({ organization, brandPrimary }: DefaultHeaderProps) {
  return (
    <header
      className="border-b bg-white"
      style={{ borderBottomColor: brandPrimary }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          {organization?.logo ? (
            <img
              src={organization.logo}
              alt={organization.name}
              className="h-8"
            />
          ) : (
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white text-sm font-bold"
              style={{ backgroundColor: brandPrimary }}
            >
              {organization?.name?.[0] || "D"}
            </div>
          )}
          <span className="font-medium text-gray-700">
            {organization?.name}
          </span>
        </div>
      </div>
    </header>
  );
}
