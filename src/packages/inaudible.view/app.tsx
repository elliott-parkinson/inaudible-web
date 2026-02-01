import { render, h } from 'preact';
import { MainContent } from './layouts/main-content';
import { LocationProvider } from 'preact-iso';
import { signal } from '@preact/signals';

import { container } from "../../container";
import type { InaudibleService } from '../inaudible.service';

import arrowsRotate from "./icons/arrows-rotate.svg";

import { BottomNav } from './components/bottom-nav';
import { PlayerDock } from './components/player-dock';
import { LoginDialog } from './components/login-dialog';
import type { AudiobookshelfApi } from '../audiobookshelf.api/service';
import type { AudiobookshelfMeApi } from '../audiobookshelf.api/service/me';
import { useLayoutEffect, useMemo, useRef } from 'preact/hooks';
import type { MediaProgress } from '../audiobookshelf.api/interfaces/model/media-progress';
import type { ServerSettings } from '../audiobookshelf.api/interfaces/model/server-settings';

const loading = signal<boolean>(false);
const total = signal<number>(100);
const complete = signal<number>(0);
const syncComplete = signal<boolean>(false);
const onboardingComplete = signal<boolean>(localStorage.getItem("inaudible.onboarded") === "true");
const storedLibraryId = localStorage.getItem("inaudible.libraryId");
const selectedLibraryId = signal<string | null>(
    storedLibraryId && storedLibraryId !== "null" && storedLibraryId !== "undefined" ? storedLibraryId : null
);


let inaudible;

const synchronize = async (libraryId: string | null) => {
    console.info(' - synchronizing - ')
    loading.value = true;
    syncComplete.value = false;

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
    if (!libraryId) {
        loading.value = false;
        return;
    }
    await inaudible.sync.synchronize(libraryId);

    console.info(" - sync complete - ");
    syncComplete.value = true;
    onboardingComplete.value = true;
    localStorage.setItem("inaudible.onboarded", "true");

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
    const inaudibleService = container.get("inaudible.service") as InaudibleService;
    const serverUrl = useMemo(() => signal<string>(localStorage.getItem("abs_api_baseUrl") ?? ""), []);
    const serverSettings = useMemo(() => signal<ServerSettings | null>(null), []);
    const serverSettingsChecking = useMemo(() => signal<boolean>(false), []);
    const openIdAvailable = useMemo(() => signal<boolean>(false), []);
    const openIdButtonText = useMemo(() => signal<string>("Login with OpenID"), []);
    const openIdPending = useMemo(() => signal<boolean>(false), []);
    const openIdError = useMemo(() => signal<string | null>(null), []);
    const loginLoading = useMemo(() => signal<boolean>(false), []);
    const libraries = useMemo(() => signal<Array<{ id: string; name: string }>>([]), []);

    const normalizeLibraries = (items: any[]) => {
        if (!Array.isArray(items)) {
            return [];
        }
        return items
            .map((item) => ({
                id: item?.id ?? item?.libraryId ?? item?.library?.id,
                name: item?.name ?? item?.libraryName ?? item?.title ?? item?.label ?? "Untitled library",
            }))
            .filter((item) => item.id);
    };

    const refreshLibraries = async () => {
        let normalized = normalizeLibraries(api.getLibrariesAccessible());
        try {
            const apiLibraries = await api.listLibraries();
            normalized = normalizeLibraries(apiLibraries);
        } catch (error) {
            if (!normalized.length) {
                console.warn("Failed to load libraries", error);
            }
        }
        if (!normalized.length && api.getAccessToken()) {
            try {
                await api.authorize();
                normalized = normalizeLibraries(api.getLibrariesAccessible());
            } catch (error) {
                console.warn("Failed to refresh libraries from authorize", error);
            }
        }
        libraries.value = normalized;
        if (libraries.value.length > 0) {
            const currentSelection = selectedLibraryId.value;
            const hasSelection = currentSelection && libraries.value.some((library) => library.id === currentSelection);
            if (!hasSelection) {
                selectedLibraryId.value = libraries.value[0].id;
                localStorage.setItem("inaudible.libraryId", libraries.value[0].id);
            }
        }
    };

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
        await inaudibleService.myLibrary.storeProgress(items);
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
                const meApi = container.get("audiobookshelf.api.me") as AudiobookshelfMeApi;
                const user = await meApi.get();
                auth.loggedIn.value = true;
                await storeProgress(user?.mediaProgress);
                await refreshLibraries();
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
    

	return {
		...auth,
        serverUrl,
        serverSettings,
        serverSettingsChecking,
        openIdAvailable,
        openIdButtonText,
        openIdPending,
        openIdError,
        loginLoading,
        libraries,
        selectedLibraryId,
        loadServerSettings,
        updateServerUrl: (nextUrl: string) => {
            serverUrl.value = nextUrl;
            api.setBaseUrl(nextUrl);
            localStorage.setItem("abs_api_baseUrl", api.getBaseUrl());
            openIdAvailable.value = false;
            openIdButtonText.value = "Login with OpenID";
            openIdPending.value = false;
            openIdError.value = null;
        },
        setSelectedLibraryId: (nextId: string) => {
            selectedLibraryId.value = nextId;
            localStorage.setItem("inaudible.libraryId", nextId);
        },
        markOnboardingComplete: () => {
            onboardingComplete.value = true;
            localStorage.setItem("inaudible.onboarded", "true");
        },
		login: async () => {
			const form = document.getElementById('login-form') as HTMLFormElement;
			const server = serverUrl.value;
			const username = (form.elements.namedItem('username') as HTMLInputElement).value;
			const password = (form.elements.namedItem('password') as HTMLInputElement).value;

            loginLoading.value = true;
            try {
			    const result = await api.login(username, password, server);
			    await storeProgress(result?.user?.mediaProgress);
                await refreshLibraries();
                if (result?.userDefaultLibraryId) {
                    selectedLibraryId.value = result.userDefaultLibraryId;
                    localStorage.setItem("inaudible.libraryId", result.userDefaultLibraryId);
                }
                if (onboardingComplete.value) {
                    localStorage.setItem("inaudible.onboarded", "true");
                }
			    auth.loggedIn.value = true;
			    auth.checking.value = false;
            } finally {
                loginLoading.value = false;
            }
		},
        loginOpenId: () => {
            const targetUrl = serverUrl.value.trim().replace(/\/+$/, "");
            if (!targetUrl) {
                openIdError.value = "Server URL is required for OpenID login.";
                return;
            }

            api.setBaseUrl(targetUrl);
            localStorage.setItem("abs_api_baseUrl", api.getBaseUrl());

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
                await refreshLibraries();
                if (onboardingComplete.value) {
                    localStorage.setItem("inaudible.onboarded", "true");
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                openIdError.value = message;
            }
        },
	};
}

const App = () => {
	const auth = controller();
    const autoSyncChecked = useRef(false);
    const partialSyncChecked = useRef(false);

    useLayoutEffect(() => {
        if (autoSyncChecked.current) {
            return;
        }
        if (!auth.loggedIn.value || !auth.selectedLibraryId.value) {
            return;
        }
        autoSyncChecked.current = true;
        const lastSyncRaw = localStorage.getItem("inaudible.lastsync") ?? "0";
        const lastSync = Number.parseInt(lastSyncRaw, 10);
        const twelveHoursMs = 12 * 60 * 60 * 1000;
        if (!Number.isFinite(lastSync) || Date.now() - lastSync > twelveHoursMs) {
            void synchronize(auth.selectedLibraryId.value);
        }
    }, [auth.loggedIn.value, auth.selectedLibraryId.value]);

    useLayoutEffect(() => {
        if (partialSyncChecked.current) {
            return;
        }
        if (!auth.loggedIn.value || !auth.selectedLibraryId.value) {
            return;
        }
        partialSyncChecked.current = true;
        const inaudible = container.get("inaudible.service") as InaudibleService;
        void inaudible.sync.synchronizePartial(auth.selectedLibraryId.value);
    }, [auth.loggedIn.value, auth.selectedLibraryId.value]);

	return <LocationProvider>
		<adw-header>
			<meter min={0} max={total.value} value={complete.value}></meter>
			<section></section>
			Inaudible
			<section>
				<button title="sync" disabled={auth.loggedIn.value ? true : undefined}>
					<adw-icon title="sync" onClick={e => synchronize(auth.selectedLibraryId.value)}><img src={arrowsRotate} alt="sync" /></adw-icon>
				</button>
			</section>
		</adw-header>
		<adw-content>
			<MainContent />

		</adw-content>
		<PlayerDock />
		<LoginDialog
            serverUrl={auth.serverUrl}
            checking={auth.checking}
            onboardingComplete={onboardingComplete}
            loggedIn={auth.loggedIn}
            libraries={auth.libraries}
            selectedLibraryId={auth.selectedLibraryId}
            onSelectLibrary={auth.setSelectedLibraryId}
            onSync={() => synchronize(auth.selectedLibraryId.value)}
            syncTotal={total}
            syncComplete={complete}
            syncDone={syncComplete}
            syncLoading={loading}
            onContinue={() => auth.markOnboardingComplete()}
            openIdAvailable={auth.openIdAvailable}
            openIdButtonText={auth.openIdButtonText}
            openIdPending={auth.openIdPending}
            openIdError={auth.openIdError}
            loginLoading={auth.loginLoading}
            serverSettingsChecking={auth.serverSettingsChecking}
            updateServerUrl={auth.updateServerUrl}
            loadServerSettings={auth.loadServerSettings}
            login={auth.login}
            loginOpenId={auth.loginOpenId}
            finishOpenIdLogin={auth.finishOpenIdLogin}
        />
		<BottomNav />
	</LocationProvider>;
}
export const init = async () => {
    render(<App />, document.getElementById('app'));
}
