import { Component, ReactNode } from 'react';
import { Shield, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-6">
          <img src="/logo-full.png" alt="Error" className="h-10 w-auto opacity-50 mb-2" />
          <div className="text-center space-y-1">
            <p className="text-xs font-mono font-bold text-foreground">MODULE ERROR</p>
            <p className="text-[10px] font-mono text-muted-foreground max-w-sm">
              This module encountered an unexpected error and could not render.
            </p>
            {this.state.error && (
              <p className="text-[9px] font-mono text-destructive/60 mt-2 max-w-sm truncate">
                {this.state.error.message}
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] font-mono h-7"
            onClick={this.handleRetry}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            RETRY
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
