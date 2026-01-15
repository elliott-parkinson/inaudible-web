import { lazy } from "preact-iso";

export default {
    name: "Stats",
    url: "/stats",
    content: lazy(() => import("./content"))
};
