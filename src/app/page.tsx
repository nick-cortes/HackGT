import { redirect } from "next/navigation";

export default async function Home() {
  return (
    <form action={async () => {
      "use server";
      redirect("/dashboard");
    }}>
      <button type="submit">Go to Dashboard</button>
    </form>
  );
}