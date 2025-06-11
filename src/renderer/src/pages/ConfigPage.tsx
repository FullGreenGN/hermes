import { useState, useEffect, useRef } from "react";
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
import {Checkbox} from "@/components/ui/checkbox";

interface ButtonConfig {
  img: string;
  link: string;
  label: string;
}

export default function ConfigPage() {
  const [configValue, setConfigValue] = useState("");
  const [saved, setSaved] = useState(false);
  const [buttons, setButtons] = useState<ButtonConfig[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [form, setForm] = useState({ img: "", link: "", label: "" });
  const [fullscreen, setFullscreen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(800);
  const [windowHeight, setWindowHeight] = useState(600);
  const [chromeExecutablePath, setChromeExecutablePath] = useState("");
  const [chromeArgs, setChromeArgs] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chromePathInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    window.api.getConfig().then((cfg: any) => {
      if (cfg && Array.isArray(cfg.buttons)) setButtons(cfg.buttons);
      if (cfg && typeof cfg.backgroundImage === 'string') setConfigValue(cfg.backgroundImage);
      if (cfg && typeof cfg.fullscreen === 'boolean') setFullscreen(cfg.fullscreen);
      if (cfg && typeof cfg.windowWidth === 'number') setWindowWidth(cfg.windowWidth);
      if (cfg && typeof cfg.windowHeight === 'number') setWindowHeight(cfg.windowHeight);
      if (cfg && typeof cfg.chromeExecutablePath === 'string') setChromeExecutablePath(cfg.chromeExecutablePath);
      if (cfg && typeof cfg.chromeArgs === 'string') setChromeArgs(cfg.chromeArgs);
    });
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

  const handleModalSave = () => {
    if (form.img && form.link && form.label) {
      const newButtons = editIdx === null
        ? [...buttons, form]
        : buttons.map((b, i) => (i === editIdx ? form : b));
      saveButtonsToConfig(newButtons);
      setModalOpen(false);
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
    setConfigValue(localPath);
  }

  const handleSave = async () => {
    // Load existing config, merge background image path, fullscreen, window size, chrome path/args, then save
    const cfg = await window.api.getConfig();
    const updatedConfig = {
      ...cfg,
      backgroundImage: configValue,
      fullscreen,
      windowWidth,
      windowHeight,
      chromeExecutablePath,
      chromeArgs,
    };
    await window.api.saveConfig(updatedConfig);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Helper to load image as data URL from main process
  const [imgDataUrls, setImgDataUrls] = useState<{ [path: string]: string }>({});

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
    <div className="w-screen h-screen flex items-center justify-center">
      <div className="w-full max-w-lg">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={(e) => { e.preventDefault(); handleSave();}} className="space-y-4">
              <div className="space-y-1">
                <Label>Image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
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
              </div>
              <div className="space-y-1">
                <Label>Image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleButtonImageUpload}
                />
                {form.img && <img src={form.img} alt="Preview" className="w-16 h-16 object-contain mt-2" />}
              </div>
              <div className="space-y-1">
                <Label>Link</Label>
                <Input
                  value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                  placeholder="https://..."
                />
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
