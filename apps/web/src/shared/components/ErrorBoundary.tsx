import { Component, type ErrorInfo, type ReactNode } from 'react';

export type ErrorBoundaryFallbackProps = {
  error: Error;
  resetErrorBoundary: () => void;
};

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback: (props: ErrorBoundaryFallbackProps) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: readonly unknown[];
};

type ErrorBoundaryState = {
  error: Error | null;
};

function haveResetKeysChanged(
  previousResetKeys: readonly unknown[] = [],
  resetKeys: readonly unknown[] = [],
) {
  return (
    previousResetKeys.length !== resetKeys.length ||
    previousResetKeys.some(
      (previousResetKey, index) =>
        !Object.is(previousResetKey, resetKeys[index]),
    )
  );
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(previousProps: ErrorBoundaryProps) {
    if (
      this.state.error &&
      haveResetKeysChanged(previousProps.resetKeys, this.props.resetKeys)
    ) {
      this.resetErrorBoundary();
    }
  }

  resetErrorBoundary = () => {
    this.setState({
      error: null,
    });
  };

  render() {
    const { error } = this.state;

    if (error) {
      return this.props.fallback({
        error,
        resetErrorBoundary: this.resetErrorBoundary,
      });
    }

    return this.props.children;
  }
}
