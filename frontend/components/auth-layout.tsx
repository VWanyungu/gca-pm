import Image from "next/image";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gca-surface md:bg-gca-page-bg">
      <div className="flex flex-1 items-stretch p-0 md:p-[52px]">
        <div className="flex w-full overflow-clip rounded-none bg-gca-surface md:rounded-[12px]">
          <div className="flex w-full flex-col md:flex-row">
            {/* Mobile: image on top */}
            <div className="relative h-[388px] w-full shrink-0 md:hidden">
              <Image
                src="/gas-plant.jpg"
                alt="Gas processing facility"
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-[rgba(46,125,69,0.22)] mix-blend-color" />
              <div className="absolute inset-0 bg-[rgba(232,241,234,0.12)]" />
            </div>

            {/* Left: form column */}
            <div className="flex flex-1 flex-col justify-between px-[20px] py-[18px] md:px-[72px] md:py-[48px]">
              <div className="flex flex-col">
                <div className="hidden md:block">
                  <GcaLogo />
                </div>
                <div className="mt-0 w-full max-w-[456px] md:mt-[119px]">{children}</div>
              </div>
              <p className="mt-[32px] text-[12px] text-gca-muted md:mt-[48px]">
                &copy; {new Date().getFullYear()} Gas Connect Africa &middot;{" "}
                <a href="#" className="underline">
                  Privacy notice
                </a>
              </p>
            </div>

            {/* Right: image (desktop) */}
            <div className="relative hidden overflow-clip rounded-[12px] md:block md:w-[calc(53.3%-12px)] m-[12px] ml-0">
              <Image
                src="/gas-plant.jpg"
                alt="Gas processing facility"
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-[rgba(46,125,69,0.22)] mix-blend-color" />
              <div className="absolute inset-0 bg-[rgba(232,241,234,0.12)]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GcaLogo() {
  return <Image src="/GCA Logo.svg" alt="Gas Connect Africa" width={89} height={32} priority />;
}
