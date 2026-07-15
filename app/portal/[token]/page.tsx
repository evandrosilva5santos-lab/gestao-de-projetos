import { PortalLeadsClient } from "./PortalLeadsClient";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PortalLeadsClient token={token} />;
}
