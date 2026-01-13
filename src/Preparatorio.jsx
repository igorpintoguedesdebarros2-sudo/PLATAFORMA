import { useEffect, useState } from "react";
import { auth } from "../src/firebase";

// Cursos padrão do sistema PREPARATÓRIOS
const cursosPadrao = [
  { id: 1, nome: "Matemática", preco: 50, arquivoCurso: "/cursos/prep/matematica" },
  { id: 2, nome: "Paralelepípedo", preco: 60, arquivoCurso: "/cursos/prep/paralelepipedo" },
  { id: 3, nome: "Losango", preco: 80, arquivoCurso: "/cursos/prep/losango" },
];

export default function Pagamento() {
  const [cursosDisponiveis, setCursosDisponiveis] = useState(cursosPadrao);
  const [comprados, setComprados] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [habilitados, setHabilitados] = useState({});
  const [selecionados, setSelecionados] = useState(new Set());
  const [mostrarQR, setMostrarQR] = useState(false);
  const [liberarPagamento, setLiberarPagamento] = useState(false);

  // 🔥 carrega dados DO PREPARATÓRIO quando logar
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (!user) return;

      const keyComp = `PREP_comprados_${user.uid}`;
      const keyHist = `PREP_historico_${user.uid}`;
      const keyHab  = `PREP_botoes_${user.uid}`;

      const comp = JSON.parse(localStorage.getItem(keyComp)) || [];
      const hist = JSON.parse(localStorage.getItem(keyHist)) || [];
      const hab  = JSON.parse(localStorage.getItem(keyHab)) || {};

      const disp = cursosPadrao.filter(
        c => !comp.some(x => x.id === c.id) &&
             !hist.some(x => x.id === c.id)
      );

      setComprados(comp);
      setHistorico(hist);
      setHabilitados(hab);
      setCursosDisponiveis(disp);
    });

    return () => unsub();
  }, []);

  function toggleCurso(id) {
    const nova = new Set(selecionados);
    nova.has(id) ? nova.delete(id) : nova.add(id);
    setSelecionados(nova);
  }

  const total = Array.from(selecionados)
    .map(id => cursosDisponiveis.find(c => c.id === id)?.preco || 0)
    .reduce((a, b) => a + b, 0);

  function falarWhatsApp() {
    if (selecionados.size === 0) {
      alert("Selecione pelo menos um curso!");
      return;
    }
    setLiberarPagamento(true);

    const mensagem = encodeURIComponent(
      "Olá! Tenho interesse nos cursos preparatórios selecionados."
    );

    window.open(`https://wa.me/55SEUNUMEROAQUI?text=${mensagem}`, "_blank");
  }

  function gerarQRCode() {
    if (!liberarPagamento) {
      alert("Fale no WhatsApp antes 😉");
      return;
    }
    setMostrarQR(true);
  }

  function confirmarPagamento() {
    const user = auth.currentUser;
    if (!user) {
      alert("Faça login para confirmar o pagamento");
      return;
    }

    const keyComp = `PREP_comprados_${user.uid}`;

    const cursosSel = cursosDisponiveis.filter(c => selecionados.has(c.id));
    const novosComprados = [...comprados, ...cursosSel];

    localStorage.setItem(keyComp, JSON.stringify(novosComprados));
    setComprados(novosComprados);

    const disp = cursosPadrao.filter(
      c => !novosComprados.some(x => x.id === c.id) &&
           !historico.some(x => x.id === c.id)
    );

    setCursosDisponiveis(disp);
    setSelecionados(new Set());
    setMostrarQR(false);
  }

  function habilitarBotao(id) {
    const user = auth.currentUser;
    if (!user) return;

    const keyHab = `PREP_botoes_${user.uid}`;
    const novo = { ...habilitados, [id]: true };

    setHabilitados(novo);
    localStorage.setItem(keyHab, JSON.stringify(novo));
  }

  function moverParaHistorico(id) {
    const user = auth.currentUser;
    if (!user) return;

    const keyHist = `PREP_historico_${user.uid}`;
    const keyComp = `PREP_comprados_${user.uid}`;
    const keyHab  = `PREP_botoes_${user.uid}`;

    const curso = comprados.find(c => c.id === id);
    if (!curso) return;

    const novoHist = [...historico, curso];
    const novosComp = comprados.filter(c => c.id !== id);

    localStorage.setItem(keyHist, JSON.stringify(novoHist));
    localStorage.setItem(keyComp, JSON.stringify(novosComp));

    const novoHab = { ...habilitados };
    delete novoHab[id];
    localStorage.setItem(keyHab, JSON.stringify(novoHab));

    setHistorico(novoHist);
    setComprados(novosComp);
    setHabilitados(novoHab);

    setCursosDisponiveis(
      cursosPadrao.filter(
        c => !novosComp.some(x => x.id === c.id) &&
             !novoHist.some(x => x.id === c.id)
      )
    );
  }

  return (
    <div style={{ fontFamily: "Arial", padding: 20 }}>
      <h1>Cursos Preparatórios</h1>

      {cursosDisponiveis.map(curso => (
        <div key={curso.id} style={{ border: "1px solid #ccc", padding: 10, marginBottom: 10 }}>
          <span>{curso.nome} — R$ {curso.preco}</span>
          <button onClick={() => toggleCurso(curso.id)} style={{ marginLeft: 10 }}>
            {selecionados.has(curso.id) ? "Remover" : "Selecionar"}
          </button>
        </div>
      ))}

      <p><strong>Total:</strong> R$ {total}</p>

      <button onClick={falarWhatsApp}>Falar no WhatsApp</button>
      <br /><br />
      <button onClick={gerarQRCode}>Pagar com QR Code</button>

      {mostrarQR && (
        <div style={{ marginTop: 20 }}>
          <img
            src={`https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent("PIX_AQUI")}`}
            alt="QR Code"
          />
          <br />
          <button onClick={confirmarPagamento}>Já paguei</button>
        </div>
      )}

      <h2 style={{ marginTop: 40 }}>Cursos Comprados</h2>

      {comprados.map(curso => (
        <div key={curso.id} style={{ background: "#e1ffe1", padding: 10, marginBottom: 10 }}>
          <span>{curso.nome}</span>
          <div>
            <a
              href={curso.arquivoCurso}
              target="_blank"
              onClick={() => habilitarBotao(curso.id)}
            >
              Acessar
            </a>

            <button
              disabled={!habilitados[curso.id]}
              onClick={() => moverParaHistorico(curso.id)}
              style={{ marginLeft: 10 }}
            >
              Finalizar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
