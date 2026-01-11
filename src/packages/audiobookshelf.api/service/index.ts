import { EventBus } from "../../bus.events/event-bus";
import type { Login } from "../interfaces/api/login-response";
import type { User } from "../interfaces/model/user";
export { AudiobookshelfSocket } from "./socket";

interface Events {
	login: (user: Login.Response.user) => void;
	logout: () => void;
}

export class AudiobookshelfApi {
 	public events = new EventBus<Events>();
    private _baseUrl: string;
    private accessToken: string | null;
    private refreshToken: string | null;
    private user: {
        id: string;
        username: string;
        email: string;
        type: string;
        isActive: boolean;
        isLocked: boolean;
        lastSeen: number;
        createdAt: number;
        permissions: any;
        hasOpenIDLink: boolean;
    };

  	public on = this.events.on.bind(this.events);

    constructor(baseUrl: string) {
        this._baseUrl = baseUrl;
        this.loadTokens();
    }

    setBaseUrl(baseUrl: string) {
        this._baseUrl = baseUrl;
    }

    reloadTokens() {
        this.loadTokens();
    }

    getBaseUrl(): string {
        return this._baseUrl;
    }

    getAccessToken(): string | null {
        return this.accessToken;
    }

    loggedIn(): boolean {
        return !!this.accessToken;
    }

    private saveTokens() {
        if (this.accessToken) {
            localStorage.setItem("abs_api_accessToken", this.accessToken);
            localStorage.setItem("abs_api_refreshToken", this.refreshToken);
            localStorage.setItem("abs_api_user", JSON.stringify(this.user));
        }


        localStorage.setItem("abs_api_baseUrl", this._baseUrl);
    }

    private saveUser(user: User) {
        this.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            type: user.type,
            isActive: user.isActive,
            isLocked: user.isLocked,
            lastSeen: user.lastSeen,
            createdAt: user.createdAt,
            permissions: user.permissions,
            hasOpenIDLink: user.hasOpenIDLink
        }
    }

    private loadTokens() {
    	this._baseUrl = localStorage.getItem("abs_api_baseUrl");
        this.accessToken = localStorage.getItem("abs_api_accessToken");
        this.refreshToken = localStorage.getItem("abs_api_refreshToken");
        this.user = JSON.parse(localStorage.getItem("abs_api_user") ?? "{}");
    }

    private async refreshAccessToken(): Promise<void> {
        if (!this.refreshToken) {
            throw new Error("No refresh token available");
        }

        const response = await fetch(`${this._baseUrl}/audiobookshelf/api/token/refresh`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ refreshToken: this.refreshToken }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Token refresh failed: ${response.status} ${error}`);
        }

        const data = await response.json();
        this.accessToken = data.accessToken;
        this.saveTokens();
    }


    async login(
        username: string,
        password: string,
        baseUrl?: string,
    ): Promise<Login.Response> {
	    if (baseUrl) {
	        this._baseUrl = baseUrl;
	    }
        const response = await fetch(`${this._baseUrl}/audiobookshelf/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-return-tokens': 'true',
            },
            body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Login failed: ${response.status} ${error}`);
        }

        const data: Login.Response = await response.json();
        this.saveUser(data.user)
        this.accessToken = data.user.accessToken;
        this.refreshToken = data.user.refreshToken;
        localStorage.setItem("abs_api_username", username)
        this.saveTokens();


        this.events.emit("login", null);

        return data;
    }

    async authorize(): Promise<User> {
        if (!this.accessToken) {
            throw new Error("No access token available");
        }

        let response = await fetch(`${this._baseUrl}/audiobookshelf/api/authorize`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${this.accessToken}`,
            },
        });

        const shouldRefresh = response.status === 401 && this.refreshToken;
        if (shouldRefresh) {
            await this.refreshAccessToken();
            response = await fetch(`${this._baseUrl}/audiobookshelf/api/authorize`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${this.accessToken}`,
                },
            });
        }

        if (!response.ok) {
            const error = await response.text();
            if (response.status === 401) {
                await this.logout();
            }
            throw new Error(`Authorize failed: ${response.status} ${error}`);
        }

        const data = await response.json();
        if (data?.user) {
            this.saveUser(data.user);
        }
        return data?.user ?? data;
    }

    async logout(full?: false): Promise<void> {
        await fetch(`${this._baseUrl}/audiobookshelf/api/logout`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this. accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        this.accessToken = null;
        this.refreshToken = null;
        this.user = null;

        if (full) {
	        localStorage.removeItem("abs_api_baseUrl");
	        localStorage.removeItem("abs_api_username");
        }
        localStorage.removeItem("abs_api_accessToken");
        localStorage.removeItem("abs_api_refreshToken");
        localStorage.removeItem("abs_api_user");

         this.events.emit("logout", null);
    }


    async request<P, T>(url: string, method: string, requestData: P): Promise<T> {
        let response = await fetch(`${this._baseUrl}/audiobookshelf/api${url}`, {
            method,
            headers: {
                'Authorization': `Bearer ${this. accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
        });

        const shouldRefresh = response.status === 401 && this.refreshToken;
        if (shouldRefresh) {
            await this.refreshAccessToken();

            response = await fetch(`${this._baseUrl}/audiobookshelf/${url}`, {
                method,
                headers: {
                    'Authorization': `Bearer ${this. accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData),
            });
        }

        if (!response.ok) {
            const error = await response.text();
            if (response.status === 401) {
                await this.logout();
            }
            throw new Error(`Request failed: ${response.status} ${error}`);
        }

        const data: T = await response.json();
        return data;
    }
}
