
import { render, h } from 'preact';
import {
  Router,
  Route,
  ErrorBoundary,
  lazy
} from 'preact-iso';

export const MainAside = (props: any ) => {
    return <>
      <ErrorBoundary>
        <Router>
          {/*<Route default component={NotFound} />*/}
        </Router>
      </ErrorBoundary>
    </>;
}