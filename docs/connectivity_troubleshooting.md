# GIRO Mobile-Desktop Connectivity Troubleshooting

This guide provides a step-by-step approach to diagnosing and resolving connection issues between the GIRO Desktop application and the GIRO Mobile app.

## 1. Technical Overview

-   **Discovery Protocol:** mDNS (Zeroconf / Bonjour)
-   **Service Name:** `_giro._tcp.`
-   **Port:** 3847 (TCP)
-   **Communication:** WebSocket

## 2. Desktop Environment Checks (Windows)

### A. Windows Firewall (Most Common Issue)
The desktop application hosts a server on port **3847**. Windows Firewall usually blocks incoming connections to new ports by default.

**Resolution:**
1.  Open **Windows Security** > **Firewall & network protection**.
2.  Click **Allow an app through firewall**.
3.  Click **Change settings** (requires Admin).
4.  Find `giro-desktop` (or `giro.exe`).
5.  Ensure both **Private** and **Public** checkboxes are ticked.
    -   *If the app is not listed:* Click **Allow another app**, browse to the efficient `giro.exe` location, and add it.

### B. Network Profile (Private vs. Public)
Windows treats "Public" networks with stricter security, often disabling mDNS and local device discovery.

**Resolution:**
1.  Click the Wi-Fi/Ethernet icon in the system tray.
2.  Click **Properties** under the connected network.
3.  Ensure **Network profile type** is set to **Private**.

### C. Host IP Resolution
The desktop app attempts to determine its local IP to advertise it. If you have multiple network adapters (e.g., VPN, VirtualBox), it might advertise the wrong IP.

**Diagnosis:**
-   Open Command Prompt (`cmd`) and run `ipconfig`.
-   Note the IPv4 address of your Wi-Fi interface.
-   Compare this with what the mobile app (if it sees the desktop) is trying to connect to (requires debugger logs if available).

## 3. Mobile Environment Checks

### A. Local Network Permission (iOS)
iOS requires explicit permission for apps to access devices on the generic local network.

**Resolution:**
1.  Go to iOS **Settings**.
2.  Scroll down to **GIRO** (or the development app executioner).
3.  Ensure **Local Network** permission is enabled.

### B. Wi-Fi Isolation / Guest Networks
If the devices are on a "Guest" Wi-Fi network, Client Isolation might be enabled, preventing devices from seeing each other.

**Resolution:**
1.  Ensure both devices are on the **same** main Wi-Fi network.
2.  Avoid "Guest" networks or corporate networks with VLAN isolation unless configured to allow mDNS.

## 4. Advanced Troubleshooting

### A. Testing Connectivity (Ping)
Can the mobile device reach the desktop at all?
-   Use a network tool app on the mobile (e.g., "Fing" or "Network Analyzer").
-   Try to **Ping** the desktop's IP address.
-   If Ping fails, the issue is lower-level network isolation or firewall (ICMP blocked).

### B. Testing Port Accessibility
-   Open a browser on the mobile device.
-   Navigate to `http://<DESKTOP_IP>:3847`.
-   *Note:* The server is a WebSocket server, but you might get a connection response or at least a "Upgrade Required" error instead of a "Connection Refused / Timed Out". If it times out, the port is blocked.

### C. Testing mDNS Discovery
-   **Desktop:** Use a tool like "Bonjour Browser" or command `dns-sd -B _giro._tcp` to see if the service is being advertised.
-   **Mobile:** Use a "Discovery" or "Bonjour Browser" app to spy on the network `_giro._tcp.` service.
-   If the service appears on the desktop tool but not mobile, it's a multicast routing/blocking issue.

## 5. Development Debugging

If you are a developer debugging the app:

1.  **Check Desktop Logs:** Look for "Server listening on 0.0.0.0:3847" and "mDNS service registered".
2.  **Force IP:** In `mobile_server.rs`, verify the IP binding.
3.  **Hardcoded Connection:** Temporarily bypass discovery in the mobile app and hardcode `ws://<YOUR_IP>:3847` to rule out mDNS issues vs. WebSocket issues.
