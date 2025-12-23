import { useEffect, useState } from "react";

const numeroWhatsApp = "+5521920439641";

/* 👉 CONFIGURAÇÃO DOS CONTEÚDOS */
const conteudos = {
  pdfs: [
    { id: 1, titulo: "Apostila 1", arquivo: "/public/IMGs/NR33/NR 33 OBSERVADOR/1 APOSTILA ESPAÇO CONFINADO.NOVA.pdf" },
    { id: 2, titulo: "Apostila 2", arquivo: "/public/IMGs/NR33/NR 33 OBSERVADOR/2 NORMA REGULAMENTADORA 33.pdf" },
    { id: 3, titulo: "Apostila 3", arquivo: "/public/IMGs/NR33/NR 33 SUPERVISOR/1 APOSTILA ESPAÇO CONFINADO.NOVA.pdf" },
    { id: 4, titulo: "Apostila 4", arquivo: "/public/IMGs/NR33/NR 33 SUPERVISOR/2 NORMA REGULAMENTADORA 33.pdf" },
    { id: 5, titulo: "Apostila 5", arquivo: "/public/IMGs/NR33/NR 33 SUPERVISOR/3 Apostila NR 33 Supervisores historia.pdf" },
    { id: 6, titulo: "Apostila 6", arquivo: "/public/IMGs/NR33/NR33/APOSTILAS 33/apostila 33/APOSTILA ESPAÇO CONFINADO 19.pdf" },
    { id: 7, titulo: "Apostila 7", arquivo: "/public/IMGs/NR33/NR33/APOSTILAS 33/apostila 33/APOSTILA ESPAÇO CONFINADO. 19.pdf" },
    { id: 8, titulo: "Apostila 8", arquivo: "/public/IMGs/NR33/NR33/APOSTILAS 33/apostila 33/Apostila NR 33 Supervisores.pdf" },
    { id: 9, titulo: "Apostila 9", arquivo: "/public/IMGs/NR33/NR33/APOSTILAS 33/apostila 33/NORMA REGULAMENTADORA 33.pdf" },
    { id: 10, titulo: "Apostila 10", arquivo: "/public/IMGs/NR33/NR33/APOSTILAS 33/APOSTILA ESPAÇO CONFINADO.NOVA.pdf" },
    { id: 11, titulo: "Apostila 11", arquivo: "/public/IMGs/NR33/NR33/APOSTILAS 33/Apostila NR 33 Supervisores.pdf" },
    { id: 12, titulo: "Apostila 12", arquivo: "/public/IMGs/NR33/NR33/APOSTILAS 33/NORMA REGULAMENTADORA 33.pdf" },
  ],
  videos: [
    { id: 1, titulo: "Aula 1", arquivo: "/public/IMGs/NR33/NR 33 OBSERVADOR/NR-33 Espaço Confinado - Vídeo Aula [downloaded with 1stBrowser].mp4" },
    { id: 2, titulo: "Aula 2", arquivo: "/public/IMGs/NR33/NR 33 OBSERVADOR/videoplayback. [downloaded with 1stBrowser].mp4" },
    { id: 3, titulo: "Aula 3", arquivo: "/public/IMGs/NR33/NR 33 SUPERVISOR/NR-33 Espaço Confinado - Vídeo Aula [downloaded with 1stBrowser].mp4" },
    { id: 4, titulo: "Aula 4", arquivo: "/public/IMGs/NR33/NR 33 SUPERVISOR/videoplayback. [downloaded with 1stBrowser].mp4" },
  ],
};

export default function AcessoProtegido() {
  const [senha, setSenha] = useState("");
  const [senhaFixa, setSenhaFixa] = useState(null);
  const [mensagem, setMensagem] = useState("");
  const [tipoMsg, setTipoMsg] = useState("");
  const [acessoLiberado, setAcessoLiberado] = useState(false);
  const [finalizado, setFinalizado] = useState(false);

  const [modal, setModal] = useState(null); // { tipo, arquivo }

  /* ---------- LOAD SENHA ---------- */
  useEffect(() => {
    setSenhaFixa(localStorage.getItem("senhaUnicaUsuario"));
  }, []);

  /* ---------- WHATSAPP ---------- */
  function abrirWhatsapp() {
    const texto = encodeURIComponent(
      "Olá! Gostaria de obter minha senha única de acesso."
    );
    window.open(`https://wa.me/${numeroWhatsApp}?text=${texto}`, "_blank");
  }

  /* ---------- VERIFICAR SENHA ---------- */
  function verificarSenha() {
    if (!senha) {
      setMensagem("⚠️ Digite uma senha.");
      setTipoMsg("error");
      return;
    }

    if (!senhaFixa) {
      localStorage.setItem("senhaUnicaUsuario", senha);
      setSenhaFixa(senha);
      setMensagem("✅ Senha registrada com sucesso.");
      setTipoMsg("success");
    }

    if (senha !== (senhaFixa || senha)) {
      setMensagem("❌ Senha incorreta.");
      setTipoMsg("error");
      return;
    }

    setMensagem("✅ Acesso liberado!");
    setTipoMsg("success");
    setAcessoLiberado(true);
    setSenha("");
  }

  /* ---------- FINALIZAR ---------- */
  function finalizarCurso() {
    setFinalizado(true);
    setMensagem("🎉 Curso finalizado! Link liberado.");
    setTipoMsg("success");
  }

  /* ---------- MODAL ---------- */
  function abrirModal(tipo, arquivo) {
    setModal({ tipo, arquivo });
  }

  function fecharModal() {
    setModal(null);
  }

  return (
    <div className="container">
     <h2>CURSO NR33 - ESPAÇOS CONFINADOS</h2>

<img
  src="/public/IMGs/33.jpg"
  alt="Imagem do curso"
  style={{
    width: "100%",
    maxWidth: "400px",
    display: "block",
    margin: "20px auto",
    borderRadius: "8px"
  }}
/>

      <button onClick={abrirWhatsapp}>
        Falar com Suporte no WhatsApp
      </button>

      <input
        type="text"
        placeholder="Digite a senha"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
      />

      <button onClick={verificarSenha}>Verificar Senha</button>

      {mensagem && (
        <div className={`message ${tipoMsg}`}>{mensagem}</div>
      )}

      {/* ---------- CONTEÚDOS ---------- */}
      {acessoLiberado && (
        <>
          <h3>PDFs</h3>
          {conteudos.pdfs.map((pdf) => (
            <button
              key={pdf.id}
              onClick={() => abrirModal("pdf", pdf.arquivo)}
            >
              📄 {pdf.titulo}
            </button>
          ))}

          <h3>Vídeos</h3>
          {conteudos.videos.map((video) => (
            <button
              key={video.id}
              onClick={() => abrirModal("video", video.arquivo)}
            >
              🎬 {video.titulo}
            </button>
          ))}

          <button onClick={finalizarCurso}>
            Finalizar Curso
          </button>
        </>
      )}

      {/* ---------- LINK FINAL ---------- */}
      {finalizado && (
  <button onClick={() => window.open("/src/PROVA-NR33", "_blank")}>
    ACESSAR PROVA
  </button>
)}

      {/* ---------- MODAL ---------- */}
      {modal && (
        <div className="modal" onClick={fecharModal}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="close" onClick={fecharModal}>
              &times;
            </span>

            {modal.tipo === "pdf" && (
              <iframe src={modal.arquivo} />
            )}

            {modal.tipo === "video" && (
              <video src={modal.arquivo} controls autoPlay />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
