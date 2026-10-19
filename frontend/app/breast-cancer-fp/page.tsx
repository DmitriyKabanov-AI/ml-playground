import { redirect } from "next/navigation";

export default function LegacyClassificationRoute() {
  redirect("/classification?tab=flight-delay");
}
