import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="container mt-5 text-center">
      <div className="dropdown mb-4">
        <button
          className="btn btn-secondary dropdown-toggle"
          type="button"
          data-bs-toggle="dropdown"
        >
          Menu
        </button>

        <ul className="dropdown-menu">
          <li>
            <Link className="dropdown-item" to="/profile">
              PERFIL
            </Link>
          </li>
        </ul>
      </div>

      <h1>VENHA FAZER NOSSOS CURSOS</h1>
      <p>NRs e preparatórios</p>
    </div>
  );
}
