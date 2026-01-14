import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AcessoSenha() {
  const navigate = useNavigate();

  const [senha, setSenha] = useState("");
  const [liberado, setLiberado] = useState(false);
  const [mostrarAcoes, setMostrarAcoes] = useState(false);
  const [modalPDF, setModalPDF] = useState(false);
  const [modalVideo, setModalVideo] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("senhaUsuario")) {
      setMostrarAcoes(true);
      setLiberado(false);
      return;
    }

    if (localStorage.getItem("senhaLiberada") === "true") {
      setLiberado(true);
    }
  }, []);

  function abrirWhatsApp() {
    const numeroDestino = "5599999999999";
    const mensagem = "Olá! Quero receber minha senha de acesso.";

    window.open(
      `https://wa.me/${numeroDestino}?text=${encodeURIComponent(mensagem)}`,
      "_blank"
    );

    setLiberado(true);
    localStorage.setItem("senhaLiberada", "true");
  }

  function validarSenha() {
    if (!senha.trim()) {
      alert("Digite a senha, criatura.");
      return;
    }

    localStorage.setItem("senhaUsuario", senha);
    setMostrarAcoes(true);
    setLiberado(false);
  }

  function redirecionar() {
    navigate("/plataforma");
  }

  return (
    <div style={styles.body}>
      <div style={styles.box}>
        {/* IMAGEM INTRODUTÓRIA */}
        <img
          src="/image_2.jpg"
          alt="Acesso ao conteúdo"
          style={styles.introImage}
        />

        <h2>Acesso com Senha</h2>
        <p>Solicite sua senha pelo WhatsApp 👇</p>

        <button
          style={{ ...styles.button, ...styles.whatsapp }}
          onClick={abrirWhatsApp}
          disabled={mostrarAcoes}
        >
          Falar no WhatsApp
        </button>

        <input
          type="password"
          placeholder="Digite a senha recebida"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          disabled={!liberado}
          style={styles.input}
        />

        <button
          onClick={validarSenha}
          disabled={!liberado}
          style={styles.button}
        >
          Entrar
        </button>

        {mostrarAcoes && (
          <div style={{ marginTop: 20 }}>
            <button style={styles.button} onClick={() => setModalPDF(true)}>
              Abrir PDF
            </button>

            <button style={styles.button} onClick={() => setModalVideo(true)}>
              Abrir Vídeo
            </button>

            <button style={styles.button} onClick={redirecionar}>
              Ir para Plataforma
            </button>
          </div>
        )}
      </div>

      {modalPDF && (
        <Modal title="Material em PDF" onClose={() => setModalPDF(false)}>
          <iframe src="/material.pdf" style={styles.iframe} />
        </Modal>
      )}

      {modalVideo && (
        <Modal title="Vídeo" onClose={() => setModalVideo(false)}>
          <video controls style={styles.iframe}>
            <source src="/video.mp4" type="video/mp4" />
          </video>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <span style={styles.close} onClick={onClose}>
          &times;
        </span>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}

const styles = {
  body: {
    fontFamily: "Arial, sans-serif",
    background: "#f1f1f1",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
  },
  box: {
    background: "#fff",
    padding: 30,
    borderRadius: 10,
    boxShadow: "0 0 10px #ccc",
    width: "100%",
    maxWidth: 400,
    textAlign: "center",
  },
  introImage: {
    width: "100%",
    height: 160,
    objectFit: "cover",
    borderRadius: 10,
    marginBottom: 15,
  },
  input: {
    width: "100%",
    padding: 12,
    marginTop: 15,
    borderRadius: 5,
    border: "1px solid #ccc",
    fontSize: 16,
  },
  button: {
    width: "100%",
    padding: 12,
    marginTop: 15,
    borderRadius: 5,
    border: "none",
    fontSize: 16,
    cursor: "pointer",
    background: "#007bff",
    color: "#fff",
  },
  whatsapp: {
    background: "#25d366",
  },
  modal: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  modalContent: {
    background: "#fff",
    width: "90%",
    maxWidth: 800,
    height: "80%",
    borderRadius: 10,
    padding: 15,
    position: "relative",
    display: "flex",
    flexDirection: "column",
  },
  iframe: {
    flex: 1,
    width: "100%",
    border: "none",
  },
  close: {
    position: "absolute",
    top: 10,
    right: 15,
    fontSize: 24,
    cursor: "pointer",
  },
};
