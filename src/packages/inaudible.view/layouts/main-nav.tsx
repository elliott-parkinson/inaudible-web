import { render, h } from 'preact';
import { lazy, LocationProvider, Router, useLocation, useRoute } from 'preact-iso';
import { signal } from '@preact/signals';

import { model } from '../../../model';


export const NavItem = ({ route, onSelect, count }: {
  route: {
    name: string,
    url: string,
    aside: ReturnType<typeof lazy>,
    content: ReturnType<typeof lazy>,
  },
  count?: number,
  onSelect: (url: string) => void,
}) => {
  const location = useLocation();
 
  return <li className={location.path?.startsWith(route.url) ? "selected" : ""} onClick={() => onSelect(route.url)} onMouseOver={() => { route.aside.preload(); route.content.preload(); } }>
      {route.name}

      { count > 0 && <sup class="badge">{count}</sup>}
  </li>;
}


export const MainNav = (props: any ) => {
    const location = useLocation();

    const onSelectNavItem = (url: string) => {
        location.route(url);
    }

    return <>
        <header><section></section>Inaudible<section></section></header>

      <menu>

      </menu>

      <footer>
        <button>Profile</button>
        <button>Settings</button>
      </footer>
    </>;
}