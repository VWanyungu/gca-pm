import Image from "next/image";
import Link from "next/link";

const COPY = {
  "404": {
    particles: "/system-state/404-particles.svg",
    heading: "Page not found",
    body: "The page you were looking for does not exist or has moved.",
  },
  "403": {
    particles: "/system-state/403-particles.svg",
    heading: "Access denied",
    body: "You don't have access to this page. Ask an Admin if you think you should.",
  },
} as const;

interface SystemStateScreenProps {
  code: keyof typeof COPY;
  withinAppShell?: boolean;
}

export function SystemStateScreen({ code, withinAppShell = true }: SystemStateScreenProps) {
  const { particles, heading, body } = COPY[code];

  return (
    <div
      className={`flex items-center justify-center bg-gca-page-bg p-[12px] ${
        withinAppShell ? "min-h-[calc(100vh-64px)]" : "min-h-screen"
      }`}
    >
      <div className="relative flex w-full max-w-[1424px] flex-col overflow-hidden rounded-[12px] bg-white">
        <div className="relative h-[520px] w-full shrink-0 sm:h-[620px]">
          <Image src={particles} alt="" fill priority sizes="100vw" className="object-contain" />
        </div>
        <div className="flex flex-col items-start gap-[20px] bg-gca-green px-[32px] pb-[40px] pt-[36px] sm:px-[88px]">
          <div className="flex flex-col gap-[4px]">
            <h1 className="text-[24px] font-normal tracking-[-0.36px] text-white sm:text-[30px] sm:tracking-[-0.45px]">
              {heading}
            </h1>
            <p className="max-w-[560px] text-[24px] font-normal tracking-[-0.36px] text-[#f2f2f0] sm:text-[30px] sm:tracking-[-0.45px]">
              {body}
            </p>
          </div>
          <Link
            href="/"
            className="rounded-[999px] bg-[#262626] px-[14px] py-[10px] text-[13px] font-medium text-[#f2f2f0] hover:bg-black"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
