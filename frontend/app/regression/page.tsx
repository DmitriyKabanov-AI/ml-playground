import { Suspense } from "react";
import RegressionConsole from "@/components/regression/RegressionConsole";

export default function RegressionPage() {
  return (
    <Suspense fallback={null}>
      <RegressionConsole />
    </Suspense>
  );
}