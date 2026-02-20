import React from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/monstro.css';
import './styles/animations.css';
import './index.css';
import App from './App.jsx';
import { useStore } from './store/useStore';

window.useStore = useStore;

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', fontFamily: 'sans-serif', backgroundColor: '#fff', color: '#333' }}>
          <h1 style={{ color: '#E11D48' }}>Algo deu errado no MONSTRO.</h1>
          <p>Tente recarregar a página.</p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '10px 20px', backgroundColor: '#00ff88', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '20px' }}
          >
            Recarregar Página
          </button>

          <details style={{ whiteSpace: 'pre-wrap', backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '10px', fontSize: '12px' }}>
            <summary style={{ fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px' }}>Ver detalhes do erro (para suporte)</summary>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
