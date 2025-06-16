import { useState, useEffect, useRef, FormEvent } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import Versions from "@/components/Versions";
import { Checkbox } from "@/components/ui/checkbox";

// Define types for button configuration
interface ButtonConfig {
  img: string;
  link: string;
  label: string;
}

// Form error interface
interface FormErrors {
  img?: string;
  link?: string;
  label?: string;
}

export default function ConfigPage() {
  // Basic configuration state
  const [backgroundImage, setBackgroundImage] = useState("");
  const [saved, setSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Button configuration state
  const [buttons, setButtons] = useState<ButtonConfig[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [form, setForm] = useState<ButtonConfig>({ img: "", link: "", label: "" });
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Window configuration state
  const [fullscreen, setFullscreen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(800);
  const [windowHeight, setWindowHeight] = useState(600);

  // Chrome configuration state
  const [chromeExecutablePath, setChromeExecutablePath] = useState("");
  const [chromeArgs, setChromeArgs] = useState("");

  // Image preview state
  const [imgDataUrls, setImgDataUrls] = useState<{ [path: string]: string }>({});

  // Refs for file inputs
  const buttonImageInputRef = useRef<HTMLInputElement>(null);
  const backgroundImageInputRef = useRef<HTMLInputElement>(null);
  const chromePathInputRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();

  // Load configuration on component mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const cfg = await window.api.getConfig();

        // Set button configuration
        if (cfg && Array.isArray(cfg.buttons)) {
          setButtons(cfg.buttons);
        }

        // Set background image
        if (cfg && typeof cfg.backgroundImage === 'string') {
          setBackgroundImage(cfg.backgroundImage);
        }

        // Set window configuration
        if (cfg && typeof cfg.fullscreen === 'boolean') {
          setFullscreen(cfg.fullscreen);
        }
        if (cfg && typeof cfg.windowWidth === 'number') {
          setWindowWidth(cfg.windowWidth);
        }
        if (cfg && typeof cfg.windowHeight === 'number') {
          setWindowHeight(cfg.windowHeight);
        }

        // Set Chrome configuration
        if (cfg && typeof cfg.chromeExecutablePath === 'string') {
          setChromeExecutablePath(cfg.chromeExecutablePath);
        }
        if (cfg && typeof cfg.chromeArgs === 'string') {
          setChromeArgs(cfg.chromeArgs);
        }
      } catch (err) {
        console.error('Failed to load config:', err);
        setError('Failed to load configuration');
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();

    // Setup navigation handler
    const handler = () => navigate("/");
    window.electron?.ipcRenderer.on("navigate-to-config", handler);

    return () => {
      window.electron?.ipcRenderer.removeListener("navigate-to-config", handler);
    };
  }, [navigate]);

  const saveButtonsToConfig = async (newButtons: ButtonConfig[]) => {
    setButtons(newButtons);
    // Load existing config, merge buttons, then save
    const cfg = await window.api.getConfig();
    const updatedConfig = { ...cfg, buttons: newButtons };
    await window.api.saveConfig(updatedConfig);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const openAddModal = () => {
    setEditIdx(null);
    setForm({ img: "", link: "", label: "" });
    setModalOpen(true);
  };

  const openEditModal = (idx: number) => {
    setEditIdx(idx);
    setForm(buttons[idx]);
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  // Form validation for the button modal
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!form.label || form.label.trim() === "") {
      errors.label = "Label is required";
    }

    if (!form.link || form.link.trim() === "") {
      errors.link = "Link is required";
    } else if (!/^https?:\/\//.test(form.link)) {
      errors.link = "Link must start with http:// or https://";
    }

    if (!form.img || form.img.trim() === "") {
      errors.img = "Image is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleModalSave = () => {
    if (validateForm()) {
      try {
        const newButtons = editIdx === null
          ? [...buttons, form]
          : buttons.map((b, i) => (i === editIdx ? form : b));

        saveButtonsToConfig(newButtons);
        setModalOpen(false);
      } catch (err) {
        console.error('Failed to save button:', err);
        setError('Failed to save button');
        setTimeout(() => setError(null), 3000);
      }
    }
  };

  const handleRemove = (idx: number) => {
    saveButtonsToConfig(buttons.filter((_, i) => i !== idx));
  };

  const handleButtonImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    const ext = file.name.split(".").pop();
    const fileName = `button_${Date.now()}.${ext}`;
    const localPath = await window.api.saveImage(fileName, Array.from(buffer));
    setForm((f) => ({ ...f, img: localPath }));
  };

  const handleBackgroundImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    const ext = file.name.split(".").pop();
    const fileName = `background_${Date.now()}.${ext}`;
    const localPath = await window.api.saveImage(fileName, Array.from(buffer));
    // Load existing config, merge background image path, then save
    const cfg = await window.api.getConfig();
    const updatedConfig = { ...cfg, backgroundImage: localPath };
    await window.api.saveConfig(updatedConfig);
    setBackgroundImage(localPath);
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();

    try {
      // Validate window dimensions
      if (windowWidth < 100 || windowHeight < 100) {
        setError("Window dimensions must be at least 100px");
        setTimeout(() => setError(null), 3000);
        return;
      }

      // Load existing config, merge settings, then save
      const cfg = await window.api.getConfig();
      const updatedConfig: any = {
        ...cfg,
        backgroundImage,
        fullscreen,
        windowWidth,
        windowHeight,
        chromeExecutablePath,
        chromeArgs,
      };

      const success = await window.api.saveConfig(updatedConfig);

      if (success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        setError("Failed to save configuration");
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      console.error('Failed to save configuration:', err);
      setError("Failed to save configuration");
      setTimeout(() => setError(null), 3000);
    }
  };

  // Helper to load image as data URL from main process
  useEffect(() => {
    // Load all button images as data URLs
    const loadImages = async () => {
      if (buttons.length === 0) return;

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

    loadImages();
  }, [buttons]);

  if (isLoading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Loading configuration...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-screen h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-red-600">{error}</p>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-auto flex items-center justify-center">
      <div className="w-full py-8 px-4">
        <Card className="w-full mb-4">
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={(e) => { e.preventDefault(); handleSave(e);}} className="space-y-4">
              <div className="space-y-1">
                <Label>Image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  ref={backgroundImageInputRef}
                  onChange={handleBackgroundImageUpload}
                />
                {form.img && <img src={form.img} alt="Preview" className="w-16 h-16 object-contain mt-2" />}
              </div>
              <div className="space-y-1">
                <Label>Fullscreen</Label>
                <Checkbox
                  checked={fullscreen}
                  onCheckedChange={e => e ? setFullscreen(true) : setFullscreen(false)}
                  className="ml-2"
                />
              </div>
              <div className="space-y-1 flex gap-2">
                <div>
                  <Label>Width</Label>
                  <Input
                    type="number"
                    min={100}
                    value={windowWidth}
                    onChange={e => setWindowWidth(Number(e.target.value))}
                    className="ml-2 w-24"
                  />
                </div>
                <div>
                  <Label>Height</Label>
                  <Input
                    type="number"
                    min={100}
                    value={windowHeight}
                    onChange={e => setWindowHeight(Number(e.target.value))}
                    className="ml-2 w-24"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Chrome Executable Path</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="text"
                    value={chromeExecutablePath}
                    readOnly
                    ref={chromePathInputRef}
                    placeholder="/path/to/chrome"
                  />
                  <Button
                    type="button"
                    onClick={async () => {
                      // Use Electron's dialog to select a file
                      const filePath = await window.api.selectFile({
                        title: 'Select Chrome Executable',
                        properties: ['openFile'],
                        filters: [
                          { name: 'Executables', extensions: ['exe', 'app', 'bin', ''] },
                        ],
                      });
                      if (filePath) setChromeExecutablePath(filePath);
                    }}
                  >Browse</Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Chrome Args (space separated)</Label>
                <Input
                  type="text"
                  value={chromeArgs}
                  onChange={e => setChromeArgs(e.target.value)}
                  placeholder="--incognito --disable-extensions"
                />
              </div>
              <Button type="submit" className="w-full">Save</Button>
              {saved && <p className="text-green-600 text-sm text-center">Config saved!</p>}
            </form>
          </CardContent>
        </Card>

        <Card className="w-full mt-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Quick Links</CardTitle>
              <Button variant="secondary" onClick={openAddModal}>Add Button</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6 justify-start">
              {buttons.map((btn, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2">
                  <Button
                    variant="outline"
                    className="hover:shadow"
                    style={{ width: 128, height: 128 }}
                    onClick={() => window.open(btn.link, "_blank")}
                  >
                    <img src={imgDataUrls[btn.img] || ''} alt={btn.label} className="w-full h-full object-contain" />
                  </Button>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEditModal(idx)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleRemove(idx)}>Remove</Button>
                  </div>
                  <span className="text-xs text-center text-muted-foreground">{btn.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editIdx === null ? "Add Button" : "Edit Button"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>Label</Label>
                <Input
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="Label"
                />
                {formErrors.label && <p className="text-red-600 text-sm">{formErrors.label}</p>}
              </div>
              <div className="space-y-1">
                <Label>Image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  ref={buttonImageInputRef}
                  onChange={handleButtonImageUpload}
                />
                {form.img && <img src={form.img} alt="Preview" className="w-16 h-16 object-contain mt-2" />}
                {formErrors.img && <p className="text-red-600 text-sm">{formErrors.img}</p>}
              </div>
              <div className="space-y-1">
                <Label>Link</Label>
                <Input
                  value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                  placeholder="https://..."
                />
                {formErrors.link && <p className="text-red-600 text-sm">{formErrors.link}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleModalSave}>{editIdx === null ? "Add" : "Save"}</Button>
              <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Separator className="w-full" />

        <div className="flex justify-center">
          <Versions />
        </div>
      </div>
    </div>
  );
}
