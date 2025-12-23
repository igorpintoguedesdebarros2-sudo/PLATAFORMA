import { useEffect, useState } from "react";

const numeroWhatsApp = "+5521920439641";

/* 👉 CONFIGURAÇÃO DOS CONTEÚDOS */
const conteudos = {
  pdfs: [
    { id: 1, titulo: "Apostila 1", arquivo: "/public/IMGs/matematica/prova de matemática.pdf" },
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
     <h2>PROVA MATEMÀTICA</h2>

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
        <button>
          <a
            href="/src/index.html"
            target="_blank"
            rel="noreferrer"
            style={{ color: "black", textDecoration: "none" }}
          >
            SAIR
          </a>
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
