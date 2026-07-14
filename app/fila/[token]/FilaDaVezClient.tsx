"use client";

import { useState, useEffect } from "react";
import { getSellersByClientToken, toggleSellerActiveByClientToken } from "@/features/leads/actions";

type Seller = { id: string; name: string; phone: string | null; is_active: boolean };

export function FilaDaVezClient({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [sellers, setSellers] = useState<Seller[]>([]);

  useEffect(() => {
    getSellersByClientToken(token).then((res) => {
      setLoading(false);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setWorkspaceName(res.workspaceName);
      setSellers(res.sellers);
    });
  }, [token]);

  const handleToggle = async (seller: Seller) => {
    const next = !seller.is_active;
    setSellers((prev) => prev.map((s) => (s.id === seller.id ? { ...s, is_active: next } : s)));

    const res = await toggleSellerActiveByClientToken(token, seller.id, next);
    if (!res.success) {
      setSellers((prev) => prev.map((s) => (s.id === seller.id ? { ...s, is_active: !next } : s)));
      alert("Erro ao atualizar: " + res.error);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, fontFamily: "system-ui, sans-serif", color: "#666" }}>Carregando...</div>;
  }

  if (error) {
    return <div style={{ padding: 40, fontFamily: "system-ui, sans-serif", color: "#b91c1c" }}>{error}</div>;
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "40px 20px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: "#0f172a" }}>Fila da Vez</h1>
      <p style={{ color: "#64748b", marginBottom: 28, fontSize: 14 }}>{workspaceName}</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sellers.map((seller) => (
          <div
            key={seller.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              border: "1px solid #e5e7eb",
              borderRadius: 10
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: "#0f172a" }}>{seller.name}</div>
              {seller.phone && <div style={{ fontSize: 13, color: "#94a3b8" }}>{seller.phone}</div>}
            </div>
            <button
              onClick={() => handleToggle(seller)}
              style={{
                height: 34,
                padding: "0 16px",
                borderRadius: 8,
                border: "none",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                background: seller.is_active ? "#dcfce7" : "#f1f5f9",
                color: seller.is_active ? "#166534" : "#64748b"
              }}
            >
              {seller.is_active ? "Ativo" : "Pausado"}
            </button>
          </div>
        ))}

        {sellers.length === 0 && (
          <div style={{ color: "#94a3b8", fontSize: 14, textAlign: "center", padding: "20px 0" }}>
            Nenhum vendedor cadastrado ainda.
          </div>
        )}
      </div>
    </div>
  );
}
