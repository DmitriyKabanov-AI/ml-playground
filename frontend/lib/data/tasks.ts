import { TaskId } from "../types";

export interface TaskMeta {
  id: TaskId;        // ключ для store ("bc-fp")
  href: string;      // URL ("/breast-cancer-fp")
  slug: string;      // папка в artifacts/classification/
  title: string;
  subtitle: string;
  icon: "flower" | "ribbon" | "stethoscope" | "shield" | "grid";
  accent: string;
  reportPath: string;
  sweepPath?: string;   // threshold_sweep.csv — только где есть
}

export const TASKS: TaskMeta[] = [
  {
    id: "iris", href: "/iris", slug: "iris",
    title: "Iris",
    subtitle: "Многоклассовая классификация, baseline",
    icon: "flower", accent: "from-emerald-500 to-teal-500",
    reportPath: "classification/iris/report.json",
  },
  {
    id: "bc-fp", href: "/breast-cancer-fp", slug: "breast_cancer_fp",
    title: "Breast Cancer · Скрининг",
    subtitle: "Дорогие ложноположительные",
    icon: "ribbon", accent: "from-sky-500 to-indigo-500",
    reportPath: "classification/breast_cancer_fp/report.json",
    sweepPath: "classification/breast_cancer_fp/threshold_sweep.csv",
  },
  {
    id: "bc-fn", href: "/breast-cancer-fn", slug: "breast_cancer_fn",
    title: "Breast Cancer · Второе мнение",
    subtitle: "Критичны ложноотрицательные",
    icon: "stethoscope", accent: "from-rose-500 to-pink-500",
    reportPath: "classification/breast_cancer_fn/report.json",
    sweepPath: "classification/breast_cancer_fn/threshold_sweep.csv",
  },
  {
    id: "fraud", href: "/credit-fraud", slug: "credit_fraud",
    title: "Credit Fraud",
    subtitle: "Экстремальный дисбаланс классов",
    icon: "shield", accent: "from-amber-500 to-orange-500",
    reportPath: "classification/credit_fraud/report.json",
  },
  {
    id: "digits", href: "/digits", slug: "digits_imbalanced",
    title: "Digits Imbalanced",
    subtitle: "Редкий класс, macro vs weighted",
    icon: "grid", accent: "from-violet-500 to-fuchsia-500",
    reportPath: "classification/digits_imbalanced/report.json",
  },
];

export const getTask = (id: TaskId) => TASKS.find((t) => t.id === id)!;
