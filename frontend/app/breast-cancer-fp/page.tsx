"use client";
import { BCPage } from "@/components/bc/BCPage";

export default function BreastCancerFPPage() {
  return (
    <BCPage
      config={{
        task: "breast_cancer_fp",
        hero: "f0.5_pos",
        heroLabel: "F0.5 (malignant)",
        // FIX: FP дорог → порог ВЫШЕ 0.5, чтобы реже поднимать тревогу.
        // Старое значение 0.465385 противоречило смыслу задачи.
        defaultThreshold: 0.626923,
        subtitle: "Скрининг: FP дорог — порог сдвинут вверх от 0.5",
      }}
    />
  );
}