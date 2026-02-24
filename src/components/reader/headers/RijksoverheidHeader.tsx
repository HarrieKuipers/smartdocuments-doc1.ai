interface RijksoverheidHeaderProps {
  title: string;
  brandPrimary: string;
  logo: string;
}

export default function RijksoverheidHeader({ title, brandPrimary, logo }: RijksoverheidHeaderProps) {
  return (
    <header>
      {/* White bar with centered logo */}
      <div className="border-b border-gray-200 bg-white px-3 pb-6 text-center">
        <img
          src={logo}
          alt="Rijksoverheid"
          className="mx-auto h-[60px] md:h-[100px]"
        />
      </div>
      {/* Colored bar with left-aligned title */}
      <div
        className="px-4 py-4 md:px-6"
        style={{ backgroundColor: brandPrimary }}
      >
        <div className="mx-auto max-w-[1400px]">
          <h1 className="text-lg font-normal leading-relaxed text-white md:text-xl lg:pl-[376px]">
            {title}
          </h1>
        </div>
      </div>
    </header>
  );
}
