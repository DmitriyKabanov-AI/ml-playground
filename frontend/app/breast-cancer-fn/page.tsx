"use client";
import { BCPage } from "@/components/bc/BCPage";

export default function BreastCancerFNPage() {
  return (
    <BCPage
      config={{
        task: "breast_cancer_fn",
        hero: "f2_pos",
        heroLabel: "F2 (malignant)",
        // FIX: FN критичен → порог НИЖЕ 0.5, чтобы чаще ловить malignant.
        // Старое значение 0.626923 противоречило смыслу задачи.
        defaultThreshold: 0.465385,
        subtitle: "Второе мнение: FN критичен — порог сдвинут вниз от 0.5",
      }}
    />
  );
}