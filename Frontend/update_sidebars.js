const fs = require('fs');
const path = require('path');

const targetDirs = [
    'Analytics', 'Complain', 'Inventory', 'Query', 'smartexpiry', 'Udhaar', 'Settings', 'Employees'
];

const basePath = path.join(__dirname);

let sidebarTemplateHtml = `
            <div class="brand">
                <button id="sidebar-toggle" class="sidebar-toggle">
                    <i class="fa-solid fa-bars"></i>
                </button>
                <h2 class="brand-text">QuadStock</h2>
            </div>
            <nav class="sidebar-menu">
                <a href="../Ownerdashboard/dashboard.html" class="menu-item __DASHBOARD_ACTIVE__" title="Dashboard">
                    <i class="fa-solid fa-house"></i>
                    <span>Dashboard</span>
                </a>
                <a href="../Analytics/analytics.html" class="menu-item __ANALYTICS_ACTIVE__" title="Analytics">
                    <i class="fa-solid fa-chart-simple"></i>
                    <span>Analytics</span>
                </a>
                <a href="../Query/query.html" class="menu-item __QUERY_ACTIVE__" title="Query">
                    <i class="fa-solid fa-clipboard-question"></i>
                    <span>Query</span>
                </a>
                <a href="../Inventory/inventory.html" class="menu-item __INVENTORY_ACTIVE__" title="Inventory">
                    <i class="fa-solid fa-boxes-stacked"></i>
                    <span>Inventory</span>
                </a>
                <a href="../Employees/employees.html" class="menu-item __EMPLOYEES_ACTIVE__" title="Employees">
                    <i class="fa-solid fa-users"></i>
                    <span>Employees</span>
                </a>
                <a href="../smartexpiry/smartexpiry.html" class="menu-item __SMARTEXPIRY_ACTIVE__" title="Smart Expiry">
                    <i class="fa-solid fa-hourglass-end"></i>
                    <span>Smart Expiry</span>
                </a>

                <a href="../Complain/complain.html" class="menu-item __COMPLAIN_ACTIVE__" title="Complaints">
                    <div style="position:relative;">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <span id="nav-badge-complain" class="nav-badge" style="display:none;">0</span>
                    </div>
                    <span>Complaints</span>
                </a>
                <a href="../Udhaar/udhaar.html" class="menu-item __UDHAAR_ACTIVE__" title="Pending Payments">
                    <i class="fa-solid fa-indian-rupee-sign"></i>
                    <span>Udhaar/Pending</span>
                </a>
                <a href="../Settings/settings.html" class="menu-item __SETTINGS_ACTIVE__" title="Settings">
                    <i class="fa-solid fa-gear"></i>
                    <span>Settings</span>
                </a>
                <a href="../landing/landing.html" class="menu-item" title="Logout">
                    <i class="fa-solid fa-right-from-bracket"></i>
                    <span>Logout</span>
                </a>
            </nav>
            <div class="sidebar-footer-card">
                <div class="support-illustration">
                    <svg viewBox="0 0 100 100" class="illus-svg">
                        <circle cx="50" cy="35" r="15" fill="#333" />
                        <path d="M20,80 Q50,70 80,80 V100 H20 Z" fill="#333" />
                        <rect x="15" y="45" width="25" height="15" rx="2" fill="#555" transform="rotate(-15 27 52)" />
                    </svg>
                </div>
                <a href="../Footer/contact.html" class="btn-support" style="text-decoration: none; display: inline-block; text-align: center;">
                    <i class="fa-regular fa-life-ring"></i> Support
                </a>
            </div>
`;

function getActiveReplacement(dirName) {
    const map = {
        'Analytics': '__ANALYTICS_ACTIVE__',
        'Complain': '__COMPLAIN_ACTIVE__',
        'Inventory': '__INVENTORY_ACTIVE__',
        'Query': '__QUERY_ACTIVE__',
        'smartexpiry': '__SMARTEXPIRY_ACTIVE__',
        'Udhaar': '__UDHAAR_ACTIVE__',
        'Settings': '__SETTINGS_ACTIVE__',
        'Employees': '__EMPLOYEES_ACTIVE__'
    };
    return map[dirName] || '';
}

function processHtmlFile(filePath, dirName) {
    let content = fs.readFileSync(filePath, 'utf8');
    const regex = /(<aside class="sidebar"[^>]*>)([\s\S]*?)(<\/aside>)/i;
    if (regex.test(content)) {
        // Need to clear out all templates first before setting just the active one
        let processedSidebar = sidebarTemplateHtml.replace(/__\w+_ACTIVE__/g, match => {
            return match === getActiveReplacement(dirName) ? 'active' : '';
        });
        
        content = content.replace(regex, `$1\n${processedSidebar}\n$3`);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated HTML sidebar in ${filePath}`);
    } else {
        console.log(`WARNING: <aside class="sidebar"> not found in ${filePath}`);
    }
}

function processJsFile(filePath, dirName) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // We are looking for the owner sidebar injection. Usually follows "dashboard.css" or in an "else" block.
    // Let's find "sidebarTarget.innerHTML = `" that corresponds to the owner dashboard.
    // A robust way: find ALL matches of sidebarTarget.innerHTML = ` ... `
    // And if it contains 'Ownerdashboard/dashboard.html' inside its dashboard link, replace its content!

    // We can't easily match large templates with backticks using a simple regex since there might be other template strings.
    // We will match: sidebarTarget.innerHTML = `[content ending with ]`;
    const blockRegex = /sidebarTarget\.innerHTML\s*=\s*`([\s\S]*?)`;/g;
    
    let processedSidebar = sidebarTemplateHtml.replace(/__\w+_ACTIVE__/g, match => {
        return match === getActiveReplacement(dirName) ? 'active' : '';
    });

    content = content.replace(blockRegex, (match, innerContent) => {
        // Only replace if it corresponds to the OWNER sidebar! (has the dashboard link)
        if (innerContent.includes('Ownerdashboard/dashboard.html') && !innerContent.includes('Managerdashboard/manager_dashboard.css') && !innerContent.includes('margin-top')) {
            return `sidebarTarget.innerHTML = \`\n${processedSidebar}\n\`;`;
        }
        return match;
    });

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated JS sidebar in ${filePath}`);
}

targetDirs.forEach(dir => {
    const dirPath = path.join(basePath, dir);
    if (!fs.existsSync(dirPath)) return;

    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
        const filePath = path.join(dirPath, file);
        if (file.endsWith('.html')) {
            processHtmlFile(filePath, dir);
        } else if (file.endsWith('.js')) {
            processJsFile(filePath, dir);
        }
    });
});
