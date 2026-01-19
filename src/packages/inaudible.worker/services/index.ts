import type { Container } from "../container";
import { Auth } from "./auth";

export class Service {
    private container: Container;
    public auth: Auth;

    constructor(container: Container) {
        this.container = container;
        this.auth = new Auth(container);
    }
}