import { redirect } from "next/navigation";
import { auth } from "~/server/auth"; // server-side

import LoginForm from "./LoginForm"; // client component

export default async function LoginPage() {
  const session = await auth();

  if (session) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}
