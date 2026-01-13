import { useNavigate } from "react-router-dom"; 

export default function Home() {
     const navigate = useNavigate();
  return (
    <div className="container text-center">
      <div className="dropdown mt-3">
        <button
          className="btn btn-secondary dropdown-toggle"
          data-bs-toggle="dropdown"
        >
          Menu
        </button>

        <ul className="dropdown-menu">
          <li>
            <a className="dropdown-item" href="/perfil">
              PERFIL
            </a>
          </li>
        </ul>
      </div>

      <h1 className="mt-4">
        VENHA FAZER NOSSOS CURSOS E EMBARQUE COM SEGURANÇA
      </h1>

      <p>aqui temos diversos cursos de NRs e preparatórios</p>

      <p>
        <strong>
          clique no botão abaixo pra preencher uma planilha
        </strong>
      </p>

  <button
        onClick={() => navigate("/planilha")}
        style={{
          padding: "10px",
          background: "#2563eb",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          marginBottom: "20px"
        }}
      >
        VOLTAR
      </button>
    </div>
  );
}