const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

const DEFAULT_STAFF_URL = 'http://localhost:4000/staff';
const DEFAULT_CUSTOMER_URL = 'http://localhost:4000/order/upcBv2WYE71A';

function parseArgs() {
  const args = process.argv.slice(2);
  const urlIndex = args.indexOf('--url');
  const hasStaffFlag = args.includes('--staff');
  const hasMobileFlag = args.includes('--mobile') || args.includes('--android') || args.includes('--ios');

  const customUrl = urlIndex >= 0 ? args[urlIndex + 1] : process.env.APP_URL || DEFAULT_CUSTOMER_URL;
  const targetUrl = hasStaffFlag ? (process.env.STAFF_URL || DEFAULT_STAFF_URL) : customUrl;

  return {
    targetUrl,
    mobileMode: hasMobileFlag || process.env.APP_MODE === 'mobile',
    title: hasStaffFlag ? 'QR Food Order - Staff Desktop' : 'QR Food Order - Mobile Order',
  };
}

function createWindow(options = {}) {
  const defaultOptions = parseArgs();
  const finalOptions = { ...defaultOptions, ...options };
  const { targetUrl, mobileMode, title } = finalOptions;

  const win = new BrowserWindow({
    width: mobileMode ? 430 : 1440,
    height: mobileMode ? 860 : 980,
    minWidth: mobileMode ? 360 : 1180,
    minHeight: mobileMode ? 640 : 760,
    backgroundColor: '#0b0d12',
    title,
    autoHideMenuBar: false,
    icon: path.join(__dirname, 'icon.png'),
    resizable: !mobileMode,
    frame: !mobileMode,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  if (mobileMode) {
    win.setAspectRatio(430 / 860);
    win.setBackgroundColor('#0f172a');
  }

  win.loadURL(targetUrl);

  win.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });

  return win;
}

function buildMenu() {
  const openMode = (mode) => {
    const allWindows = BrowserWindow.getAllWindows();
    const mainWindow = allWindows[0];

    if (mainWindow) {
      if (mode === 'staff') {
        mainWindow.loadURL(DEFAULT_STAFF_URL);
        mainWindow.setTitle('QR Food Order - Staff Desktop');
        mainWindow.setMinimumSize(1180, 760);
        mainWindow.setSize(1440, 980, true);
        mainWindow.setResizable(true);
        mainWindow.setMenuBarVisibility(true);
      } else if (mode === 'customer-desktop') {
        mainWindow.loadURL(DEFAULT_CUSTOMER_URL);
        mainWindow.setTitle('QR Food Order - Customer Desktop');
        mainWindow.setMinimumSize(1180, 760);
        mainWindow.setSize(1440, 980, true);
        mainWindow.setResizable(true);
        mainWindow.setMenuBarVisibility(true);
      } else if (mode === 'customer-mobile') {
        mainWindow.loadURL(DEFAULT_CUSTOMER_URL);
        mainWindow.setTitle('QR Food Order - Mobile Order');
        mainWindow.setMinimumSize(360, 640);
        mainWindow.setSize(430, 860, true);
        mainWindow.setResizable(false);
        mainWindow.setMenuBarVisibility(false);
      }
    }
  };

  const template = [
    {
      label: 'Desktop Settings',
      submenu: [
        { label: 'Staff Desktop', click: () => openMode('staff') },
        { label: 'Customer Desktop', click: () => openMode('customer-desktop') },
        { label: 'Customer Mobile', click: () => openMode('customer-mobile') },
        { type: 'separator' },
        { label: 'Toggle Developer Tools', click: () => BrowserWindow.getAllWindows()[0]?.webContents.toggleDevTools() },
        { type: 'separator' },
        { label: 'Quit', role: 'quit' },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  createWindow();
  buildMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
