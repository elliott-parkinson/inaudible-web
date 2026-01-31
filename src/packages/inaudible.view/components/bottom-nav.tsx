import { useLocation } from 'preact-iso';

import discover from "../icons/magnifying-glass.svg";
import browse from "../icons/books.svg";
import library from "../icons/book-open-cover.svg";
import stats from "../icons/chart-pie.svg";
import profile from "../icons/user.svg";

export const BottomNav = () => {
  const location = useLocation();
  
  return <adw-view-switcher-bar>
    <adw-tab href="/discover" selected={location.path.startsWith("/discover") ? true : undefined} onClick={() => location.route("/discover")}>
      <adw-icon style="width: 1.4em; height: 1.4em;">
        <img src={discover} alt="discover" />
      </adw-icon>
      Discover
    </adw-tab>
    <adw-tab href="/library" selected={location.path.startsWith("/library") ? true : undefined} onClick={() => location.route("/library")}>
      <adw-icon style="width: 1.4em; height: 1.4em;">
        <img src={browse} alt="browse" />
      </adw-icon>
      Browse
    </adw-tab>
    <adw-tab href="/my-library" selected={location.path.startsWith("/my-library") ? true : undefined} onClick={() => location.route("/my-library")}>
      <adw-icon style="width: 1.4em; height: 1.4em;">
        <img src={library} alt="my library" />
      </adw-icon>
      My Library
    </adw-tab>
    <adw-tab href="/stats" selected={location.path.startsWith("/stats") ? true : undefined} onClick={() => location.route("/stats")}>
      <adw-icon style="width: 1.4em; height: 1.4em;">
        <img src={stats} alt="stats" />
      </adw-icon>
      Stats
    </adw-tab>
    <adw-tab href="/profile" selected={location.path.startsWith("/profile") ? true : undefined} onClick={() => location.route("/profile")}>
      <adw-icon style="width: 1.2em; height: 1.2em;">
        <img src={profile} alt="profile" />
      </adw-icon>
      Profile
    </adw-tab>
  </adw-view-switcher-bar>
}
