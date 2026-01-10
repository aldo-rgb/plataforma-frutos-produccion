"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { io, Socket } from "socket.io-client"
import { 
  QrCode, 
  Nfc, 
  Check, 
  X, 
  Loader2, 
  Wifi, 
  WifiOff,
  Volume2,
  Vibrate,
  Camera,
  Keyboard,
  User,
  Zap
} from "lucide-react"
import { Html5Qrcode } from "html5-qrcode"

type ScanMode = "qr" | "nfc" | "manual"
type ScanResult = "idle" | "scanning" | "success" | "error" | "already"

interface ScanResponse {
  success: boolean
  alreadyRegistered?: boolean
  message: string
  participant?: {
    id: number
    nombre: string
    image?: string
  }
  stats?: {
    crossedCount: number
    totalParticipants: number
  }
}

export default function StaffScanPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const sessionId = params?.sessionId as string || searchParams?.get("session") || ""
  
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [scanMode, setScanMode] = useState<ScanMode>("qr")
  const [scanResult, setScanResult] = useState<ScanResult>("idle")
  const [lastScanned, setLastScanned] = useState<ScanResponse | null>(null)
  const [manualCode, setManualCode] = useState("")
  const [scanning, setScanning] = useState(false)
  const [totalScanned, setTotalScanned] = useState(0)
  const [sessionActive, setSessionActive] = useState(false)
  
  const qrScannerRef = useRef<Html5Qrcode | null>(null)
  const videoRef = useRef<HTMLDivElement>(null)

  // Conectar Socket.IO
  useEffect(() => {
    if (!sessionId) return

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000"
    const newSocket = io(socketUrl, {
      transports: ["websocket", "polling"]
    })

    newSocket.on("connect", () => {
      setConnected(true)
      newSocket.emit("join_crossing_staff", { sessionId, staffId: "staff" })
    })

    newSocket.on("disconnect", () => {
      setConnected(false)
    })

    newSocket.on("crossing_session_status", (data) => {
      setSessionActive(data.status === "ACTIVE")
    })

    newSocket.on("crossing_stats_update", (data) => {
      setTotalScanned(data.crossedCount)
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [sessionId])

  // Inicializar escáner QR
  const startQRScanner = useCallback(async () => {
    if (!videoRef.current || qrScannerRef.current) return

    try {
      const html5QrCode = new Html5Qrcode("qr-reader")
      qrScannerRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          handleScan(decodedText, "QR")
        },
        () => {} // Ignorar errores de escaneo continuo
      )
    } catch (err) {
      console.error("Error iniciando cámara:", err)
    }
  }, [])

  // Detener escáner QR
  const stopQRScanner = useCallback(async () => {
    if (qrScannerRef.current) {
      try {
        await qrScannerRef.current.stop()
        qrScannerRef.current = null
      } catch (err) {
        console.error("Error deteniendo cámara:", err)
      }
    }
  }, [])

  // Manejar cambio de modo
  useEffect(() => {
    if (scanMode === "qr") {
      startQRScanner()
    } else {
      stopQRScanner()
    }

    return () => {
      stopQRScanner()
    }
  }, [scanMode, startQRScanner, stopQRScanner])

  // Vibrar dispositivo
  const vibrate = (pattern: number | number[]) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(pattern)
    }
  }

  // Procesar escaneo
  const handleScan = async (code: string, method: string) => {
    if (scanning || !code.trim()) return

    setScanning(true)
    setScanResult("scanning")

    try {
      const res = await fetch("/api/el-cruce/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          participantCode: code.trim(),
          scanMethod: method
        })
      })

      const data: ScanResponse = await res.json()

      if (res.ok && data.success) {
        if (data.alreadyRegistered) {
          setScanResult("already")
          vibrate([100, 50, 100])
        } else {
          setScanResult("success")
          vibrate(200) // Vibración de éxito
        }
        setLastScanned(data)
        if (data.stats) {
          setTotalScanned(data.stats.crossedCount)
        }
      } else {
        setScanResult("error")
        vibrate([100, 100, 100, 100, 100]) // Vibración de error
        setLastScanned({ success: false, message: data.message || "Error" } as ScanResponse)
      }
    } catch (error) {
      setScanResult("error")
      vibrate([100, 100, 100, 100, 100])
      setLastScanned({ success: false, message: "Error de conexión" } as ScanResponse)
    }

    setScanning(false)
    setManualCode("")

    // Resetear después de 2 segundos
    setTimeout(() => {
      setScanResult("idle")
      setLastScanned(null)
    }, 2000)
  }

  // Enviar código manual
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualCode.trim()) {
      handleScan(manualCode.trim(), "MANUAL")
    }
  }

  // Color de fondo según resultado
  const getBgColor = () => {
    switch (scanResult) {
      case "success": return "bg-green-500"
      case "error": return "bg-red-500"
      case "already": return "bg-yellow-500"
      case "scanning": return "bg-blue-500"
      default: return "bg-slate-900"
    }
  }

  return (
    <motion.div 
      className={`min-h-screen transition-colors duration-300 ${getBgColor()}`}
      animate={{ backgroundColor: getBgColor() }}
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-amber-400" />
          <span className="font-bold text-white">El Cruce</span>
        </div>
        
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
          connected ? "bg-green-500/30 text-green-300" : "bg-red-500/30 text-red-300"
        }`}>
          {connected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          {connected ? "Conectado" : "Sin conexión"}
        </div>
      </div>

      {/* Contador */}
      <div className="text-center py-4">
        <p className="text-white/60 text-sm">Total escaneados</p>
        <p className="text-4xl font-bold text-white">{totalScanned}</p>
      </div>

      {/* Área principal de resultado */}
      <AnimatePresence mode="wait">
        {scanResult !== "idle" && scanResult !== "scanning" ? (
          <motion.div
            key="result"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <motion.div
              className={`w-32 h-32 rounded-full flex items-center justify-center ${
                scanResult === "success" ? "bg-green-400" :
                scanResult === "already" ? "bg-yellow-400" : "bg-red-400"
              }`}
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.3 }}
            >
              {scanResult === "success" ? (
                <Check className="w-16 h-16 text-white" />
              ) : scanResult === "already" ? (
                <User className="w-16 h-16 text-white" />
              ) : (
                <X className="w-16 h-16 text-white" />
              )}
            </motion.div>
            
            <motion.p
              className="text-3xl font-bold text-white mt-6"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {scanResult === "success" ? "PRE-REGISTRO OK" :
               scanResult === "already" ? "YA REGISTRADO" : "ERROR"}
            </motion.p>
            
            {lastScanned?.participant && (
              <motion.p
                className="text-xl text-white/80 mt-2"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {lastScanned.participant.nombre}
              </motion.p>
            )}
          </motion.div>
        ) : scanResult === "scanning" ? (
          <motion.div
            key="scanning"
            className="flex flex-col items-center justify-center py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Loader2 className="w-16 h-16 text-white animate-spin" />
            <p className="text-xl text-white mt-4">Procesando...</p>
          </motion.div>
        ) : (
          <motion.div
            key="scanner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4"
          >
            {/* Selector de modo */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setScanMode("qr")}
                className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors ${
                  scanMode === "qr" 
                    ? "bg-amber-500 text-white" 
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                <Camera className="w-5 h-5" />
                QR
              </button>
              <button
                onClick={() => setScanMode("nfc")}
                className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors ${
                  scanMode === "nfc" 
                    ? "bg-amber-500 text-white" 
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                <Nfc className="w-5 h-5" />
                NFC
              </button>
              <button
                onClick={() => setScanMode("manual")}
                className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors ${
                  scanMode === "manual" 
                    ? "bg-amber-500 text-white" 
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                <Keyboard className="w-5 h-5" />
                Manual
              </button>
            </div>

            {/* Área de escaneo */}
            {scanMode === "qr" && (
              <div className="bg-black rounded-2xl overflow-hidden aspect-square">
                <div id="qr-reader" ref={videoRef} className="w-full h-full" />
              </div>
            )}

            {scanMode === "nfc" && (
              <div className="bg-slate-800 rounded-2xl p-8 aspect-square flex flex-col items-center justify-center">
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Nfc className="w-24 h-24 text-amber-400" />
                </motion.div>
                <p className="text-white text-lg mt-4">Acerca el gafete NFC</p>
                <p className="text-slate-500 text-sm mt-2">
                  El dispositivo debe tener NFC habilitado
                </p>
              </div>
            )}

            {scanMode === "manual" && (
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="Ingresa el código del gafete"
                  className="w-full px-4 py-4 bg-slate-800 border border-slate-700 rounded-xl text-white text-center text-xl font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  autoFocus
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={!manualCode.trim() || scanning}
                  className="w-full py-4 bg-amber-500 text-white rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ESCANEAR
                </button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer con estado de sesión */}
      <div className="fixed bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
        <div className={`text-center py-2 rounded-full ${
          sessionActive 
            ? "bg-green-500/30 text-green-300" 
            : "bg-yellow-500/30 text-yellow-300"
        }`}>
          {sessionActive ? "🔴 Sesión activa - Listo para escanear" : "⏳ Esperando inicio de sesión"}
        </div>
      </div>
    </motion.div>
  )
}
