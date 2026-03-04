/**
 * AI Mode Panel - Placeholder for future AI features
 */
import { Brain } from 'lucide-react';

export const AIModePanel = () => {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-background p-8">
      <div className="text-center max-w-md space-y-6">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
          <Brain className="w-10 h-10 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">AI Mode</h2>
          <p className="text-muted-foreground">
            Coming Soon — AI-powered operation suggestions, metric prediction, 
            and strategy optimization will be available here.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
          <div className="p-3 rounded-lg bg-muted/30 border border-border">
            <p className="font-medium text-foreground mb-1">Operation Advisor</p>
            <p>Get suggestions for which operations improve target metrics</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border">
            <p className="font-medium text-foreground mb-1">Cost Optimizer</p>
            <p>Find the most cost-effective operation sequences</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border">
            <p className="font-medium text-foreground mb-1">Pattern Learner</p>
            <p>Train on execution history to predict outcomes</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border">
            <p className="font-medium text-foreground mb-1">Strategy Generator</p>
            <p>Auto-generate strategies from optimization goals</p>
          </div>
        </div>
      </div>
    </div>
  );
};
