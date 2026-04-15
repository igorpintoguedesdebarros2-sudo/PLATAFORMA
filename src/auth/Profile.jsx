import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function User() {
  const [user, setUser] = useState(null);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const carregarUser = async () => {
    try {
      setErro("");
      setLoading(true);

      const res = await fetch("http://localhost:3000/me", {
        credentials: "include"
      });

      const text = await res.text();

      if (!res.ok) {
        console.error("Erro backend:", text);

        if (res.status === 401) {
          setErro("Usuário não autenticado");
        } else {
          setErro("Erro interno do servidor");
        }

        return;
      }

      const data = JSON.parse(text);
      setUser(data);

    } catch (err) {
      console.error("Erro inesperado:", err);
      setErro("Erro de conexão com o servidor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (mounted) await carregarUser();
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <p>Carregando...</p>;

  if (erro) {
    return (
      <div style={{ padding: 20 }}>
        <p style={{ color: "red" }}>{erro}</p>

        <button onClick={carregarUser}>
          🔄 Tentar novamente
        </button>
      </div>
    );
  }

  if (!user) return null;

  // ✅ REMOVE DUPLICADOS DO HISTÓRICO
  const historicoUnico = Array.from(
    new Map(
      (user.historico || []).map(h => [h.curso, h])
    ).values()
  );

  // ✅ REMOVE DUPLICADOS DOS PEDIDOS
  const pedidosUnicos = Array.from(
    new Map(
      (user.pedidos || []).map(p => [p.curso, p])
    ).values()
  );

  return (
    <div style={{ padding: 20 }}>
      <h1>Perfil do Usuário</h1>

      <button onClick={() => navigate("/home")}>
        sair
      </button>

      <button onClick={carregarUser} style={{ marginLeft: 10 }}>
        🔄 Atualizar
      </button>

      <p><strong>Email:</strong> {user.email}</p>

      <hr />

      <h3>📚 Cursos finalizados</h3>
      <ul>
        {historicoUnico.length === 0 ? (
          <li>Nenhum curso finalizado ainda</li>
        ) : (
          historicoUnico.map((h) => (
            <li key={h.id}>
              <strong>{h.curso}</strong> — R$ {h.preco}
            </li>
          ))
        )}
      </ul>

      <hr />

      <h3>💳 Pedidos / Pagamentos</h3>
      <ul>
        {pedidosUnicos.length === 0 ? (
          <li>Nenhum pedido ainda</li>
        ) : (
          pedidosUnicos.map((p) => (
            <li key={p.id}>
              {p.curso} — {p.status}
              {p.preco && ` (R$ ${p.preco})`}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}