export default function Home() {
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
            <a className="dropdown-item" href="#/profile">
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

      <button className="btn btn-primary">
        ACESSAR
      </button>
    </div>
  );
}
