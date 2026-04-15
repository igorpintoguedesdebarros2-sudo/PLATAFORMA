import { useState, useEffect } from "react";

export default function Pagamento() {

  const TELEFONE_ADM = "5521999999999";

  const cursos = [
    { nome: "NR1", link: "/nr1" },
    { nome: "NR5", link: "/nr5" },
    { nome: "NR6", link: "/nr6" },
    { nome: "NR10", link: "/nr10" },
    { nome: "NR10HV", link: "/nr10hv" },
    { nome: "NR11", link: "/nr11" },
    { nome: "NR12", link: "/nr12" },
    { nome: "NR13", link: "/nr13" },
    { nome: "NR16", link: "/nr16" },
    { nome: "NR17", link: "/nr17" },
    { nome: "NR18", link: "/nr18" },
    { nome: "NR20", link: "/nr20" },
    { nome: "NR23", link: "/nr23" },
    { nome: "NR26", link: "/nr26" },
    { nome: "NR29", link: "/nr29" },
    { nome: "NR30", link: "/nr30" },
    { nome: "NR32", link: "/nr32" },
    { nome: "NR33", link: "/nr33" },
    { nome: "NR34", link: "/nr34" },
    { nome: "NR35", link: "/nr35" },
    { nome: "NR37", link: "/nr37" },
    { nome: "NR38", link: "/nr38" },
    { nome: "Matematica", link: "/Matematica" },
    { nome: "Matematica2", link: "/Matematica2" },
    { nome: "Portugues", link: "/Portugues" },
    { nome: "Drone", link: "/drone" },
  ];

  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  // 🔥 controle de contato com ADM
  const [falouComAdm, setFalouComAdm] = useState({});

  // 📱 WhatsApp
  const falarComAdm = (curso) => {
    const mensagem = `Olá, tenho interesse no curso ${curso}. Podemos combinar o valor?`;
    const url = `https://wa.me/${TELEFONE_ADM}?text=${encodeURIComponent(mensagem)}`;

    window.open(url, "_blank");

    // ✅ libera botão desse curso
    setFalouComAdm(prev => ({
      ...prev,
      [curso]: true
    }));
  };

  const carregarPedidos = async () => {
    try {
      setErro("");

      const resUser = await fetch("http://localhost:3000/me", {
        credentials: "include"
      });

      if (!resUser.ok) throw new Error("Não autorizado");

      const resPag = await fetch("http://localhost:3000/my-payments", {
        credentials: "include"
      });

      if (!resPag.ok) throw new Error("Erro ao buscar pedidos");

      const data = await resPag.json();

      const unicos = Array.from(new Map(data.map(p => [p.curso, p])).values());

      setPedidos(unicos);

    } catch (err) {
      console.error(err);
      setErro("Erro ao carregar pedidos");
    }
  };

  useEffect(() => {
    carregarPedidos();
  }, []);

  const cursosDisponiveis = cursos.filter(curso =>
    !pedidos.some(p => p.curso === curso.nome)
  );

  const criarPedido = async (curso) => {
    setLoading(true);
    setErro("");

    try {
      const res = await fetch("http://localhost:3000/criar-pedido", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ curso })
      });

      if (!res.ok) throw new Error();

      await carregarPedidos();

    } catch {
      setErro("Erro ao criar pedido");
    } finally {
      setLoading(false);
    }
  };

  const pagar = async (id) => {
    try {
      const res = await fetch(`http://localhost:3000/create-checkout/${id}`, {
        method: "POST",
        credentials: "include"
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      window.location.href = data.url;

    } catch {
      setErro("Erro ao iniciar pagamento");
    }
  };

  const acessarCurso = (cursoNome) => {
    const curso = cursos.find(c => c.nome === cursoNome);
    if (!curso) return setErro("Link não encontrado");
    window.open(curso.link, "_blank");
  };

  const finalizarCurso = async (id) => {
    try {
      const res = await fetch(`http://localhost:3000/finalizar-curso/${id}`, {
        method: "POST",
        credentials: "include"
      });

      if (!res.ok) throw new Error();

      alert("Curso finalizado");
      setPedidos(prev => prev.filter(p => p.id !== id));

    } catch {
      setErro("Erro ao finalizar curso");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Cursos</h2>

      {erro && <p style={{ color: "red" }}>{erro}</p>}

      {cursosDisponiveis.map((curso, i) => (
        <div key={i} style={{ marginBottom: 15 }}>
          <p>{curso.nome}</p>

          <button onClick={() => falarComAdm(curso.nome)}>
            📱 Falar com ADM
          </button>

          <button
            onClick={() => criarPedido(curso.nome)}
            disabled={!falouComAdm[curso.nome] || loading}
            style={{ marginLeft: 10 }}
          >
            {loading ? "Enviando..." : "Já combinei o preço"}
          </button>
        </div>
      ))}

      <hr />

      <h2>Meus pedidos</h2>

      {pedidos.map((p) => (
        <div key={p.id} style={{ marginBottom: 20 }}>
          <p>
            <strong>{p.curso}</strong> — {p.status}
          </p>

          {p.status === "pendente" && <p>Aguardando ADM...</p>}

          {p.status === "analise" && (
            <>
              <p>Preço: R$ {p.preco}</p>
              <button onClick={() => pagar(p.id)}>Pagar</button>
            </>
          )}

          {p.status === "pago" && (
            <>
              <p style={{ color: "green" }}>Curso liberado</p>

              <button onClick={() => acessarCurso(p.curso)}>
                Ver curso
              </button>

              <button onClick={() => finalizarCurso(p.id)}>
                Finalizar curso
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}