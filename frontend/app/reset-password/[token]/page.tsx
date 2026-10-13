import { connection } from "next/server";
import ResetForm from "./reset-form";

export const instant = false;

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await connection();
  const { token } = await params;
  return <ResetForm token={token} />;
}
