import React, { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'

// Scans a barcode via the device camera using ZXing, with a manual-entry
// fallback if the camera is unavailable, denied, or just not working —
// scanning itself should degrade gracefully, same as everything else here.
export default function BarcodeScanner({ onDetected, onClose }) {
  const videoRef = useRef(null)
  const controlsRef = useRef(null)
  const [error, setError] = useState('')
  const [manualCode, setManualCode] = useState('')
  const [cameraActive, setCameraActive] = useState(true)

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    let cancelled = false

    reader
      .decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        videoRef.current,
        (result, err, controls) => {
          controlsRef.current = controls
          if (cancelled) return
          if (result) {
            cancelled = true
            controls.stop()
            onDetected(result.getText())
          }
          // err fires continuously while no barcode is in view — that's
          // normal scanning noise, not a real failure, so it's ignored here.
        }
      )
      .catch(err => {
        if (cancelled) return
        const denied = err?.name === 'NotAllowedError' || /permission/i.test(err?.message || '')
        setError(
          denied
            ? 'Camera permission denied. You can type the barcode number instead.'
            : "Couldn't access the camera. You can type the barcode number instead."
        )
        setCameraActive(false)
      })

    return () => {
      cancelled = true
      try { controlsRef.current?.stop() } catch { /* already stopped */ }
    }
  }, [onDetected])

  function submitManual() {
    const code = manualCode.trim()
    if (code) onDetected(code)
  }

  return (
    <div className="card" style={{ background: 'var(--surface-2)' }}>
      {cameraActive && (
        <>
          <video ref={videoRef} style={{ width: '100%', borderRadius: 10, marginBottom: 10, background: '#000' }} muted playsInline />
          <p className="muted small" style={{ marginBottom: 14 }}>Point the camera at a barcode.</p>
        </>
      )}
      {error && <p className="small" style={{ color: 'var(--danger)', marginBottom: 10 }}>{error}</p>}
      <div className="field" style={{ marginBottom: 8 }}>
        <label>{cameraActive ? 'Or type the barcode number' : 'Type the barcode number'}</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={manualCode} onChange={e => setManualCode(e.target.value)}
            placeholder="e.g. 034000123456" style={{ flex: 1 }}
            onKeyDown={e => e.key === 'Enter' && submitManual()}
          />
          <button className="secondary" onClick={submitManual}>Look up</button>
        </div>
      </div>
      <button className="secondary" style={{ width: '100%' }} onClick={onClose}>Cancel</button>
    </div>
  )
}
