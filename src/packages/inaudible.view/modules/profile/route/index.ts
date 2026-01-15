import { lazy } from "preact-iso";

export default {
    name: "Profile",
    url: "/profile",
    content: lazy(() => import("./content"))
};
