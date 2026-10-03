import { redirect } from "next/navigation";

// Startsidan skickar vidare till jobblistan.
export default function Home() {
  redirect("/jobs");
}