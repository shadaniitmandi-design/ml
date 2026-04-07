function LoadingScreen({ label = "Loading KP Dev Cell" }) {
  return (
    <section className="center-stage">
      <div className="loading-card">
        <div className="loading-ring" />
        <p>{label}</p>
      </div>
    </section>
  );
}

export default LoadingScreen;

