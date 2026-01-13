import { useEffect, useState } from "react";

export default function FichaInscricao() {
  const [form, setForm] = useState({
    nome: "",
    email: "",
    estado: "",
    numero: "",
    opcao: "",
    enviado: false,
  });

  useEffect(() => {
    const fichaSalva = JSON.parse(localStorage.getItem("fichaInscricao"));
    if (fichaSalva && fichaSalva.enviado) {
      setForm(fichaSalva);
    }
  }, []);

  function handleChange(e) {
    const { id, value } = e.target;
    setForm({ ...form, [id]: value });
  }

  function validarCampos() {
    return (
      form.nome &&
      form.email &&
      form.estado &&
      form.numero &&
      form.opcao
    );
  }

  function enviarWhatsApp() {
    if (!validarCampos()) {
      alert("Preencha todos os campos corretamente.");
      return;
    }

    const numeroDestino = "5599999999999"; // troca depois
    const mensagem = `📋 *Ficha de Inscrição*
*Nome:* ${form.nome}
*Email:* ${form.email}
*Estado:* ${form.estado}
*Número:* ${form.numero}
*Opção Escolhida:* ${form.opcao}`;

    const link = `https://wa.me/${numeroDestino}?text=${encodeURIComponent(
      mensagem
    )}`;

    window.open(link, "_blank");

    const dadosSalvos = { ...form, enviado: true };
    localStorage.setItem("fichaInscricao", JSON.stringify(dadosSalvos));
    setForm(dadosSalvos);
  }

  function irParaOpcaoA() {
    window.location.href = "/pagamento";
  }

  function irParaOpcaoB() {
    window.location.href = "/preparatorio";
  }

  return (
    <div style={styles.body}>
      <div style={styles.container}>
        <h2>Ficha de Inscrição</h2>

        <label>Nome:</label>
        <input
          id="nome"
          value={form.nome}
          onChange={handleChange}
          disabled={form.enviado}
        />

        <label>Email:</label>
        <input
          id="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          disabled={form.enviado}
        />

        <label>Estado:</label>
        <select
          id="estado"
          value={form.estado}
          onChange={handleChange}
          disabled={form.enviado}
        >
          <option value="">Selecione...</option>
          <option value="SP">São Paulo</option>
          <option value="RJ">Rio de Janeiro</option>
          <option value="MG">Minas Gerais</option>
          <option value="BA">Bahia</option>
        </select>

        <label>Número (com DDD):</label>
        <input
          id="numero"
          value={form.numero}
          onChange={handleChange}
          disabled={form.enviado}
        />

        <label>Escolha uma opção:</label>
        <select
          id="opcao"
          value={form.opcao}
          onChange={handleChange}
          disabled={form.enviado}
        >
          <option value="">Selecione...</option>
          <option value="A">NR</option>
          <option value="B">PREPARATORIO</option>
        </select>

        {!form.enviado && (
          <button style={styles.whats} onClick={enviarWhatsApp}>
            Enviar para WhatsApp
          </button>
        )}

        {form.enviado && form.opcao === "A" && (
          <button style={styles.opcao} onClick={irParaOpcaoA}>
            Ir para NR
          </button>
        )}

        {form.enviado && form.opcao === "B" && (
          <button style={styles.opcao} onClick={irParaOpcaoB}>
            Ir para PREPARATORIO
          </button>
        )}
      </div>
    </div>
  );
}

const styles = {
  body: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    background: "#f1f1f1",
    fontFamily: "Arial, sans-serif",
  },
  container: {
    background: "#fff",
    padding: 30,
    borderRadius: 10,
    boxShadow: "0 0 10px #ccc",
    width: "100%",
    maxWidth: 400,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  whats: {
    marginTop: 20,
    padding: 12,
    background: "#25d366",
    color: "#fff",
    border: "none",
    borderRadius: 5,
    fontSize: 16,
    cursor: "pointer",
  },
  opcao: {
    marginTop: 10,
    padding: 12,
    background: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: 5,
    fontSize: 16,
    cursor: "pointer",
  },
};
