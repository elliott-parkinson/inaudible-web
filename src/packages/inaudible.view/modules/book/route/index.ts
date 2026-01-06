import { lazy } from "preact-iso";

export default {
    name: "Clients",
    url: "/clients",
    content: lazy(() => import("./content"))
}