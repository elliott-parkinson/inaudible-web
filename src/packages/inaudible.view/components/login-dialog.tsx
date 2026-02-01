import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

type Props = {
    serverUrl: { value: string };
    checking: { value: boolean };
    onboardingComplete: { value: boolean };
    loggedIn: { value: boolean };
    libraries: { value: Array<{ id: string; name: string }> };
    selectedLibraryId: { value: string | null };
    onSelectLibrary: (id: string) => void;
    onSync: () => void;
    syncTotal: { value: number };
    syncComplete: { value: number };
    syncDone: { value: boolean };
    syncLoading: { value: boolean };
    onContinue: () => void;
    openIdAvailable: { value: boolean };
    openIdButtonText: { value: string };
    openIdPending: { value: boolean };
    openIdError: { value: string | null };
    loginLoading: { value: boolean };
    serverSettingsChecking: { value: boolean };
    updateServerUrl: (nextUrl: string) => void;
    loadServerSettings: () => void;
    login: () => void;
    loginOpenId: () => void;
    finishOpenIdLogin: () => void;
};

export const LoginDialog = ({
    serverUrl,
    checking,
    onboardingComplete,
    loggedIn,
    libraries,
    selectedLibraryId,
    onSelectLibrary,
    onSync,
    syncTotal,
    syncComplete,
    syncDone,
    syncLoading,
    onContinue,
    openIdAvailable,
    openIdButtonText,
    openIdPending,
    openIdError,
    loginLoading,
    serverSettingsChecking,
    updateServerUrl,
    loadServerSettings,
    login,
    loginOpenId,
    finishOpenIdLogin,
}: Props) => {
    const [step, setStep] = useState<'server' | 'login' | 'sync'>('server');
    const [serverConfirmed, setServerConfirmed] = useState(() => serverUrl.value.trim().length > 0);
    const dialogRef = useRef<HTMLDialogElement | null>(null);

    useEffect(() => {
        if (loggedIn.value) {
            setStep('sync');
            return;
        }
        if (!serverConfirmed) {
            setStep('server');
            return;
        }
        if (step === 'sync') {
            setStep('login');
        }
    }, [loggedIn.value, serverConfirmed, step]);

    useEffect(() => {
        if (serverUrl.value.trim().length > 0 && !serverConfirmed) {
            setServerConfirmed(true);
            setStep('login');
        }
    }, [serverUrl.value]);

    useEffect(() => {
        if (step !== 'sync') {
            return;
        }
        if (!selectedLibraryId.value && libraries.value.length > 0) {
            onSelectLibrary(libraries.value[0].id);
        }
    }, [step, libraries.value.length, selectedLibraryId.value]);

    useEffect(() => {
        return;
    }, [step, serverUrl.value]);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) {
            return;
        }
        if (checking.value) {
            dialog.close();
            return;
        }
        if (loggedIn.value && onboardingComplete.value) {
            dialog.close();
            return;
        }
        if (!dialog.open) {
            dialog.showModal();
        }
    }, [checking.value, loggedIn.value, onboardingComplete.value]);

    const percent = syncTotal.value > 0 ? Math.round((syncComplete.value / syncTotal.value) * 100) : 0;
    const canContinue = syncDone.value && !syncLoading.value;
    const selectedValue = libraries.value.find((library) => library.id === selectedLibraryId.value)?.id
        ?? libraries.value[0]?.id
        ?? "";

    const handleSubmit = (event: Event) => {
        event.preventDefault();
        if (step === 'login') {
            login();
        }
    };

    const canContinueServer = serverUrl.value.trim().length > 0;
    const usernameDefault = (() => {
        const stored = localStorage.getItem("abs_api_username") ?? "";
        return stored.includes("://") ? "" : stored;
    })();

    return (
        <dialog id="login-dialog" is="adw-dialog" ref={dialogRef as any}>
            <adw-header>
                <section></section>
                {step === 'server' ? 'Server URL' : step === 'login' ? 'Inaudible Login' : 'First Sync'}
                <section></section>
            </adw-header>
            <form
                id="login-form"
                class="stack wide"
                slot="body"
                onSubmit={handleSubmit as any}
                aria-busy={loginLoading.value ? "true" : "false"}
            >
                {step === 'server' ? (
                    <fieldset disabled={loginLoading.value || serverSettingsChecking.value}>
                        <p>Enter your audiobookshelf server URL to continue.</p>
                        <label>
                            Server Url
                            <input
                                key="server-url"
                                name="server-url"
                                type="text"
                                placeholder="Server URL"
                                value={serverUrl.value}
                                onInput={(event) => updateServerUrl((event.target as HTMLInputElement).value)}
                                autoComplete="off"
                            />
                        </label>
                    </fieldset>
                ) : step === 'login' ? (
                    <fieldset disabled={loginLoading.value}>
                        <p>Please enter your audiobookshelf credentials to login.</p>
                        <label>
                            Username
                            <input
                                key="username"
                                name="username"
                                type="text"
                                placeholder="Username"
                                defaultValue={usernameDefault}
                                autoComplete="username"
                            />
                        </label>
                        <label>
                            Password
                            <input
                                key="password"
                                name="password"
                                type="password"
                                placeholder="Password"
                                autoComplete="current-password"
                            />
                        </label>
                        {openIdAvailable.value && (
                            <section class="stack">
                                <p>{openIdButtonText.value} is available for this server.</p>
                                <button type="button" onClick={() => loginOpenId()}>{openIdButtonText.value}</button>
                                {openIdPending.value && (
                                    <button type="button" onClick={() => finishOpenIdLogin()}>
                                        I have completed OpenID login
                                    </button>
                                )}
                            </section>
                        )}
                        {openIdError.value && <p>{openIdError.value}</p>}
                    </fieldset>
                ) : (
                    <>
                        <p>Your library needs a first sync before you can continue.</p>
                        <label>
                            Library
                            <select
                                key={`${libraries.value.length}-${selectedLibraryId.value ?? ""}`}
                                value={selectedValue}
                                onChange={(event) => onSelectLibrary((event.target as HTMLSelectElement).value)}
                                disabled={libraries.value.length === 0}
                            >
                                {libraries.value.length === 0 && (
                                    <option value="">No libraries found</option>
                                )}
                                {libraries.value.map((library) => (
                                    <option key={library.id} value={library.id}>{library.name ?? "Library"}</option>
                                ))}
                            </select>
                        </label>
                        <section class="stack">
                            <progress max={100} value={percent}></progress>
                            <span>{percent}%</span>
                            <button type="button" onClick={() => onSync()} disabled={syncLoading.value || !selectedLibraryId.value}>
                                {syncLoading.value ? "Syncing..." : "Start sync"}
                            </button>
                        </section>
                    </>
                )}
            </form>
            <footer class="center">
                {step === 'server' ? (
                    <button
                        class="primary"
                        onClick={async () => {
                            setServerConfirmed(true);
                            setStep('login');
                        }}
                        disabled={!canContinueServer || loginLoading.value || serverSettingsChecking.value}
                    >
                        {serverSettingsChecking.value && <adw-spinner aria-hidden="true" style={{ marginRight: "0.5em" }} />}
                        {serverSettingsChecking.value ? "Checking..." : "Continue"}
                    </button>
                ) : step === 'login' ? (
                    <button
                        class="primary"
                        type="submit"
                        form="login-form"
                        onClick={() => login()}
                        disabled={loginLoading.value}
                    >
                        {loginLoading.value && <adw-spinner aria-hidden="true" style={{ marginRight: "0.5em" }} />}
                        {loginLoading.value ? "Logging in..." : "Login"}
                        </button>
                ) : (
                    <button class="primary" onClick={() => onContinue()} disabled={!canContinue}>
                        Continue
                    </button>
                )}
            </footer>
        </dialog>
    );
};
