"use client";
import { BCPage } from "@/components/bc/BCPage";

export default function BreastCancerFPPage() {
  return (
    <BCPage
      config={{
        task: "breast_cancer_fp",
        hero: "f0.5_pos",
        heroLabel: "F0.5 (malignant)",
        defaultThreshold: 0.465385,
        subtitle: "Скрининг: FP дорог — порог сдвинут вверх от 0.5",
      }}
    />
  );
}