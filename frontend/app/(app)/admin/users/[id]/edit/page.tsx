import { connection } from "next/server";
import EditUserView from "./edit-view";

export const instant = false;

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  return <EditUserView userId={id} />;
}
