"use client";

import { useState } from "react";
import { listMetaAdAccounts, saveMetaAdAccounts } from "@/features/_shared/integrations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AdAccount {
  id: string;
  name: string;
  isSelected: boolean;
}

export function ClientMetaAdAccountsTab({ workspaceId }: { workspaceId: string }) {
  const [bmToken, setBmToken] = useState("");
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleBuscarContas = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    const result = await listMetaAdAccounts(bmToken, workspaceId);
    if (!result.success) {
      setError(result.error);
      setAccounts([]);
    } else {
      setAccounts(result.adAccounts);
    }
    setLoading(false);
  };

  const handleToggleAccount = (accountId: string) => {
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === accountId ? { ...acc, isSelected: !acc.isSelected } : acc
      )
    );
  };

  const handleSalvar = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    const selectedIds = accounts.filter((a) => a.isSelected).map((a) => a.id);
    const result = await saveMetaAdAccounts({
      workspaceId,
      bmToken,
      selectedAccountIds: selectedIds,
    });

    if (!result.success) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Meta Business Manager</h2>
        <p className="text-slate-500 mt-1">Conecte contas de anúncio ao seu workspace</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cole seu Business Manager Token</CardTitle>
          <CardDescription>
            Token de usuário do sistema (EAA...). Veja o guia completo em "Central de Integrações".
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <input
              type="password"
              placeholder="EAA..."
              value={bmToken}
              onChange={(e) => setBmToken(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg font-mono text-sm"
            />
          </div>
          <button
            onClick={handleBuscarContas}
            disabled={!bmToken.trim() || loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm disabled:opacity-50"
          >
            {loading ? "Buscando..." : "Buscar contas"}
          </button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-700 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {success && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="pt-6">
            <p className="text-emerald-700 text-sm">✓ Contas salvas com sucesso</p>
          </CardContent>
        </Card>
      )}

      {accounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Selecione as contas para este workspace</CardTitle>
            <CardDescription>{accounts.length} contas encontradas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {accounts.map((account) => (
              <label
                key={account.id}
                className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={account.isSelected}
                  onChange={() => handleToggleAccount(account.id)}
                  className="w-4 h-4"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900">{account.name}</p>
                  <p className="text-xs text-slate-500 font-mono">{account.id}</p>
                </div>
                {account.isSelected && (
                  <Badge className="bg-emerald-500">Selecionado</Badge>
                )}
              </label>
            ))}

            <button
              onClick={handleSalvar}
              disabled={saving || accounts.every((a) => !a.isSelected)}
              className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium text-sm disabled:opacity-50 mt-4"
            >
              {saving ? "Salvando..." : "Salvar seleção"}
            </button>
          </CardContent>
        </Card>
      )}

      {accounts.length === 0 && !loading && bmToken && (
        <Card>
          <CardContent className="py-8 text-center text-slate-400">
            Nenhuma conta encontrada. Verifique o token e tente novamente.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
