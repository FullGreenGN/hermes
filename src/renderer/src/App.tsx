import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notify } from './components/ToastProvider';

// Define types for buttons
interface ButtonConfig {
  img: string;
  link: string;
  label: string;
}

// Define types for update info
interface UpdateInfo {
  version: string;
  releaseDate?: string;
  [key: string]: any;
}

function App(): React.JSX.Element {
  // State management
  const [buttons, setButtons] = useState<ButtonConfig[]>([]);
  const [imgDataUrls, setImgDataUrls] = useState<{ [path: string]: string }>({});
  const [backgroundImage, setBackgroundImage] = useState<string>("");
  const [backgroundImageDataUrl, setBackgroundImageDataUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(null);

  const navigate = useNavigate();

  // Load configuration data
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const cfg = await window.api.getConfig();

        if (cfg && Array.isArray(cfg.buttons)) {
          setButtons(cfg.buttons);
        }

        if (cfg && typeof cfg.backgroundImage === 'string') {
          setBackgroundImage(cfg.backgroundImage);
        }
      } catch (err) {
        console.error('Failed to load configuration:', err);
        setError('Failed to load configuration');
        notify.error('Failed to load configuration');
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();

    // Listen for shortcut event from main process
    const handler = () => navigate('/config');
    window.electron?.ipcRenderer.on('navigate-to-config', handler);

    return () => {
      window.electron?.ipcRenderer.removeListener('navigate-to-config', handler);
    };
  }, [navigate]);

  // Setup auto-update listeners
  useEffect(() => {
    // Register update listeners
    window.api.onUpdateAvailable((info) => {
      console.log('Update available:', info);
      setUpdateAvailable(info);
      notify.success(`Update available: v${info.version}`);
    });

    window.api.onUpdateProgress((progressObj) => {
      console.log(`Download progress: ${progressObj.percent}%`);
      // We don't show a toast for every progress update as it would be too noisy
    });

    window.api.onUpdateDownloaded((info) => {
      console.log('Update downloaded:', info);
      notify.success(`Update downloaded: v${info.version}. It will be installed when you restart the app.`);
    });

    return () => {
      // Clean up listeners when component unmounts
      window.api.removeUpdateListeners();
    };
  }, []);

  // Load background image when backgroundImage changes
  useEffect(() => {
    const loadBackgroundImage = async () => {
      if (!backgroundImage) {
        setBackgroundImageDataUrl("");
        return;
      }

      try {
        const dataUrl = await window.api.readImageAsDataUrl(backgroundImage);
        setBackgroundImageDataUrl(dataUrl);
      } catch (err) {
        console.error('Failed to load background image:', err);
        setBackgroundImageDataUrl("");
        notify.error('Failed to load background image');
      }
    };

    loadBackgroundImage();
  }, [backgroundImage]);

  // Load button images when buttons change
  useEffect(() => {
    const loadButtonImages = async () => {
      if (buttons.length === 0) return;

      try {
        const entries = await Promise.all(
          buttons.map(async (btn) => {
            if (!btn.img) return [btn.img, ''];
            try {
              const dataUrl = await window.api.readImageAsDataUrl(btn.img);
              return [btn.img, dataUrl];
            } catch (err) {
              console.warn(`Failed to load image for button "${btn.label}":`, err);
              return [btn.img, ''];
            }
          })
        );

        setImgDataUrls(Object.fromEntries(entries));
      } catch (err) {
        console.error('Failed to load button images:', err);
        notify.error('Failed to load some button images');
      }
    };

    loadButtonImages();
  }, [buttons]);

  // Handle opening links in external browser
  const handleOpenLink = useCallback((link: string, label: string) => {
    if (!link) {
      console.warn('Attempted to open empty link');
      return;
    }

    try {
      window.open(link, '_blank');
    } catch (err) {
      console.error(`Failed to open link ${link}:`, err);
      notify.error(`Failed to open ${label || 'link'}`);
    }
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="text-xl text-red-500">{error}</div>
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      {backgroundImageDataUrl && (
        <img
          src={backgroundImageDataUrl}
          className="w-full h-full object-cover absolute top-0 left-0 -z-10"
          alt="Background"
          onError={() => {
            setBackgroundImageDataUrl("");
            notify.error('Failed to load background image');
          }}
        />
      )}

      {/* Update notification banner (complementary to the toast notification) */}
      {updateAvailable && (
        <div className="fixed top-4 right-4 bg-blue-500 text-white p-3 rounded-md shadow-lg z-50">
          <p className="font-medium">Update available: v{updateAvailable.version}</p>
          <p className="text-sm">The app will update when restarted</p>
        </div>
      )}

      <div className="flex flex-col items-center mt-8">
        <div className="flex flex-wrap gap-4 justify-center items-center max-w-6xl absolute left-1/2 -translate-x-1/2" style={{ bottom: '2rem', position: 'fixed' }}>
          {buttons.length === 0 ? (
            <div className="text-center text-gray-400">
              <p>No quick links added yet.</p>
              <p className="text-sm mt-2">
                <button
                  className="underline hover:text-blue-500"
                  onClick={() => navigate('/config')}
                >
                  Go to config
                </button> to add some buttons.
              </p>
            </div>
          ) : (
            buttons.map((btn, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <button
                  className="border rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
                  style={{ width: 168, height: 168, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={() => handleOpenLink(btn.link, btn.label)}
                  aria-label={btn.label}
                >
                  <img
                    src={imgDataUrls[btn.img] || ''}
                    alt={btn.label}
                    className="w-full h-full object-contain rounded-lg"
                    onError={(e) => {
                      // Show a placeholder on image error
                      e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZWVlIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGFsaWdubWVudC1iYXNlbGluZT0ibWlkZGxlIiBmb250LWZhbWlseT0ic3lzdGVtLXVpLCBzYW5zLXNlcmlmIiBmaWxsPSIjOTk5Ij5JbWFnZSBub3QgZm91bmQ8L3RleHQ+PC9zdmc+';
                    }}
                  />
                </button>
                <span className="text-sm mt-1 text-center font-medium">{btn.label}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

export default App;
