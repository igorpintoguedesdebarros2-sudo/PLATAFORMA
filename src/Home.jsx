import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div>
      <button onClick={() => navigate("/perfil")}>
        Perfil
      </button>

      <h1>Venha fazer um curso de NR e preparatório para embarque</h1>

      <p>
        abaixo segue nosso catálogo de cursos e temos cursos de NR e preparatórios
      </p>

      <button onClick={() => navigate("/pagamento")}>
        Ver Curso
      </button>
    </div>
  );
}