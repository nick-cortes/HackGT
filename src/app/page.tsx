import { redirect } from "next/navigation";
import Timeline from "@/components/Timeline";

export default async function Home() {
  return (
    <div>
      <form action={async () => {
        "use server";
        redirect("/dashboard");
      }}>
        <button type="submit">Go to Dashboard</button>
      </form>
    </div>
  );
}