import { useState, useRef, useEffect } from "react";
import { Camera, Upload, Scan, Loader2, ImagePlus, RefreshCw, CheckCircle, SwitchCamera } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { supabase } from "../supabase";
import { useLanguage } from "./language_context";

interface ScannerPageProps { onScanComplete: (result: any) => void; }

const PAGE_STRINGS = [
  "Medicine Scanner", "Prescription Scanner",
  "Upload or capture an image of your medication for instant identification",
  "Upload or capture an image of a prescription for OCR and safety analysis",
  "💊 Medicine", "📝 Prescription",
  "Drop your medicine image here", "Drop your prescription image here",
  "or click below to browse files", "Upload from Gallery", "Use Camera",
  "💡", "Tips:", "Ensure good lighting, capture the pill strip or bottle clearly, and include any text or codes visible.",
  "🔄 Switch Camera", "📸 Capture Photo", "🔁 Retake", "✅ Confirm & Upload",
  "Analyzing medication...", "AI is identifying the medicine and checking for safety information",
  "OCR Processing", "Database Matching", "Safety Analysis",
];

export function ScannerPage({ onScanComplete }: ScannerPageProps) {
  const { t, language, prime } = useLanguage();

  useEffect(() => {
    if (language !== "English") prime(PAGE_STRINGS);
  }, [language, prime]);

  const [isScanning, setIsScanning] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const API_URL = import.meta.env.VITE_API_URL;
  const [videoKey, setVideoKey] = useState(0);
  const [imageType, setImageType] = useState<"medicine" | "prescription">("medicine");
  const [session, setSession] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [confirmMode, setConfirmMode] = useState(false);

  const stopCamera = () => {
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
  };

  useEffect(() => {
    if (!showCamera || !videoRef.current || !cameraStreamRef.current) return;
    const video = videoRef.current;
    video.srcObject = cameraStreamRef.current;
    const playVideo = async () => { try { await video.play(); } catch (err) { console.error("Video play failed:", err); } };
    if (video.readyState >= 2) { playVideo(); } else { video.onloadedmetadata = playVideo; }
  }, [showCamera, cameraFacing]);

  useEffect(() => {
    const getSession = async () => { const { data } = await supabase.auth.getSession(); setSession(data.session); };
    getSession();
  }, []);

  useEffect(() => { return () => { stopCamera(); clearScanTimeout(); }; }, []);

  const clearScanTimeout = () => { if (scanTimeoutRef.current) { clearTimeout(scanTimeoutRef.current); scanTimeoutRef.current = null; } };

  const handleScanWithImage = async (imageBase64: string) => {
    if (isScanning) return;
    setIsScanning(true);
    clearScanTimeout();
    try {
      scanTimeoutRef.current = setTimeout(() => {
        setIsScanning(false);
        onScanComplete({ name: "Paracetamol", manufacturer: "PharmaCorp Industries", strength: "500mg", type: "Tablet", confidence: 96, image: imageBase64 });
      }, 2500);
    } catch (err) { console.error("Scan failed", err); setIsScanning(false); clearScanTimeout(); }
  };

  const uploadImageFile = async (file: File) => {
    setIsScanning(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("image_type", imageType);
      const res = await fetch(`${API_URL}/images/upload`, { method: "POST", headers: { Authorization: `Bearer ${session?.access_token}` }, body: formData });
      const data = await res.json();
      console.log("Upload response:", data);
      setIsScanning(false);
      if (imageType === "prescription") {
        const rawMedicines = data.ocr_result?.medicines || [];
        onScanComplete({ type: "prescription", doctor_name: data.ocr_result?.doctor_name || null, prescription_date: data.ocr_result?.prescription_date || data.ocr_result?.date || null, diagnosis: data.ocr_result?.diagnosis || null, medicines: rawMedicines.map((m: any) => typeof m === "string" ? { name: m } : m), routes: data.ocr_result?.routes || null, raw_text: data.ocr_result?.raw_text || null, confidence: data.ocr_result?.confidence ?? null, ocr_engine: data.ocr_result?.ocr_engine || null, fallback_used: data.ocr_result?.fallback_used ?? false, needs_review: data.ocr_result?.needs_review ?? false, created_at: data.ocr_result?.created_at || new Date().toISOString() });
      } else {
        onScanComplete({ medicine_name: data.ocr_result?.medicine_name || "Unknown Medicine", manufacturer: data.ocr_result?.composition || "Unknown", strength: data.ocr_result?.dosage || "N/A", type: "medicine", expiry_date: data.ocr_result?.expiry_date || "N/A", precautions: data.ocr_result?.precautions || [], confidence: data.ocr_result?.confidence || 90 });
      }
    } catch (err) { console.error("Upload failed:", err); setIsScanning(false); }
  };

  const handleDrop = async (e: React.DragEvent) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files?.[0]) await uploadImageFile(e.dataTransfer.files[0]); };
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) await uploadImageFile(e.target.files[0]); };

  const handleScan = async () => {
    if (isScanning) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: cameraFacing } });
      cameraStreamRef.current = stream;
      setShowCamera(true);
    } catch (err) { console.error("Camera access error:", err); stopCamera(); }
  };

  const switchCamera = async () => {
    const nextFacing = cameraFacing === "environment" ? "user" : "environment";
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: nextFacing } });
      cameraStreamRef.current = stream;
      setCameraFacing(nextFacing);
      setVideoKey((k) => k + 1);
      setShowCamera(true);
    } catch (err) { console.error("Camera switch failed:", err); }
  };

  const checkImageQuality = (canvas: HTMLCanvasElement): { ok: boolean; reason?: string } => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return { ok: true };
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let sum = 0, sumSq = 0, n = 0;
    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      sum += lum; sumSq += lum * lum; n++;
    }
    const mean = sum / n;
    const variance = sumSq / n - mean * mean;
    if (mean < 30) return { ok: false, reason: "Image is too dark. Move to better lighting." };
    if (variance < 200) return { ok: false, reason: "Image looks blurry or blank. Hold steady and retry." };
    return { ok: true };
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(video, 0, 0);
    const quality = checkImageQuality(canvas);
    if (!quality.ok) toast.warning(quality.reason, { duration: 4000 });
    const imageBase64 = canvas.toDataURL("image/png");
    stopCamera();
    setShowCamera(false);
    setCapturedImage(imageBase64);
    setConfirmMode(true);
  };

  const handleRetake = async () => { setCapturedImage(null); setConfirmMode(false); await handleScan(); };

  const dataURLtoFile = (dataUrl: string, filename: string) => {
    const arr = dataUrl.split(",");
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  };

  const handleConfirmUpload = async () => {
    if (!capturedImage) return;
    setConfirmMode(false);
    setIsScanning(true);
    try {
      const file = dataURLtoFile(capturedImage, "capture.png");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("image_type", imageType);
      const res = await fetch(`${API_URL}/images/upload`, { method: "POST", headers: { Authorization: `Bearer ${session?.access_token}` }, body: formData });
      const data = await res.json();
      console.log("OCR RESULT:", data.ocr_result);
      setIsScanning(false);
      if (imageType === "prescription") {
        const rawMedicines = data.ocr_result?.medicines || [];
        onScanComplete({ type: "prescription", doctor_name: data.ocr_result?.doctor_name || null, prescription_date: data.ocr_result?.prescription_date || data.ocr_result?.date || null, diagnosis: data.ocr_result?.diagnosis || null, medicines: rawMedicines.map((m: any) => typeof m === "string" ? { name: m } : m), routes: data.ocr_result?.routes || null, raw_text: data.ocr_result?.raw_text || null, confidence: data.ocr_result?.confidence != null ? data.ocr_result.confidence / 100 : null, ocr_engine: data.ocr_result?.ocr_engine || null, fallback_used: data.ocr_result?.fallback_used ?? false, needs_review: data.ocr_result?.needs_review ?? false, created_at: data.ocr_result?.created_at || new Date().toISOString() });
      } else {
        onScanComplete({ medicine_name: data.ocr_result?.medicine_name || "Unknown Medicine", manufacturer: data.ocr_result?.composition || "Unknown", strength: data.ocr_result?.dosage || "N/A", type: "medicine", expiry_date: data.ocr_result?.expiry_date || "N/A", precautions: data.ocr_result?.precautions || [], confidence: data.ocr_result?.confidence || 90 });
      }
    } catch (err) { console.error("Upload failed:", err); setIsScanning(false); }
  };

  const scanSteps = ["OCR Processing", "Database Matching", "Safety Analysis"];

  return (
    <div className="min-h-screen molecular-bg px-4 pb-nav" style={{ paddingTop: 'calc(1.5rem + 20px)' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white mb-1">
            {imageType === "medicine" ? t("Medicine Scanner") : t("Prescription Scanner")}
          </h1>
          <p className="text-[#64748B] text-sm">
            {imageType === "medicine"
              ? t("Upload or capture an image of your medication for instant identification")
              : t("Upload or capture an image of a prescription for OCR and safety analysis")}
          </p>
        </div>

        {/* Type tabs */}
        <div className="flex gap-1 p-1 rounded-xl mb-5" style={{ background: 'rgba(17,25,40,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {(["medicine", "prescription"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setImageType(type)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                imageType === type ? "text-white shadow-sm" : "text-[#64748B] hover:text-[#94A3B8]"
              }`}
              style={imageType === type ? { background: 'linear-gradient(135deg, rgba(45,212,191,0.2), rgba(99,102,241,0.15))', border: '1px solid rgba(45,212,191,0.25)' } : {}}
            >
              {type === "medicine" ? "💊 Medicine" : "📝 Prescription"}
            </button>
          ))}
        </div>

        {/* Camera view */}
        {showCamera && !confirmMode && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="mb-5">
            <div className="rounded-2xl overflow-hidden relative" style={{ border: '1px solid rgba(45,212,191,0.2)' }}>
              <video
                key={videoKey}
                ref={videoRef}
                autoPlay playsInline muted
                className={`w-full aspect-video bg-black ${cameraFacing === "user" ? "scale-x-[-1]" : ""}`}
              />
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-[#2DD4BF]/60 rounded-tl" />
                <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-[#2DD4BF]/60 rounded-tr" />
                <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-[#2DD4BF]/60 rounded-bl" />
                <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-[#2DD4BF]/60 rounded-br" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <motion.button whileTap={{ scale: 0.95 }} onClick={switchCamera}
                className="py-3 rounded-xl text-sm font-medium text-[#94A3B8] flex items-center justify-center gap-2 transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <SwitchCamera className="w-4 h-4" /> Switch Camera
              </motion.button>
              <motion.button whileTap={{ scale: 0.95 }} onClick={capturePhoto}
                className="py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #14B8A6, #6366F1)', boxShadow: '0 4px 16px rgba(20,184,166,0.25)' }}>
                <Camera className="w-4 h-4" /> Capture
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Confirm image */}
        {confirmMode && capturedImage && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="mb-5">
            <div className="rounded-2xl overflow-hidden mb-3" style={{ border: '1px solid rgba(255,255,255,0.09)' }}>
              <img src={capturedImage} alt="Captured" className="w-full" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <motion.button whileTap={{ scale: 0.95 }} onClick={handleRetake}
                className="py-3 rounded-xl text-sm font-medium text-[#94A3B8] flex items-center justify-center gap-2"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <RefreshCw className="w-4 h-4" /> Retake
              </motion.button>
              <motion.button whileTap={{ scale: 0.95 }} onClick={handleConfirmUpload}
                className="py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #14B8A6, #6366F1)', boxShadow: '0 4px 16px rgba(20,184,166,0.25)' }}>
                <CheckCircle className="w-4 h-4" /> Upload
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Upload / Scanning interface */}
        <AnimatePresence mode="wait">
          {!isScanning && !confirmMode ? (
            <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                className={`rounded-2xl p-10 text-center mb-4 transition-all duration-300 cursor-pointer ${dragActive ? "scale-[1.01]" : ""}`}
                style={{
                  background: dragActive ? 'rgba(45,212,191,0.06)' : 'rgba(17,25,40,0.5)',
                  border: `2px dashed ${dragActive ? 'rgba(45,212,191,0.5)' : 'rgba(255,255,255,0.08)'}`,
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'rgba(45,212,191,0.08)', border: '1px solid rgba(45,212,191,0.2)' }}>
                  <ImagePlus className="w-8 h-8 text-[#2DD4BF]" />
                </div>
                <p className="text-white font-medium mb-1 text-sm">
                  {imageType === "medicine" ? t("Drop your medicine image here") : t("Drop your prescription image here")}
                </p>
                <p className="text-[#475569] text-xs">{t("or click below to browse files")}</p>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => fileInputRef.current?.click()}
                  className="py-4 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2 transition-all"
                  style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)' }}>
                  <Upload className="w-4 h-4 text-[#818CF8]" />
                  <span>{t("Upload from Gallery")}</span>
                </motion.button>
                <motion.button whileTap={{ scale: 0.96 }} onClick={handleScan}
                  className="py-4 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #14B8A6, #6366F1)', boxShadow: '0 4px 16px rgba(20,184,166,0.25)' }}>
                  <Camera className="w-4 h-4" />
                  <span>{t("Use Camera")}</span>
                </motion.button>
              </div>

              {/* Tips */}
              <div className="rounded-xl px-4 py-3 flex items-start gap-2" style={{ background: 'rgba(45,212,191,0.04)', border: '1px solid rgba(45,212,191,0.12)' }}>
                <span className="text-sm shrink-0">💡</span>
                <p className="text-[#64748B] text-xs leading-relaxed">
                  <span className="text-[#2DD4BF] font-medium">Tip: </span>
                  {t("Ensure good lighting, capture the pill strip or bottle clearly, and include any text or codes visible.")}
                </p>
              </div>
            </motion.div>
          ) : isScanning ? (
            <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="rounded-2xl p-8 text-center" style={{ background: 'rgba(17,25,40,0.7)', border: '1px solid rgba(45,212,191,0.15)' }}>
              {/* Scanning animation */}
              <div className="relative w-24 h-24 mx-auto mb-6">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-2 border-transparent"
                  style={{ borderTopColor: '#2DD4BF', borderRightColor: 'rgba(45,212,191,0.3)' }}
                />
                <div className="absolute inset-3 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(45,212,191,0.08)', border: '1px solid rgba(45,212,191,0.2)' }}>
                  <Scan className="w-8 h-8 text-[#2DD4BF]" />
                </div>
              </div>

              <p className="text-white font-semibold mb-1">{t("Analyzing medication...")}</p>
              <p className="text-[#64748B] text-sm mb-6">{t("AI is identifying the medicine and checking for safety information")}</p>

              <div className="space-y-2 text-left max-w-48 mx-auto">
                {scanSteps.map((step, i) => (
                  <motion.div key={step}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.5 }}
                    className="flex items-center gap-2.5">
                    <motion.div
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.5 }}
                      className="w-1.5 h-1.5 rounded-full bg-[#2DD4BF]"
                    />
                    <span className="text-[#64748B] text-xs">{t(step)}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
