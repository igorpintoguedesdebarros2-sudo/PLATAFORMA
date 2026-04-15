import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function CursoPage() {
  const navigate = useNavigate();

  const [modalOpen, setModalOpen] = useState(false);
  const [conteudo, setConteudo] = useState(null);

  // 📚 conteúdos
  const aulas = {
    pdfs: [
      "/public/IMGs/prova/prova-NR23.pdf",
    ],
    videos: []
  };

  // 📄 abrir PDF
  const openPDF = (url) => {
    setConteudo(<iframe src={url} title="pdf" />);
    setModalOpen(true);
  };

  // 🎥 abrir vídeo
  const openVideo = (url) => {
    setConteudo(
      <video controls>
        <source src={url} type="video/mp4" />
      </video>
    );
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setConteudo(null);
  };

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div style={styles.body}>
      {/* 🔝 NAVBAR */}
      <div style={styles.topbar}>
        <h1>Prova de NR 23</h1>

        <div>
          <button style={styles.navBtn} onClick={() => navigate("/pagamento")}>
            sair
          </button>

        </div>
      </div>

      {/* 📄 PDFs */}
      <div style={styles.section}>
        <h3>PDFs</h3>
        {aulas.pdfs.map((pdf, i) => (
          <button
            key={i}
            style={styles.btn}
            onClick={() => openPDF(pdf)}
          >
            PDF {i + 1}
          </button>
        ))}
      </div>

      {/* 🧩 MODAL */}
      {modalOpen && (
        <div style={styles.modal} onClick={closeModal}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <span style={styles.close} onClick={closeModal}>
              ×
            </span>
            <div style={{ width: "100%", height: "100%" }}>
              {conteudo}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 🎨 estilos (equivalente ao CSS)
const styles = {
  body: {
    fontFamily: "Arial",
    background: "#0f172a",
    color: "#fff",
    minHeight: "100vh",
    padding: 20,
    textAlign: "center"
  },
  topbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15
  },
  banner: {},
  bannerImg: {
    width: "100%",
    maxHeight: 300,
    objectFit: "cover",
    borderRadius: 12
  },
  btn: {
    padding: "12px 18px",
    margin: 10,
    background: "#3b82f6",
    color: "#fff",
    borderRadius: 8,
    border: "none",
    cursor: "pointer"
  },
  navBtn: {
    marginRight: 10,
    padding: "10px 16px",
    background: "#22c55e",
    border: "none",
    borderRadius: 8,
    color: "#fff",
    cursor: "pointer"
  },
  logoutBtn: {
    background: "#ef4444",
    border: "none",
    color: "#fff",
    padding: "10px 16px",
    borderRadius: 8,
    cursor: "pointer"
  },
  section: {
    marginTop: 20
  },
  modal: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.8)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },
  modalContent: {
    width: "80%",
    height: "80%",
    background: "#000",
    borderRadius: 12,
    overflow: "hidden",
    position: "relative"
  },
  close: {
    position: "absolute",
    top: 10,
    right: 15,
    fontSize: 24,
    cursor: "pointer",
    color: "#fff"
  }
};