import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface ButtonConfig {
  img: string;
  link: string;
  label: string;
}

function App(): React.JSX.Element {
  const [buttons, setButtons] = useState<ButtonConfig[]>([]);
  const [imgDataUrls, setImgDataUrls] = useState<{ [path: string]: string }>({});
  const [backgroundImage, setBackgroundImage] = useState<string>("");
  const [backgroundImageDataUrl, setBackgroundImageDataUrl] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    window.api.getConfig().then((cfg: any) => {
      if (cfg && Array.isArray(cfg.buttons)) setButtons(cfg.buttons);
      if (cfg && typeof cfg.backgroundImage === 'string') setBackgroundImage(cfg.backgroundImage);
    });
    // Listen for shortcut event from main process
    const handler = () => navigate('/config');
    window.electron?.ipcRenderer.on('navigate-to-config', handler);
    return () => {
      window.electron?.ipcRenderer.removeListener('navigate-to-config', handler);
    };
  }, [navigate]);

  useEffect(() => {
    // Load background image as data URL when backgroundImage changes
    if (backgroundImage) {
      window.api.readImageAsDataUrl(backgroundImage)
        .then((dataUrl: string) => setBackgroundImageDataUrl(dataUrl))
        .catch(() => setBackgroundImageDataUrl(""));
    } else {
      setBackgroundImageDataUrl("");
    }
  }, [backgroundImage]);

  useEffect(() => {
    // Load all button images as data URLs
    const loadImages = async () => {
      const entries = await Promise.all(
        buttons.map(async (btn) => {
          if (!btn.img) return [btn.img, ''];
          try {
            const dataUrl = await window.api.readImageAsDataUrl(btn.img);
            return [btn.img, dataUrl];
          } catch {
            return [btn.img, ''];
          }
        })
      );
      setImgDataUrls(Object.fromEntries(entries));
    };
    if (buttons.length > 0) loadImages();
  }, [buttons]);

  return (
    <>
      {backgroundImageDataUrl && (
        <img src={backgroundImageDataUrl} className={"w-full h-full object-cover absolute top-0 left-0 -z-10"} alt="Background" />
      )}
      <div className="flex flex-col items-center mt-8">
        <div className="flex flex-grid gap-4 justify-center items-center flex-wrap max-w-6xl absolute left-1/2 -translate-x-1/2" style={{ bottom: '2rem', position: 'fixed' }}>
          {buttons.map((btn, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <button
                className="border"
                style={{ width: 168, height: 168, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => window.open(btn.link, '_blank')}
              >
                <img src={imgDataUrls[btn.img]} alt={btn.label} className={"w-full h-full rounded-lg"} />
              </button>
              <span className="text-xs mt-1 text-center">{btn.label}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export default App
