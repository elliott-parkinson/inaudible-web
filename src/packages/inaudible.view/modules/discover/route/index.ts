import { lazy } from "preact-iso";

export default {
    name: "Discover",
    url: "/",
    content: lazy(() => import("./content"))
}
