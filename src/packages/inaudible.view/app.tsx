import { render, h } from 'preact';
import { MainContent } from './layouts/main-content';
import { LocationProvider } from 'preact-iso';
import { signal, useSignalEffect } from '@preact/signals';

import { container } from "../../container";
import type { InaudibleService } from '../inaudible.service';

import arrowsRotate from "./icons/arrows-rotate.svg";

import { BottomNav } from './components/bottom-nav';
import { PlayerDock } from './components/player-dock';
import type { AudiobookshelfApi } from '../audiobookshelf.api/service';
import { useLayoutEffect } from 'preact/hooks';
import type { MediaProgress } from '../audiobookshelf.api/interfaces/model/media-progress';
import type { ProgressStore } from '../inaudible.model/store/progress-store';
import type { ServerSettings } from '../audiobookshelf.api/interfaces/model/server-settings';
import type { MyLibraryStore } from '../inaudible.model/store/my-library-store';

const loading = signal<boolean>(false);
const total = signal<number>(100);
const complete = signal<number>(0);

const defaultLibrary = "f887bdf8-abcd-4ab3-83f4-2b91e661343b";


let inaudible;

const synchronize = async () => {
    console.info(' - synchronizing - ')
    loading.value = true;

    if (!inaudible) {
        inaudible = container.get("inaudible.service") as InaudibleService;
        inaudible.sync.addEventListener("progress", (event: CustomEvent) => {
            console.info("progress", event.detail);
            total.value = event.detail.total;
            complete.value = event.detail.complete;
        });
    }

    complete.value = 1;
    total.value = 100;
    await inaudible.sync.synchronize(defaultLibrary);

    console.info(" - sync complete - ");

    setTimeout(() => {
      complete.value = 0;
      loading.value = false;
    }, 1000);
}

const auth = {
	loggedIn: signal(false),
	checking: signal(true),
};

const hasOpenId = (settings: ServerSettings | null) => {
    const methods = settings?.authActiveAuthMethods ?? [];
    const openIdMethod = methods.some((method) => method.toLowerCase().includes("openid") || method.toLowerCase().includes("oidc"));
    return openIdMethod || !!settings?.authOpenIDIssuerURL;
};

const controller = () => {
 	const api = container.get("audiobookshelf.api") as AudiobookshelfApi;
    const progressStore = container.get("inaudible.store.progress") as ProgressStore;
    const libraryStore = container.get("inaudible.store.library") as MyLibraryStore;
    const serverUrl = signal<string>(localStorage.getItem("abs_api_baseUrl") ?? "");
    const serverSettings = signal<ServerSettings | null>(null);
    const serverSettingsChecking = signal<boolean>(false);
    const openIdAvailable = signal<boolean>(false);
    const openIdButtonText = signal<string>("Login with OpenID");
    const openIdPending = signal<boolean>(false);
    const openIdError = signal<string | null>(null);

	api.events.on("login", (data) => {
		auth.loggedIn.value = true;
		auth.checking.value = false;
        openIdPending.value = false;
        openIdError.value = null;
		console.log("login", data);
	});

	api.events.on("logout", () => {
		auth.loggedIn.value = false;
		auth.checking.value = false;
        openIdPending.value = false;
        openIdError.value = null;
		console.log("logout");
	});

    const storeProgress = async (items: MediaProgress[] | undefined) => {
        if (!items?.length) {
            return;
        }
        await progressStore.putMany(items.map(item => ({
            id: item.id,
            userId: item.userId,
            libraryItemId: item.libraryItemId,
            mediaItemId: item.mediaItemId,
            mediaItemType: item.mediaItemType,
            duration: item.duration,
            progress: item.progress,
            currentTime: item.currentTime,
            isFinished: item.isFinished,
            lastUpdate: item.lastUpdate,
            startedAt: item.startedAt,
        })));
        const now = Date.now();
        await libraryStore.putMany(items.map(item => ({
            id: item.libraryItemId,
            addedAt: now,
            updatedAt: now,
        })));
    };

    const loadServerSettings = async (nextServerUrl?: string) => {
        const targetUrl = (nextServerUrl ?? serverUrl.value ?? "").trim();
        if (!targetUrl) {
            serverSettings.value = null;
            openIdAvailable.value = false;
            openIdButtonText.value = "Login with OpenID";
            return;
        }

        serverSettingsChecking.value = true;
        openIdError.value = null;
        try {
            const settings = await api.getServerSettings(targetUrl);
            serverSettings.value = settings;
            openIdAvailable.value = hasOpenId(settings);
            openIdButtonText.value = settings?.authOpenIDButtonText || "Login with OpenID";
        } catch (error) {
            serverSettings.value = null;
            openIdAvailable.value = false;
            openIdButtonText.value = "Login with OpenID";
            openIdError.value = "Unable to fetch server settings.";
        } finally {
            serverSettingsChecking.value = false;
        }
    };

    useLayoutEffect(() => {
        api.reloadTokens();
        api.setBaseUrl(serverUrl.value);
        if (!api.getAccessToken()) {
            auth.loggedIn.value = false;
            auth.checking.value = false;
            return;
        }
        auth.loggedIn.value = true;
        const verify = async () => {
            try {
                const user = await api.authorize();
                auth.loggedIn.value = true;
                await storeProgress(user?.mediaProgress);
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                if (message.includes("401")) {
                    auth.loggedIn.value = false;
                }
            } finally {
                auth.checking.value = false;
            }
        };
        verify();
    }, []);

    useLayoutEffect(() => {
        loadServerSettings();
    }, []);

    useSignalEffect(() => {
    	console.log("aut->loggedIn", auth.loggedIn.value);
		const dialog = document.getElementById('login-dialog') as HTMLDialogElement;
		if (!dialog) {
			return;
		}
		if (auth.checking.value) {
			dialog.close();
			return;
		}
		if (auth.loggedIn.value) {
			dialog.close();
		} else {
			dialog.showModal();
		}
    });

	return {
		...auth,
        serverUrl,
        serverSettings,
        serverSettingsChecking,
        openIdAvailable,
        openIdButtonText,
        openIdPending,
        openIdError,
        loadServerSettings,
        updateServerUrl: (nextUrl: string) => {
            serverUrl.value = nextUrl;
            localStorage.setItem("abs_api_baseUrl", nextUrl);
            api.setBaseUrl(nextUrl);
            openIdAvailable.value = false;
            openIdButtonText.value = "Login with OpenID";
            openIdPending.value = false;
            openIdError.value = null;
        },
		login: async () => {
			const form = document.getElementById('login-form') as HTMLFormElement;
			const server = (form.elements.namedItem('server-url') as HTMLInputElement).value;
			const username = (form.elements.namedItem('username') as HTMLInputElement).value;
			const password = (form.elements.namedItem('password') as HTMLInputElement).value;

			const result = await api.login(username, password, server);
			await storeProgress(result?.user?.mediaProgress);
			auth.loggedIn.value = true;
			auth.checking.value = false;
		},
        loginOpenId: () => {
            const targetUrl = serverUrl.value.trim().replace(/\/+$/, "");
            if (!targetUrl) {
                openIdError.value = "Server URL is required for OpenID login.";
                return;
            }

            localStorage.setItem("abs_api_baseUrl", targetUrl);
            api.setBaseUrl(targetUrl);

            const loginUrl = `${targetUrl}/audiobookshelf/login`;
            const popup = window.open(loginUrl, "_blank", "noopener");
            if (!popup) {
                window.location.assign(loginUrl);
                return;
            }

            openIdPending.value = true;
            openIdError.value = null;
        },
        finishOpenIdLogin: async () => {
            api.reloadTokens();
            if (!api.getAccessToken()) {
                openIdError.value = "OpenID login not detected. Finish login in the opened tab first.";
                return;
            }

            try {
                const user = await api.authorize();
                await storeProgress(user?.mediaProgress);
                auth.loggedIn.value = true;
                auth.checking.value = false;
                openIdPending.value = false;
                openIdError.value = null;
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                openIdError.value = message;
            }
        },
	};
}

const App = () => {
	const auth = controller();

	return <LocationProvider>
		<adw-header>
			<meter min={0} max={total.value} value={complete.value}></meter>
			<section></section>
			Inaudible
			<section>
				<button title="sync" disabled={auth.loggedIn.value ? true : undefined}>
					<adw-icon onClick={e => synchronize()}><img src={arrowsRotate} alt="sync" /></adw-icon>
				</button>
			</section>
		</adw-header>
		<adw-content>
			<MainContent />

		</adw-content>
		<PlayerDock />
		<dialog id="login-dialog" is="adw-dialog">
			<adw-header>
				<section></section>
				Inaudible Login
				<section></section>
			</adw-header>
			<form id="login-form" class="stack wide" slot="body">
				<p>Please enter your audiobookshelf credentials to login.</p>
				<label>
					Server Url
					<input
                        name="server-url"
                        type="text"
                        placeholder="Server URL"
                        value={auth.serverUrl.value}
                        onInput={(event) => auth.updateServerUrl((event.target as HTMLInputElement).value)}
                        onBlur={() => auth.loadServerSettings()}
                    />
				</label>
				<label>
					Username
					<input name="username" type="text" placeholder="Username" defaultValue={localStorage.getItem("abs_api_username")} />
				</label>
				<label>
					Password
					<input name="password" type="password" placeholder="Password" />
				</label>
                {auth.openIdAvailable.value && (
                    <section class="stack">
                        <p>{auth.openIdButtonText.value} is available for this server.</p>
                        <button type="button" onClick={() => auth.loginOpenId()}>{auth.openIdButtonText.value}</button>
                        {auth.openIdPending.value && (
                            <button type="button" onClick={() => auth.finishOpenIdLogin()}>
                                I have completed OpenID login
                            </button>
                        )}
                    </section>
                )}
                {auth.openIdError.value && <p>{auth.openIdError.value}</p>}
			</form>
			<footer class="center">
				<button class="primary" onClick={() => auth.login()}>Login</button>
			</footer>
		</dialog>
		<BottomNav />
	</LocationProvider>;
}
export const init = async () => {
    render(<App />, document.getElementById('app'));
}
