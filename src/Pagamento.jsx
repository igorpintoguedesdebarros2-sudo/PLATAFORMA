import { useEffect, useState } from "react";

const cursosPadrao = [
  const cursosPadrao = [
  { id: 1, nome: "Curso NR1", preco: 50, arquivoCurso: "/NR1" },
  { id: 2, nome: "Curso NR5", preco: 60, arquivoCurso: "/NR5" },
  { id: 3, nome: "Curso NR6", preco: 80, arquivoCurso: "/NR6" },
  { id: 4, nome: "Curso NR10", preco: 50, arquivoCurso: "/NR10" },
  { id: 5, nome: "Curso NR10HV", preco: 60, arquivoCurso: "/NR10HV" },
  { id: 6, nome: "Curso NR11", preco: 80, arquivoCurso: "/NR11" },
  { id: 7, nome: "Curso NR12", preco: 50, arquivoCurso: "/NR12" },
  { id: 8, nome: "Curso NR13", preco: 60, arquivoCurso: "/NR13" },
  { id: 9, nome: "Curso NR16", preco: 80, arquivoCurso: "/NR16" },
  { id: 10, nome: "Curso NR17", preco: 50, arquivoCurso: "/NR17" },
  { id: 11, nome: "Curso NR18", preco: 60, arquivoCurso: "/NR18" },
  { id: 12, nome: "Curso NR20", preco: 50, arquivoCurso: "/NR20" },
  { id: 13, nome: "Curso NR23", preco: 60, arquivoCurso: "/NR23" },
  { id: 14, nome: "Curso NR26", preco: 80, arquivoCurso: "/NR26" },
  { id: 15, nome: "Curso NR29", preco: 50, arquivoCurso: "/NR29" },
  { id: 16, nome: "Curso NR30", preco: 60, arquivoCurso: "/NR30" },
  { id: 17, nome: "Curso NR32", preco: 80, arquivoCurso: "/NR32" },
  { id: 18, nome: "Curso NR33", preco: 50, arquivoCurso: "/NR33" },
  { id: 19, nome: "Curso NR34", preco: 60, arquivoCurso: "/NR34" },
  { id: 20, nome: "Curso NR35", preco: 80, arquivoCurso: "/NR35" },
  { id: 21, nome: "Curso NR37", preco: 50, arquivoCurso: "/NR37" },
  { id: 22, nome: "Curso NR38", preco: 60, arquivoCurso: "/NR38" },
];

];

export default function Cursos() {
  const [cursosDisponiveis, setCursosDisponiveis] = useState([]);
  const [comprados, setComprados] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [botoesHabilitados, setBotoesHabilitados] = useState({});
  const [selecionados, setSelecionados] = useState(new Set());
  const [mostrarQR, setMostrarQR] = useState(false);

  /* ---------- LOAD LOCALSTORAGE ---------- */
  useEffect(() => {
    const lsCursos = JSON.parse(localStorage.getItem("cursosDisponiveis")) || cursosPadrao;
    const lsComprados = JSON.parse(localStorage.getItem("comprados")) || [];
    const lsHistorico = JSON.parse(localStorage.getItem("historico")) || [];
    const lsBotoes = JSON.parse(localStorage.getItem("botoesHabilitados")) || {};

    const filtrados = lsCursos.filter(
      (c) =>
        !lsComprados.some((x) => x.id === c.id) &&
        !lsHistorico.some((x) => x.id === c.id)
    );

    setCursosDisponiveis(filtrados);
    setComprados(lsComprados);
    setHistorico(lsHistorico);
    setBotoesHabilitados(lsBotoes);
  }, []);

  /* ---------- TOTAL ---------- */
  const total = Array.from(selecionados)
    .map((id) => cursosDisponiveis.find((c) => c.id === id)?.preco || 0)
    .reduce((a, b) => a + b, 0);

  /* ---------- SELECIONAR ---------- */
  function toggleCurso(id) {
    const novo = new Set(selecionados);
    novo.has(id) ? novo.delete(id) : novo.add(id);
    setSelecionados(novo);
  }

  /* ---------- PAGAMENTO ---------- */
  function finalizarPagamento() {
    if (selecionados.size === 0) {
      alert("Selecione pelo menos um curso para pagar.");
      return;
    }
    setMostrarQR(true);
  }

  function confirmarPagamento() {
    const selecionadosCursos = cursosDisponiveis.filter((c) =>
      selecionados.has(c.id)
    );

    const novosComprados = [...comprados, ...selecionadosCursos];

    const restantes = cursosDisponiveis.filter((c) =>
      selecionados.has(c.id)
    );

    setComprados(novosComprados);
    setCursosDisponiveis(restantes);
    setSelecionados(new Set());
    setMostrarQR(false);

    localStorage.setItem("comprados", JSON.stringify(novosComprados));
    localStorage.setItem("cursosDisponiveis", JSON.stringify(restantes));
  }

  /* ---------- COMPRADOS ---------- */
  function habilitar(id) {
    const novo = { ...botoesHabilitados, [id]: true };
    setBotoesHabilitados(novo);
    localStorage.setItem("botoesHabilitados", JSON.stringify(novo));
  }

  function moverParaHistorico(id) {
    const curso = comprados.find((c) => c.id === id);
    if (!curso) return;

    const novoHistorico = [...historico, curso];
    const novoComprados = comprados.filter((c) => c.id !== id);

    const novoBotoes = { ...botoesHabilitados };
    delete novoBotoes[id];

    setHistorico(novoHistorico);
    setComprados(novoComprados);
    setBotoesHabilitados(novoBotoes);

    localStorage.setItem("historico", JSON.stringify(novoHistorico));
    localStorage.setItem("comprados", JSON.stringify(novoComprados));
    localStorage.setItem("botoesHabilitados", JSON.stringify(novoBotoes));
  }

  /* ---------- JSX ---------- */
  return (
    <div>
      <h1>Selecione os Cursos</h1>

      <div>
        {cursosDisponiveis.map((curso) => (
          <div key={curso.id} className="curso">
            <span>
              {curso.nome} - R$ {curso.preco.toFixed(2)}
            </span>
            <button onClick={() => toggleCurso(curso.id)}>
              {selecionados.has(curso.id) ? "Remover" : "Selecionar"}
            </button>
          </div>
        ))}
      </div>

      <p>
        <strong>Total:</strong> R$ {total.toFixed(2)}
      </p>

      <button onClick={finalizarPagamento}>Finalizar Pagamento</button>

      {mostrarQR && (
        <div>
          <h3>Escaneie o QR Code:</h3>
          <img
            src={`https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(
              "MEU CODIGO PIX"
            )}`}
            alt="QR Code"
          />
          <br />
          <button onClick={confirmarPagamento}>
            Já realizei o pagamento
          </button>
        </div>
      )}

      <h2>Cursos Comprados</h2>

       <button
        onClick={() => window.location.href = "/src/index.html"}
        style={{
          padding: "10px",
          background: "#2563eb",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          marginBottom: "20px"
        }}
      >
        VOLTAR
      </button>

      {comprados.map((curso) => (
        <div key={curso.id} className="curso comprado">
          <span>{curso.nome}</span>
          <a
            href={curso.arquivoCurso}
            target="_blank"
            onClick={() => habilitar(curso.id)}
          >
            [Baixar]
          </a>
          <button
            disabled={!botoesHabilitados[curso.id]}
            onClick={() => moverParaHistorico(curso.id)}
          >
            Mover para Histórico
          </button>
        </div>
      ))}
    </div>
  );
}
