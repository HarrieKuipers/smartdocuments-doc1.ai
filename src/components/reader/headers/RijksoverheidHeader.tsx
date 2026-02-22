interface RijksoverheidHeaderProps {
  title: string;
  brandPrimary: string;
  logo: string;
}

export default function RijksoverheidHeader({ title, brandPrimary, logo }: RijksoverheidHeaderProps) {
  return (
    <header>
      {/* White bar with centered logo */}
      <div className="border-b border-gray-200 bg-white px-4 pb-6 pt-4 text-center">
        <img
          src={logo}
          alt="Rijksoverheid"
          className="mx-auto h-[100px]"
        />
      </div>
      {/* Colored bar with centered title */}
      <div
        className="px-4 py-4 text-center"
        style={{ backgroundColor: brandPrimary }}
      >
        <div className="mx-auto max-w-5xl">
          <h1 className="text-lg font-normal leading-relaxed text-white md:text-xl">
            {title}
          </h1>
        </div>
      </div>
    </header>
  );
}
