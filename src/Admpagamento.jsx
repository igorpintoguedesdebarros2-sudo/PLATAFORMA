import { useEffect, useState } from "react";

export default function AdmPagamento() {
  const [pagamentos, setPagamentos] = useState([]);
  const [erro, setErro] = useState("");

  const carregar = async () => {
    try {
      setErro("");

      const res = await fetch("http://localhost:3000/payments", {
        credentials: "include"
      });

      // ✅ trata erro HTTP corretamente
      if (!res.ok) {
        const msg = await res.text();

        if (res.status === 401) {
          throw new Error("Não autorizado (faça login)");
        }

        if (res.status === 403) {
          throw new Error("Acesso negado (não é admin)");
        }

        if (res.status === 404) {
          throw new Error("Rota /payments não encontrada");
        }

        throw new Error(msg || "Erro ao buscar pagamentos");
      }

      const data = await res.json();
      setPagamentos(data);

    } catch (err) {
      console.error("Erro real:", err.message);
      setErro(err.message);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  // 💰 definir preço
  const definirPreco = async (id) => {
    const preco = prompt("Digite o valor do curso (R$):");

    if (!preco) return;

    try {
      const res = await fetch(`http://localhost:3000/definir-preco/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ preco: Number(preco) })
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg);
      }

      carregar();

    } catch (err) {
      console.error(err);
      setErro("Erro ao definir preço");
    }
  };

  // ✅ remove pagos
  const pagamentosAtivos = pagamentos.filter(p => p.status !== "pago");

  // ✅ remove duplicados
  const pagamentosUnicos = Array.from(
    new Map(
      pagamentosAtivos.map(p => [`${p.userId}_${p.curso}`, p])
    ).values()
  );

  return (
    <div style={{ padding: 20 }}>
      <h2>Painel ADM</h2>

      {erro && <p style={{ color: "red" }}>{erro}</p>}

      {pagamentosUnicos.length === 0 && (
        <p>Nenhum pagamento pendente</p>
      )}

      {pagamentosUnicos.map((p) => (
        <div key={p.id} style={{ marginBottom: 15 }}>
          <p>
            <strong>{p.curso}</strong> — {p.status}
          </p>

          {p.status === "pendente" && (
            <button onClick={() => definirPreco(p.id)}>
              Definir preço
            </button>
          )}

          {p.status === "analise" && (
            <p>⏳ Aguardando pagamento do usuário</p>
          )}
        </div>
      ))}
    </div>
  );
}