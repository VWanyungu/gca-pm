import { SystemStateScreen } from "@/components/system-state/system-state-screen";

export default function NotFound() {
  return <SystemStateScreen code="404" withinAppShell={false} />;
}
