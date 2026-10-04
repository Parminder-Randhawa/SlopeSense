import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main
        style={{
          padding: 40,
          maxWidth: 600,
          margin: "auto",
          color: "#d9e8df",
          fontFamily: "system-ui",
        }}
      >
        <h1>Let’s find your way back.</h1>
        <p>
          SlopeSense couldn’t render this view. Reload to try again. Your saved
          activities are kept.
        </p>
        <button
          onClick={() => location.reload()}
          style={{ padding: 14, marginTop: 20 }}
        >
          Reload SlopeSense
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
