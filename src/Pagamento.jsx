import { useEffect, useState } from "react";

const cursosPadrao = [
  { id: 1, nome: "Curso NR1", preco: 50, arquivoCurso: "#/nr1" },
  { id: 2, nome: "Curso NR5", preco: 60, arquivoCurso: "#/nr5" },
  { id: 3, nome: "Curso NR6", preco: 80, arquivoCurso: "#/nr6" },
  { id: 4, nome: "Curso NR10", preco: 50, arquivoCurso: "#/nr10" },
  { id: 5, nome: "Curso NR10HV", preco: 60, arquivoCurso: "#/nr10hv" },
  { id: 6, nome: "Curso NR11", preco: 80, arquivoCurso: "#/nr11" },
  { id: 7, nome: "Curso NR12", preco: 50, arquivoCurso: "#/nr12" },
  { id: 8, nome: "Curso NR13", preco: 60, arquivoCurso: "#/nr13" },
  { id: 9, nome: "Curso NR16", preco: 80, arquivoCurso: "#/nr16" },
  { id: 10, nome: "Curso NR17", preco: 50, arquivoCurso: "#/nr17" },
  { id: 11, nome: "Curso NR18", preco: 60, arquivoCurso: "#/nr18" },
  { id: 12, nome: "Curso NR20", preco: 50, arquivoCurso: "#/nr20" },
  { id: 13, nome: "Curso NR23", preco: 60, arquivoCurso: "#/nr23" },
  { id: 14, nome: "Curso NR26", preco: 80, arquivoCurso: "#/nr26" },
  { id: 15, nome: "Curso NR29", preco: 50, arquivoCurso: "#/nr29" },
  { id: 16, nome: "Curso NR30", preco: 60, arquivoCurso: "#/nr30" },
  { id: 17, nome: "Curso NR32", preco: 80, arquivoCurso: "#/nr32" },
  { id: 18, nome: "Curso NR33", preco: 50, arquivoCurso: "#/nr33" },
  { id: 19, nome: "Curso NR34", preco: 60, arquivoCurso: "#/nr34" },
  { id: 20, nome: "Curso NR35", preco: 80, arquivoCurso: "#/nr35" },
  { id: 21, nome: "Curso NR37", preco: 50, arquivoCurso: "#/nr37" },
  { id: 22, nome: "Curso NR38", preco: 60, arquivoCurso: "#/nr38" },
];

export default function Cursos() {
  const [cursosDisponiveis, setCursosDisponiveis] = useState([]);
  const [comprados, setComprados] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [botoesHabilitados, setBotoesHabilitados] = useState({});
  const [selecionados, setSelecionados] = useState(new Set());
  const [mostrarQR, setMostrarQR] = useState(false);

  useEffect(() => {
    const lsCursos =
      JSON.parse(localStorage.getItem("cursosDisponiveis")) || cursosPadrao;
    const lsComprados =
      JSON.parse(localStorage.getItem("comprados")) || [];
    const lsHistorico =
      JSON.parse(localStorage.getItem("historico")) || [];
    const lsBotoes =
      JSON.parse(localStorage.getItem("botoesHabilitados")) || {};

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

  const total = Array.from(selecionados)
    .map((id) => cursosDisponiveis.find((c) => c.id === id)?.preco || 0)
    .reduce((a, b) => a + b, 0);

  function toggleCurso(id) {
    const novo = new Set(selecionados);
    novo.has(id) ? novo.delete(id) : novo.add(id);
    setSelecionados(novo);
  }

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
    const restantes = cursosDisponiveis.filter(
      (c) => !selecionados.has(c.id)
    );

    setComprados(novosComprados);
    setCursosDisponiveis(restantes);
    setSelecionados(new Set());
    setMostrarQR(false);

    localStorage.setItem("comprados", JSON.stringify(novosComprados));
    localStorage.setItem("cursosDisponiveis", JSON.stringify(restantes));
  }

  function habilitar(id) {
    const novo = { ...botoesHabilitados, [id]: true };
    setBotoesHabilitados(novo);
    localStorage.setItem("botoesHabilitados", JSON.stringify(novo));
  }

  return (
    <div>
      <h1>Selecione os Cursos</h1>

      {cursosDisponiveis.map((curso) => (
        <div key={curso.id}>
          {curso.nome} - R$ {curso.preco.toFixed(2)}
          <button onClick={() => toggleCurso(curso.id)}>
            {selecionados.has(curso.id) ? "Remover" : "Selecionar"}
          </button>
        </div>
      ))}

      <p>Total: R$ {total.toFixed(2)}</p>

      <button onClick={finalizarPagamento}>Finalizar Pagamento</button>

      <h2>Cursos Comprados</h2>

      <button onClick={() => (window.location.href = "#/")}>
        VOLTAR
      </button>

      {comprados.map((curso) => (
        <div key={curso.id}>
          {curso.nome}
          <a
            href={curso.arquivoCurso}
            onClick={() => habilitar(curso.id)}
          >
            {" "}
            [Acessar]
          </a>
        </div>
      ))}
    </div>
  );
}
