```
mermaid
---
config:
  layout: dagre
  look: neo
---
flowchart LR
 subgraph Users["👥 Users"]
        A["Customer"]
        B["Staff Member"]
  end
 subgraph System["🖥️ System Interfaces (SvelteKit Client)"]
        C["Customer Interface PWA<br><b>Tourist Capybara</b><br>Registration &amp; Service Selection"]
        D["Staff Interface PWA<br><b>Host Capybara</b><br>Dashboard &amp; Management"]
  end
 subgraph Backend["⚙️ Backend Logic"]
        E["Unified SvelteKit Server<br><b>Business Logic &amp; Data Layer</b><br>• Price Calculation<br>• Lifecycle Management<br>• File Handling<br>• Authentication"]
  end
 subgraph Storage["💾 Data Storage<br>(Google Workspace)"]
        F[("Google Sheets<br><b>Rentals.gsheet</b><br>")]
        F_GAS["Google Apps Script<br><b>Auto-deletion Triggers</b><br>Data Retention Policy"]
        G[("Google Drive<br><b>ID Photos</b>")]
        H[("Google OAuth<br><b>Staff Authentication</b>")]
  end
    F -- Contains --- F_GAS
    F_GAS -- "<b>15.</b> Triggers Deletion<br>of Expired Records" --> F
    F_GAS -- "<b>16.</b> Deletes Associated<br>Photo Files" --> G
    A -- "<b>1.</b> Submits Registration<br>Form Data" --> C
    C -- "<b>2.</b> Sends Form Data" --> E
    E -- "<b>3.</b> Writes/Updates<br>Rental Record" --> F
    B -- "<b>4.</b> Captures ID Photo<br>&amp; Manages Rentals" --> D
    D -- "<b>5.</b> Uploads Photo File" --> E
    E -- "<b>6.</b> Uploads Photo<br>&amp; Gets FileID" --> G
    G -. "<b>7.</b> Returns<br>PhotoFileID" .-> E
    D -- "<b>8.</b> Sends Update/<br>Return Requests" --> E
    E -. "<b>9.</b> Authenticates via<br>Service Account" .-> F
    E -. "<b>10.</b> Authenticates via<br>Service Account" .-> G
    D -- "<b>11.</b> Initiates<br>Login" --> E
    E -- "<b>12.</b> Verifies<br>Credentials With" --> H
    H -. "<b>13.</b> Confirms<br>Identity" .-> E
    E -. "<b>14.</b> Grants<br>Session to" .-> D
     A:::userStyle
     B:::userStyle
     C:::clientStyle
     D:::clientStyle
     E:::serverStyle
     F:::storageStyle
     G:::storageStyle
     H:::storageStyle
    classDef userStyle fill:#e3f2fd,stroke:#1976d2,stroke-width:3px,color:#000
    classDef clientStyle fill:#fff3e0,stroke:#f57c00,stroke-width:3px,color:#000
    classDef serverStyle fill:#fce4ec,stroke:#c2185b,stroke-width:3px,color:#000
    classDef storageStyle fill:#e8f5e9,stroke:#388e3c,stroke-width:3px,color:#000
    style Users fill:#bbdefb,stroke:none,stroke-width:2px
    style System fill:#ffe0b2,stroke:none,stroke-width:2px
    style Backend fill:#f8bbd0,stroke:none,stroke-width:2px
    style Storage fill:#c8e6c9,stroke:none,stroke-width:2px
```
