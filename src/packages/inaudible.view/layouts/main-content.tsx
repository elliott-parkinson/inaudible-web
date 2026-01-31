
import { render, h } from 'preact';
import {
  Router,
  Route,
  ErrorBoundary,
  lazy
} from 'preact-iso';

import DiscoverRoute from '../modules/discover/route/content';
import BooksRoute from '../modules/books/route/content';
import BookRoute from '../modules/book/route/content';
import AuthorsRoute from '../modules/authors/route/content';
import SeriesRoute from '../modules/series-list/route/content';
import SingleSeriesRoute from '../modules/series/route/content';
import StatsRoute from '../modules/stats/route/content';
import ProfileRoute from '../modules/profile/route/content';
import LibraryRoute from '../modules/library/route/content';
import LibraryHubRoute from '../modules/library-hub/route/content';

export const MainContent = (props: any ) => {
    return <>
      <ErrorBoundary>
        <Router>
          <Route path='/' component={BooksRoute} />
          <Route path='/discover' component={DiscoverRoute} />
          <Route path='/library' component={LibraryHubRoute} />
          <Route path='/my-library' component={LibraryRoute} />
          <Route path='/books' component={BooksRoute} />
          <Route path='/books/:id' component={BookRoute} />
          <Route path='/authors' component={AuthorsRoute} />
          <Route path='/series' component={SeriesRoute} />
          <Route path='/series/:id' component={SingleSeriesRoute} />
          <Route path='/stats' component={StatsRoute} />
          <Route path='/profile' component={ProfileRoute} />
          {/*<Route default component={NotFound} />*/}
        </Router>
      </ErrorBoundary>
    </>;
}
