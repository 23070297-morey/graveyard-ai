export default function Navbar() {
  return (
    <nav>
      <div className="container">
        <div className="brand">
          <span className="tag-mark"></span> Graveyard AI
        </div>
        <div className="navlinks">
          <a href="#architecture">Architecture</a>
          <a href="#analyzer">Autopsy Engine</a>
          <a href="#graveyard">The Graveyard</a>
        </div>
        <a href="#analyzer" className="nav-cta">
          Run Diagnosis
        </a>
      </div>
    </nav>
  );
}
