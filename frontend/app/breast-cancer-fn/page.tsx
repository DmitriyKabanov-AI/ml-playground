"use client";
import { BCPage } from "@/components/bc/BCPage";

export default function BreastCancerFNPage() {
  return (
    <BCPage
      config={{
        task: "breast_cancer_fn",
        hero: "f2_pos",
        heroLabel: "F2 (malignant)",
        defaultThreshold: 0.626923,
        subtitle: "Второе мнение: FN критичен — порог сдвинут вверх от 0.5",
      }}
    />
  );
}