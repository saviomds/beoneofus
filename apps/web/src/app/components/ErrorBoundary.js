'use client';

import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Dynamically import to avoid issues if logger itself errors
    import('./ErrorLogger').then(({ logError }) => {
      logError({
        level: 'error',
        category: 'react',
        message: error.message,
        stack: error.stack,
        component: info.componentStack?.split('\n')[1]?.trim().replace(/^\s*at /, '') || undefined,
        metadata: { componentStack: info.componentStack?.slice(0, 500) },
      });
    }).catch(() => {});
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center">
        <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mb-4 border border-red-100 dark:border-red-900/30">
          <AlertTriangle size={24} className="text-red-500" />
        </div>
        <h3 className="text-base font-black text-gray-900 dark:text-white mb-1">Something went wrong</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          This section crashed. Our team has been notified automatically.
        </p>
        <button
          onClick={() => this.setState({ hasError: false })}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all active:scale-95"
        >
          <RefreshCw size={14} /> Try again
        </button>
      </div>
    );
  }
}
