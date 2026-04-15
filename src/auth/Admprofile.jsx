import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [erro, setErro] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("http://localhost:3000/users", {
          credentials: "include",
          headers: {
            "x-csrf-token": localStorage.getItem("csrfToken")
          }
        });

        if (!res.ok) {
          throw new Error("Acesso negado");
        }

        const data = await res.json();
        setUsers(data);

      } catch (err) {
        console.error(err);
        setErro("Erro ao carregar usuários");
      }
    };

    fetchUsers();
  }, []);

  if (erro) return <p style={{ color: "red" }}>{erro}</p>;

  // 🔒 emails proibidos
  const EMAILS_BLOQUEADOS = [
    "ipgbtech@system.com",
    "teste@teste.com",
    "novo@teste.com"
  ];

  // 🔍 validação mais robusta
  const emailValido = (email) => {
    if (!email) return false;

    const lower = email.toLowerCase().trim();

    // formato básico
    const valido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lower);

    // bloqueios comuns
    const lixo = ["teste", "test", "abc", "123"];

    if (!valido) return false;
    if (lixo.some(x => lower.includes(x))) return false;
    if (EMAILS_BLOQUEADOS.includes(lower)) return false;

    return true;
  };

  // ✅ LIMPEZA + DEDUPLICAÇÃO POR EMAIL NORMALIZADO
  const usersUnicos = Array.from(
    new Map(
      users
        .filter(u => u.role !== "admin")
        .filter(u => emailValido(u.email))
        .map(u => [u.email.toLowerCase().trim(), u])
    ).values()
  );

  return (
    <div style={{ padding: 20 }}>
      <h1>Painel Admin</h1>

      <button onClick={() => navigate("/admhome")}>
        Home
      </button>

      {usersUnicos.length === 0 && <p>Nenhum usuário encontrado</p>}

      {usersUnicos.map((user) => {
        // ✅ cursos únicos
        const cursosUnicos = Array.from(
          new Set((user.cursos || []).map(c => c.trim()))
        );

        // ✅ pedidos únicos + válidos
        const pedidosUnicos = Array.from(
          new Map(
            (user.pedidos || [])
              .filter(p => p && p.curso) // segurança
              .map(p => [`${p.curso}`, p])
          ).values()
        ).filter(p => p.preco); // só com preço

        return (
          <div
            key={user.id}
            style={{
              border: "1px solid #ccc",
              margin: 10,
              padding: 10
            }}
          >
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Role:</strong> {user.role}</p>

            <h4>Cursos:</h4>
            <ul>
              {cursosUnicos.length === 0 ? (
                <li>Nenhum curso</li>
              ) : (
                cursosUnicos.map((c, i) => (
                  <li key={i}>{c}</li>
                ))
              )}
            </ul>

            <h4>Pedidos:</h4>
            <ul>
              {pedidosUnicos.length === 0 ? (
                <li>Nenhum pedido</li>
              ) : (
                pedidosUnicos.map((p, i) => (
                  <li key={i}>
                    {p.curso} — R$ {p.preco}
                  </li>
                ))
              )}
            </ul>
          </div>
        );
      })}
    </div>
  );
}