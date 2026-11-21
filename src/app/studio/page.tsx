import type { Metadata } from "next";
import { FretMasterStudioClient } from "@/components/studio/FretMasterStudioClient";

export const metadata: Metadata = {
  title: "Practice Studio",
  robots: {
    index: false,
    follow: false,
  },
};

export default function StudioPage() {
  return <FretMasterStudioClient />;
}
