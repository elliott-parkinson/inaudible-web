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
    updateServerUrl,
    loadServerSettings,
    login,
    loginOpenId,
    finishOpenIdLogin,
}: Props) => {
    const [step, setStep] = useState<'login' | 'sync'>('login');
    const dialogRef = useRef<HTMLDialogElement | null>(null);

    useEffect(() => {
        if (loggedIn.value) {
            setStep('sync');
        } else {
            setStep('login');
        }
    }, [loggedIn.value]);

    useEffect(() => {
        if (step !== 'sync') {
            return;
        }
        if (!selectedLibraryId.value && libraries.value.length > 0) {
            onSelectLibrary(libraries.value[0].id);
        }
    }, [step, libraries.value.length, selectedLibraryId.value]);

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

    return (
        <dialog id="login-dialog" is="adw-dialog" ref={dialogRef as any}>
            <adw-header>
                <section></section>
                {step === 'login' ? 'Inaudible Login' : 'First Sync'}
                <section></section>
            </adw-header>
            <form id="login-form" class="stack wide" slot="body" onSubmit={() => login()}>
                {step === 'login' ? (
                    <>
                        <p>Please enter your audiobookshelf credentials to login.</p>
                        <label>
                            Server Url
                            <input
                                name="server-url"
                                type="text"
                                placeholder="Server URL"
                                value={serverUrl.value}
                                onInput={(event) => updateServerUrl((event.target as HTMLInputElement).value)}
                                onBlur={() => loadServerSettings()}
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
                    </>
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
                {step === 'login' ? (
                    <button class="primary" onClick={() => login()}>Login</button>
                ) : (
                    <button class="primary" onClick={() => onContinue()} disabled={!canContinue}>
                        Continue
                    </button>
                )}
            </footer>
        </dialog>
    );
};
