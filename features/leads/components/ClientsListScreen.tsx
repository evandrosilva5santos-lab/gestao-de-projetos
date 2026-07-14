"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateClientModal } from "./CreateClientModal";

type ClientWorkspace = {
  id: string;
  name: string;
  slug: string;
  clientAccessToken: string | null;
  activeSellerCount: number;
  leadsToday: number;
};

export function ClientsListScreen({
  onSelect
}: {
  onSelect?: (workspaceId: string, workspaceName: string) => void;
} = {}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientWorkspace[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadClients = () => {
    setLoading(true);
    import("../actions").then(({ listClientWorkspaces }) => {
      listClientWorkspaces().then((res) => {
        setLoading(false);
        if (!res.success) {
          setError(res.error);
          return;
        }
        setClients(res.workspaces);
      });
    });
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleClientCreated = (workspace: { id: string; name: string; slug: string }) => {
    loadClients();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-500">Carregando clientes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p className="text-red-700">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Clientes (Workspaces)</h1>
          <p className="text-slate-500 mt-1">Gerencie os clientes e suas filas de leads</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          + Novo Cliente
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((client) => (
          <Card
            key={client.id}
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => onSelect?.(client.id, client.name)}
          >
            <CardHeader>
              <CardTitle className="text-lg">{client.name}</CardTitle>
              <CardDescription>{client.slug}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Leads (Hoje)</p>
                  <p className="text-2xl font-bold text-slate-900">{client.leadsToday}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Vendedores Ativos</p>
                  <p className="text-2xl font-bold text-slate-900">{client.activeSellerCount}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-slate-500 mb-2">Acesso do Cliente</p>
                  {client.clientAccessToken ? (
                    <Badge className="bg-emerald-500">Link Gerado</Badge>
                  ) : (
                    <Badge variant="outline" className="text-slate-500">Sem Link</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {clients.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-slate-400">
            Nenhum cliente cadastrado ainda.
          </CardContent>
        </Card>
      )}

      {showCreateModal && (
        <CreateClientModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleClientCreated}
        />
      )}
    </div>
  );
}
