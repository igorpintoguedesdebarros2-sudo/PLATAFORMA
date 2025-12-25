// src/Index.jsx
import React from "react";
import { Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

export default function Index() {
  return (
    <div>
      {/* Dropdown */}
      <div className="dropdown">
        <button
          className="btn btn-secondary dropdown-toggle"
          type="button"
          data-bs-toggle="dropdown"
          aria-expanded="false"
        >
          Dropdown button
        </button>
        <ul className="dropdown-menu">
          <li>
            <Link className="dropdown-item" to="/profile">
              PERFIL
            </Link>
          </li>
        </ul>
      </div>

      {/* Conteúdo principal */}
      <h1 style={{ textAlign: "center" }}>
        VENHA FAZER NOSSOS CURSOS E EMBARQUE COM SEGURANÇA
      </h1>
      <p style={{ textAlign: "center" }}>
        aqui temos diversos cursos de NRs e preparatorios
      </p>

      <p>
        <strong>
          clique no botão abaixo pra preencher uma planilha pra acessar nosso cursos
        </strong>
      </p>

      <Link to="/planilha">
        <button className="btn btn-primary">ACESSAR</button>
      </Link>
    </div>
  );
}
