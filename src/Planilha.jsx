import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function FichaInscricao() {
  const navigate = useNavigate();

  const [dados, setDados] = useState({
    nome: "",
    email: "",
    estado: "",
    numero: "",
    opcao: ""
  });

  const [enviado, setEnviado] = useState(false);

  /* ---------- LOAD LOCALSTORAGE ---------- */
  useEffect(() => {
    const salvo = JSON.parse(localStorage.getItem("fichaInscricao"));
    if (salvo?.enviado) {
      setDados(salvo);
      setEnviado(true);
    }
  }, []);

  /* ---------- HANDLERS ---------- */
  function handleChange(e) {
    setDados({ ...dados, [e.target.name]: e.target.value });
  }

  function validarCampos() {
    return Object.values(dados).every((v) => v !== "");
  }

  function enviarWhatsApp() {
    if (!validarCampos()) {
      alert("Preencha todos os campos corretamente.");
      return;
    }

    const numeroDestino = "5521920439641";
    const mensagem = `📋 *Ficha de Inscrição*
Nome: ${dados.nome}
Email: ${dados.email}
Estado: ${dados.estado}
Número: ${dados.numero}
Opção: ${dados.opcao}`;

    const link = `https://wa.me/${numeroDestino}?text=${encodeURIComponent(mensagem)}`;
    window.open(link, "_blank");

    localStorage.setItem(
      "fichaInscricao",
      JSON.stringify({ ...dados, enviado: true })
    );

    setEnviado(true);
  }

  /* ---------- RENDER ---------- */
  return (
    <div style={styles.body}>
      <div style={styles.container}>
        <h2>Ficha de Inscrição</h2>

        <label>Nome</label>
        <input
          name="nome"
          value={dados.nome}
          onChange={handleChange}
          disabled={enviado}
        />

        <label>Email</label>
        <input
          name="email"
          type="email"
          value={dados.email}
          onChange={handleChange}
          disabled={enviado}
        />

        <label>Estado</label>
        <select
          name="estado"
          value={dados.estado}
          onChange={handleChange}
          disabled={enviado}
        >
          <option value="">Selecione...</option>
          <option value="SP">São Paulo</option>
          <option value="RJ">Rio de Janeiro</option>
          <option value="MG">Minas Gerais</option>
          <option value="BA">Bahia</option>
        </select>

        <label>Número</label>
        <input
          name="numero"
          value={dados.numero}
          onChange={handleChange}
          disabled={enviado}
        />

        <label>Opção</label>
        <select
          name="opcao"
          value={dados.opcao}
          onChange={handleChange}
          disabled={enviado}
        >
          <option value="">Selecione...</option>
          <option value="A">NR</option>
          <option value="B">PREPARATÓRIO</option>
        </select>

        {!enviado && (
          <button style={styles.whats} onClick={enviarWhatsApp}>
            Enviar para WhatsApp
          </button>
        )}

        {enviado && dados.opcao === "A" && (
          <button style={styles.blue} onClick={() => navigate("/pagamento")}>
            Ir para NR
          </button>
        )}

        {enviado && dados.opcao === "B" && (
          <button style={styles.blue} onClick={() => navigate("/preparatorio")}>
            Ir para Preparatório
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- ESTILOS ---------- */
const styles = {
  body: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f1f1f1"
  },
  container: {
    background: "#fff",
    padding: 30,
    borderRadius: 10,
    width: 400,
    boxShadow: "0 0 10px #ccc"
  },
  whats: {
    marginTop: 20,
    padding: 12,
    width: "100%",
    background: "#25d366",
    color: "#fff",
    border: "none",
    borderRadius: 5,
    cursor: "pointer"
  },
  blue: {
    marginTop: 20,
    padding: 12,
    width: "100%",
    background: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: 5,
    cursor: "pointer"
  }
};
