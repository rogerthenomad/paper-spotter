import { createFileRoute } from "@tanstack/react-router";
import { ScanLab } from "@/components/scan-lab";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <ScanLab />;
}
