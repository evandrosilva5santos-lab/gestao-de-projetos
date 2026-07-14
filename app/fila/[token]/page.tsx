import { FilaDaVezClient } from "./FilaDaVezClient";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <FilaDaVezClient token={token} />;
}
