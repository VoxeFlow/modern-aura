import React from 'react';
import { Button } from './Button';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Monstro System Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-6 text-center">
                    <h2 className="text-3xl font-black text-monstro-primary mb-4">SISTEMA EM MODO DE SEGURANÇA</h2>
                    <p className="text-gray-400 mb-8 max-w-md">
                        Detectamos uma instabilidade temporária no núcleo digital.
                        Sua transformação não pode parar.
                    </p>
                    <Button variant="primary" onClick={() => window.location.reload()}>
                        REINICIAR SISTEMA
                    </Button>
                    <div className="mt-12 text-xs text-gray-600">
                        Error Code: MONSTRO_CORE_FAIL
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
