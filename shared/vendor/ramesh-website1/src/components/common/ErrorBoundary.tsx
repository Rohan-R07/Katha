import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Khata AI ErrorBoundary]', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border-2 border-rose-200">
            <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-slate-900">
              ಕ್ಷಮಿಸಿ, ಸಣ್ಣ ದೋಷ ಕಂಡುಬಂದಿದೆ
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              An unexpected error occurred. Your shop data is safe in local storage.
            </p>

            {this.state.error && (
              <div className="mt-3 p-3 bg-slate-100 rounded-xl text-left font-mono text-[11px] text-slate-700 max-h-24 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="mt-6 w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>ಪುನಃ ಆರಂಭಿಸಿ (Reload Shop)</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

