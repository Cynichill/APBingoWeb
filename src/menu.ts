export function setupMenu(onLogin: (host: string, port: number, slot: string) => void) {
    const menuButton = document.getElementById("menuButton")!;
    const sidePanel = document.getElementById("sidePanel")!;

    const hostInput = document.getElementById("hostInput") as HTMLInputElement;
    const portInput = document.getElementById("portInput") as HTMLInputElement;
    const slotInput = document.getElementById("slotInput") as HTMLInputElement;

    const loginButton = document.getElementById("loginButton")!;

    menuButton.addEventListener("click", () => {
        sidePanel.classList.toggle("open");
    });

    loginButton.addEventListener("click", () => {
        const host = hostInput.value;
        const port = Number(portInput.value);
        const slot = slotInput.value;

        onLogin(host, port, slot);
    });
}