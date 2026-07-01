'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Box, RotateCcw, Grid3x3, Eye, Maximize2 } from 'lucide-react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

interface BimViewerProps {
  modelUrl?: string
  onElementSelect?: (elementId: string | null) => void
  highlightedElements?: Set<string>
}

const HIGHLIGHT_COLOR = new THREE.Color(0x6366f1)
const SELECT_COLOR = new THREE.Color(0x818cf8)
const GRID_COLOR = 0x1e1e2e
const GRID_CENTER_COLOR = 0x2d2d44

export function BimViewer({ modelUrl, onElementSelect, highlightedElements }: BimViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | THREE.OrthographicCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const modelRef = useRef<THREE.Group | null>(null)
  const raycasterRef = useRef(new THREE.Raycaster())
  const mouseRef = useRef(new THREE.Vector2())
  const originalMaterialsRef = useRef<Map<string, THREE.Material | THREE.Material[]>>(new Map())
  const animationIdRef = useRef<number>(0)
  const initialCameraStateRef = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null)

  const [isWireframe, setIsWireframe] = useState(false)
  const [isOrtho, setIsOrtho] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)

  // Initialize Three.js scene
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0b0f)
    scene.fog = new THREE.Fog(0x0a0b0f, 50, 200)
    sceneRef.current = scene

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambient)

    const directional = new THREE.DirectionalLight(0xffffff, 0.8)
    directional.position.set(10, 20, 10)
    directional.castShadow = true
    directional.shadow.mapSize.set(2048, 2048)
    directional.shadow.camera.near = 0.5
    directional.shadow.camera.far = 100
    scene.add(directional)

    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3)
    fillLight.position.set(-10, 5, -10)
    scene.add(fillLight)

    // Grid
    const grid = new THREE.GridHelper(100, 100, GRID_CENTER_COLOR, GRID_COLOR)
    grid.material.transparent = true
    grid.material.opacity = 0.4
    scene.add(grid)

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Camera
    const aspect = container.clientWidth / container.clientHeight
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000)
    camera.position.set(15, 12, 15)
    cameraRef.current = camera

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance = 1
    controls.maxDistance = 200
    controls.maxPolarAngle = Math.PI * 0.85
    controls.target.set(0, 0, 0)
    controls.update()
    controlsRef.current = controls

    initialCameraStateRef.current = {
      position: camera.position.clone(),
      target: controls.target.clone(),
    }

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      if (width === 0 || height === 0) return

      renderer.setSize(width, height)

      const cam = cameraRef.current
      if (cam instanceof THREE.PerspectiveCamera) {
        cam.aspect = width / height
        cam.updateProjectionMatrix()
      } else if (cam instanceof THREE.OrthographicCamera) {
        const frustum = 10
        cam.left = -frustum * (width / height)
        cam.right = frustum * (width / height)
        cam.top = frustum
        cam.bottom = -frustum
        cam.updateProjectionMatrix()
      }
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      cancelAnimationFrame(animationIdRef.current)
      controls.dispose()
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
          mats.forEach((m) => m.dispose())
        }
      })
    }
  }, [])

  // Load model
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene || !modelUrl) return

    // Remove old model
    if (modelRef.current) {
      scene.remove(modelRef.current)
      modelRef.current.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
          mats.forEach((m) => m.dispose())
        }
      })
      modelRef.current = null
      originalMaterialsRef.current.clear()
    }

    setLoading(true)
    setLoadProgress(0)

    const loader = new GLTFLoader()
    loader.load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true
            child.receiveShadow = true
            // Store original materials for highlight reset
            originalMaterialsRef.current.set(child.uuid, child.material.clone ? child.material.clone() : child.material)
          }
        })

        scene.add(model)
        modelRef.current = model

        // Auto-fit camera
        fitCameraToModel(model)
        setLoading(false)
      },
      (progress) => {
        if (progress.total > 0) {
          setLoadProgress(Math.round((progress.loaded / progress.total) * 100))
        }
      },
      (error) => {
        console.error('Failed to load BIM model:', error)
        setLoading(false)
      },
    )
  }, [modelUrl])

  // Fit camera to model bounds
  const fitCameraToModel = useCallback((model: THREE.Object3D) => {
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return

    const box = new THREE.Box3().setFromObject(model)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    const distance = maxDim * 2

    controls.target.copy(center)

    if (camera instanceof THREE.PerspectiveCamera) {
      const fov = camera.fov * (Math.PI / 180)
      const cameraDistance = distance / (2 * Math.tan(fov / 2))
      camera.position.set(
        center.x + cameraDistance * 0.7,
        center.y + cameraDistance * 0.5,
        center.z + cameraDistance * 0.7,
      )
    } else {
      camera.position.set(center.x + distance, center.y + distance, center.z + distance)
    }

    camera.updateProjectionMatrix()
    controls.update()

    initialCameraStateRef.current = {
      position: camera.position.clone(),
      target: controls.target.clone(),
    }
  }, [])

  // Handle highlighting
  useEffect(() => {
    const model = modelRef.current
    if (!model) return

    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      const isHighlighted = highlightedElements?.has(child.uuid) || highlightedElements?.has(child.name)
      const isSelected = child.uuid === selectedId || child.name === selectedId

      if (isSelected) {
        applyHighlight(child, SELECT_COLOR, 1.0)
      } else if (isHighlighted) {
        applyHighlight(child, HIGHLIGHT_COLOR, 0.6)
      } else {
        restoreOriginalMaterial(child)
      }
    })
  }, [highlightedElements, selectedId])

  const applyHighlight = (mesh: THREE.Mesh, color: THREE.Color, intensity: number) => {
    const mat = mesh.material
    if (Array.isArray(mat)) {
      mesh.material = mat.map((m) => {
        const clone = (m as THREE.MeshStandardMaterial).clone()
        clone.emissive = color
        clone.emissiveIntensity = intensity
        return clone
      })
    } else {
      const clone = (mat as THREE.MeshStandardMaterial).clone()
      clone.emissive = color
      clone.emissiveIntensity = intensity
      mesh.material = clone
    }
  }

  const restoreOriginalMaterial = (mesh: THREE.Mesh) => {
    const original = originalMaterialsRef.current.get(mesh.uuid)
    if (original) {
      mesh.material = Array.isArray(original)
        ? original.map((m) => m.clone())
        : (original as THREE.Material).clone()
    }
  }

  // Wireframe toggle
  useEffect(() => {
    const model = modelRef.current
    if (!model) return

    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mats = Array.isArray(child.material) ? child.material : [child.material]
        mats.forEach((m) => {
          if ('wireframe' in m) {
            (m as THREE.MeshStandardMaterial).wireframe = isWireframe
          }
        })
      }
    })
  }, [isWireframe])

  // Perspective / Orthographic toggle
  useEffect(() => {
    const container = containerRef.current
    const controls = controlsRef.current
    const oldCamera = cameraRef.current
    if (!container || !controls || !oldCamera) return

    const aspect = container.clientWidth / container.clientHeight

    let newCamera: THREE.PerspectiveCamera | THREE.OrthographicCamera

    if (isOrtho) {
      const frustum = 10
      newCamera = new THREE.OrthographicCamera(
        -frustum * aspect, frustum * aspect,
        frustum, -frustum,
        0.1, 1000,
      )
    } else {
      newCamera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000)
    }

    newCamera.position.copy(oldCamera.position)
    newCamera.quaternion.copy(oldCamera.quaternion)
    newCamera.updateProjectionMatrix()

    cameraRef.current = newCamera
    controls.object = newCamera
    controls.update()
  }, [isOrtho])

  // Click handler for raycasting
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current
    const camera = cameraRef.current
    const model = modelRef.current
    if (!container || !camera || !model) return

    const rect = container.getBoundingClientRect()
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    raycasterRef.current.setFromCamera(mouseRef.current, camera)
    const intersects = raycasterRef.current.intersectObject(model, true)

    if (intersects.length > 0) {
      const hit = intersects[0].object
      const id = hit.name || hit.uuid
      setSelectedId(id)
      onElementSelect?.(id)
    } else {
      setSelectedId(null)
      onElementSelect?.(null)
    }
  }, [onElementSelect])

  // Reset view
  const handleResetView = useCallback(() => {
    const camera = cameraRef.current
    const controls = controlsRef.current
    const saved = initialCameraStateRef.current
    if (!camera || !controls || !saved) return

    camera.position.copy(saved.position)
    controls.target.copy(saved.target)
    controls.update()
  }, [])

  // Toolbar button component
  const ToolbarButton = ({ active, onClick, title, children }: {
    active?: boolean
    onClick: () => void
    title: string
    children: React.ReactNode
  }) => (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'p-1.5 rounded-md transition-all duration-150',
        active
          ? 'bg-indigo-500/20 text-indigo-400 shadow-sm'
          : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/[0.06]',
      )}
    >
      {children}
    </button>
  )

  // View cube component
  const ViewCube = () => {
    const cubeRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
      const canvas = cubeRef.current
      const camera = cameraRef.current
      if (!canvas || !camera) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      let localAnimId: number

      const drawCube = () => {
        localAnimId = requestAnimationFrame(drawCube)

        const w = canvas.width
        const h = canvas.height
        ctx.clearRect(0, 0, w, h)

        // Get camera direction
        const dir = new THREE.Vector3()
        camera.getWorldDirection(dir)

        // Draw compass
        const cx = w / 2
        const cy = h / 2
        const r = w * 0.35

        ctx.strokeStyle = 'rgba(255,255,255,0.1)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.stroke()

        // Axes projected to screen
        const axes = [
          { label: 'N', color: '#ef4444', vec: new THREE.Vector3(0, 0, -1) },
          { label: 'E', color: '#6366f1', vec: new THREE.Vector3(1, 0, 0) },
          { label: 'S', color: '#64748b', vec: new THREE.Vector3(0, 0, 1) },
          { label: 'W', color: '#64748b', vec: new THREE.Vector3(-1, 0, 0) },
        ]

        const up = new THREE.Vector3(0, 1, 0)
        const right = new THREE.Vector3().crossVectors(dir, up).normalize()
        const screenUp = new THREE.Vector3().crossVectors(right, dir).normalize()

        axes.forEach(({ label, color, vec }) => {
          const projX = vec.dot(right)
          const projY = -vec.dot(screenUp)
          const x = cx + projX * r
          const y = cy + projY * r

          ctx.fillStyle = color
          ctx.font = 'bold 10px system-ui'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(label, x, y)
        })
      }

      drawCube()

      return () => {
        cancelAnimationFrame(localAnimId)
      }
    }, [])

    return (
      <canvas
        ref={cubeRef}
        width={64}
        height={64}
        className="absolute bottom-3 right-3 rounded-lg bg-black/30 backdrop-blur-sm border border-white/[0.06]"
      />
    )
  }

  if (!modelUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#f8f9fa] dark:bg-[#0a0b0f] text-center px-8">
        <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface)] dark:bg-white/[0.03] border border-[var(--color-border)]/60 dark:border-white/[0.04] flex items-center justify-center mb-5">
          <Box size={28} className="text-[var(--color-text-secondary)] dark:text-white/20" />
        </div>
        <h3 className="text-sm font-semibold text-[var(--color-text-muted)] dark:text-white/70 mb-1.5">
          No 3D Model
        </h3>
        <p className="text-xs text-[var(--color-text-muted)] dark:text-white/30 max-w-[240px] leading-relaxed">
          Upload IFC or GLB files to visualize the building model in 3D with interactive element selection.
        </p>
      </div>
    )
  }

  return (
    <div className="relative flex flex-col h-full bg-[#f8f9fa] dark:bg-[#0a0b0f] overflow-hidden">
      {/* Toolbar */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-md border border-white/[0.06] shadow-lg"
        >
          <ToolbarButton
            active={isWireframe}
            onClick={() => setIsWireframe((v) => !v)}
            title="Toggle wireframe"
          >
            <Grid3x3 size={14} />
          </ToolbarButton>

          <ToolbarButton
            onClick={handleResetView}
            title="Reset view"
          >
            <RotateCcw size={14} />
          </ToolbarButton>

          <ToolbarButton
            active={isOrtho}
            onClick={() => setIsOrtho((v) => !v)}
            title={isOrtho ? 'Switch to perspective' : 'Switch to orthographic'}
          >
            <Maximize2 size={14} />
          </ToolbarButton>

          <div className="w-px h-4 bg-white/10 mx-0.5" />

          <ToolbarButton
            onClick={() => {
              const model = modelRef.current
              if (model) fitCameraToModel(model)
            }}
            title="Fit to model"
          >
            <Eye size={14} />
          </ToolbarButton>
        </motion.div>
      </AnimatePresence>

      {/* Loading overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0a0b0f]/80 backdrop-blur-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-3 animate-pulse">
              <Box size={20} className="text-indigo-400" />
            </div>
            <p className="text-xs text-white/50 mb-2">Loading model...</p>
            <div className="w-32 h-1 bg-white/[0.06] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-indigo-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${loadProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-[10px] text-white/30 mt-1">{loadProgress}%</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Canvas container */}
      <div
        ref={containerRef}
        className="flex-1 cursor-grab active:cursor-grabbing"
        onClick={handleCanvasClick}
      />

      {/* View cube */}
      <ViewCube />
    </div>
  )
}
