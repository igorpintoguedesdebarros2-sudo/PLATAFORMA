import { useNavigate } from "react-router-dom";

export default function AdmPage() {
  const navigate = useNavigate();

  return (
    <div>
      <button onClick={() => navigate("/admperfil")}>
        Perfil
      </button>

      <h1>Bem vindo à página de ADM</h1>

      <button onClick={() => navigate("/admpagamento")}>
        ir pra pagamentos
      </button>
    </div>
  );
}