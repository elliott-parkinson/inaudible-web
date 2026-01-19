import type { Container } from "../container";

export class Auth {
    private container: Container;

    constructor(container: Container) {
        this.container = container;
    }

    setServerUrl(params: { url: string }) {
        const api = this.container.get("audiobookshelf.api") as any;
        api.setBaseUrl(params.url);
    }

    loginAttempt(params: { username: string, password: string }) {
        const api = this.container.get("audiobookshelf.api") as any;
        return api.login(params.username, params.password);
    }
}