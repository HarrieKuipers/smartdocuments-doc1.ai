interface AmsterdamHeaderProps {
  title: string;
  brandPrimary: string;
  logo: string;
}

export default function AmsterdamHeader({ title, brandPrimary, logo }: AmsterdamHeaderProps) {
  return (
    <header
      className="border-b bg-white"
      style={{ borderBottomColor: brandPrimary }}
    >
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-4">
        <img
          src={logo}
          alt="Gemeente Amsterdam"
          className="h-[50px]"
        />
        <h1 className="text-lg font-semibold text-gray-900 md:text-xl">
          {title}
        </h1>
      </div>
    </header>
  );
}
