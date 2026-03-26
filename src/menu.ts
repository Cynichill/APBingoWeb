export function setupMenu(
    onLogin: (host: string, port: number, slot: string) => void
) {
    // Elements
    const menuButton = document.getElementById("menuButton")!;
    const sidePanel = document.getElementById("sidePanel")!;
    const hostInput = document.getElementById("hostInput") as HTMLInputElement;
    const portInput = document.getElementById("portInput") as HTMLInputElement;
    const slotInput = document.getElementById("slotInput") as HTMLInputElement;
    const loginButton = document.getElementById("loginButton")!;
    const copyLinkButton = document.getElementById("copyLinkButton")!;

    // Toggle side panel
    menuButton.addEventListener("click", () => sidePanel.classList.toggle("open"));

    // Utility to show copy link button
    const showCopyLink = () => (copyLinkButton.style.display = "block");

    // Load saved values from URL or localStorage
    const params = new URLSearchParams(window.location.search);
    const savedHost = params.get("host") || localStorage.getItem("apHost") || "";
    const savedPort = params.get("port") || localStorage.getItem("apPort") || "";
    const savedSlot = params.get("slot") || localStorage.getItem("apSlot") || "";

    hostInput.value = savedHost;
    portInput.value = savedPort;
    slotInput.value = savedSlot;

    // Auto-login if all fields exist
    if (savedHost && savedPort && savedSlot) {
        onLogin(savedHost, Number(savedPort), savedSlot);
        showCopyLink();
    }

    // Perform login
    const handleLogin = () => {
        const host = hostInput.value.trim();
        const port = Number(portInput.value);
        const slot = slotInput.value.trim();

        if (!host || !port || !slot) return;

        // Update URL
        const newParams = new URLSearchParams({ host, port: String(port), slot });
        window.history.replaceState(null, "", `${window.location.pathname}?${newParams}`);

        // Save to localStorage
        localStorage.setItem("apHost", host);
        localStorage.setItem("apPort", String(port));
        localStorage.setItem("apSlot", slot);

        showCopyLink();
        onLogin(host, port, slot);
    };

    loginButton.addEventListener("click", handleLogin);

    // Copy current link to clipboard
    copyLinkButton.addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            alert("Link copied to clipboard!");
        } catch (err) {
            console.error("Failed to copy link:", err);
        }
    });
}