import React from "react";

export default function Home() {
  return (
    <div className="container mt-5 text-center">
      {/* Dropdown */}
      <div className="dropdown mb-4">
        <button
          className="btn btn-secondary dropdown-toggle"
          type="button"
          data-bs-toggle="dropdown"
          aria-expanded="false"
        >
          Menu
        </button>
        <ul className="dropdown-menu">
          <li>
            <a className="dropdown-item" href="/profile">
              PERFIL
            </a>
          </li>
        </ul>
      </div>

      {/* Título e descrição */}
      <h1 className="primario">VENHA FAZER NOSSOS CURSOS E EMBARQUE COM SEGURANÇA</h1>
      <p className="secundario">Aqui temos diversos cursos de NRs e preparatórios</p>

      {/* Botão para planilha */}
      <p><strong>Clique no botão abaixo para preencher uma planilha e acessar nossos cursos</strong></p>
      <a href="planilha.html" className="btn btn-primary">
        ACESSAR
      </a>
    </div>
  );
}
