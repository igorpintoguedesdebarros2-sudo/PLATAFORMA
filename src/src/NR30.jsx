import { useEffect, useState } from "react";

const numeroWhatsApp = "+5521920439641";

/* 👉 CONFIGURAÇÃO DOS CONTEÚDOS */
const conteudos = {
  pdfs: [
    { id: 1, titulo: "Apostila 1", arquivo: "/IMGs/NR 30/30/Apresentação NR 30.pdf" },
    { id: 2, titulo: "Apostila 2", arquivo: "/IMGs/NR 30/30/modelo_de_ASO_NR_30.pdf" },
    { id: 3, titulo: "Apostila 3", arquivo: "/IMGs/NR 30/30/nr-30-atualizada-2018 (1).pdf" },
    { id: 4, titulo: "Apostila 4", arquivo: "/IMGs/NR 30/30/nr-30-atualizada-2018.pdf" },
    { id: 5, titulo: "Apostila 5", arquivo: "/IMGs/NR 30/30/nr30.pdf" },
    { id: 6, titulo: "Apostila 6", arquivo: "/IMGs/NR 30/30/NT_N°54-DSST_SIT-Capacitação-em-Segurança-e-Saúde-no-Trabalho-pela-modalidade-de-ensino-a-distância-EAD-2.pdf" },
  ],
  videos: [],
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
     <h2>CURSO NR30 - AQUAVIARIO</h2>

<img
  src="/IMGs/30.jpg"
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
  <button onClick={() => window.open("/PROVA-NR30", "_blank")}>
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
