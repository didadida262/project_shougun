import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useRef, useMemo, useEffect, useState } from 'react'
import tankModel from '@/models/tank1.glb?url'

// 网格地面组件
function GridGround() {
  return (
    <>
      {/* 网格辅助线 - 使用更亮的颜色 */}
      <gridHelper args={[20, 20, '#00aaff', '#0066cc']} position={[0, 0, 0]} />
      {/* 地面平面 - 使用炫酷的蓝色/紫色渐变效果 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial 
          color="#1a1a3a"
          metalness={0.8}
          roughness={0.2}
          emissive="#001144"
          emissiveIntensity={0.3}
        />
      </mesh>
    </>
  )
}

// 键盘控制Hook
function useKeyboardControls() {
  const [keys, setKeys] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      setKeys((prev) => ({ ...prev, [event.key.toLowerCase()]: true }))
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      setKeys((prev) => ({ ...prev, [event.key.toLowerCase()]: false }))
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  return keys
}

// 坦克模型组件
function Tank() {
  const { scene } = useGLTF(tankModel)
  const tankRef = useRef<THREE.Group>(null)
  const keys = useKeyboardControls()
  const moveSpeed = 0.1
  
  // 克隆场景以避免共享引用
  const clonedScene = useMemo(() => {
    const cloned = scene.clone()
    
    // 计算模型的边界框，用于确定位置
    const box = new THREE.Box3().setFromObject(cloned)
    const center = box.getCenter(new THREE.Vector3())
    const min = box.min
    
    // 遍历所有网格，启用阴影和增强材质
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true
        child.receiveShadow = true
        
        // 增强材质，让模型更亮
        if (child.material instanceof THREE.MeshStandardMaterial) {
          child.material.metalness = 0.3
          child.material.roughness = 0.5
        }
      }
    })
    
    // 将模型底部对齐到地面（Y=0）
    // 先移动到原点，然后向上移动最小Y值的绝对值，使底部贴地
    cloned.position.set(-center.x, -min.y, -center.z)
    
    return cloned
  }, [scene])

  // 处理移动
  useFrame(() => {
    if (!tankRef.current) return

    const moveVector = new THREE.Vector3()
    let isMoving = false

    // 处理WASD和方向键
    // W/↑ - 前进
    if (keys['w'] || keys['arrowup']) {
      moveVector.z -= moveSpeed
      isMoving = true
    }
    // S/↓ - 后退
    if (keys['s'] || keys['arrowdown']) {
      moveVector.z += moveSpeed
      isMoving = true
    }
    // A/← - 左移
    if (keys['a'] || keys['arrowleft']) {
      moveVector.x -= moveSpeed
      isMoving = true
    }
    // D/→ - 右移
    if (keys['d'] || keys['arrowright']) {
      moveVector.x += moveSpeed
      isMoving = true
    }

    // 应用移动（在坦克的本地坐标系中）
    if (isMoving) {
      // 根据坦克的旋转方向移动
      const direction = new THREE.Vector3()
      tankRef.current.getWorldDirection(direction)
      
      // 计算前进方向（Z轴负方向）
      const forward = new THREE.Vector3(0, 0, -1)
      forward.applyQuaternion(tankRef.current.quaternion)
      
      // 计算右方向（X轴正方向）
      const right = new THREE.Vector3(1, 0, 0)
      right.applyQuaternion(tankRef.current.quaternion)

      // 组合移动向量
      const worldMove = new THREE.Vector3()
      worldMove.addScaledVector(forward, -moveVector.z) // 前进/后退
      worldMove.addScaledVector(right, moveVector.x) // 左右移动

      // 更新位置
      tankRef.current.position.add(worldMove)
    }

    // 限制移动范围（可选，防止坦克移出场景）
    tankRef.current.position.x = Math.max(-9, Math.min(9, tankRef.current.position.x))
    tankRef.current.position.z = Math.max(-9, Math.min(9, tankRef.current.position.z))
  })

  return (
    <group ref={tankRef}>
      <primitive
        object={clonedScene}
        scale={[1, 1, 1]}
        rotation={[0, 0, 0]}
      />
    </group>
  )
}

// 主场景组件
export default function Scene3D() {
  return (
    <div className="w-full h-screen bg-black">
      <Canvas
        camera={{ position: [0, 6, 0], fov: 50 }}
        gl={{ antialias: true }}
        onCreated={(state) => {
          // 设置黑色背景
          state.gl.setClearColor('#000000', 1)
          // 启用阴影
          state.gl.shadowMap.enabled = true
          state.gl.shadowMap.type = THREE.PCFSoftShadowMap
          // 设置相机朝向坦克（俯视角度）
          state.camera.lookAt(0, 0, 0)
        }}
      >
        {/* 鼠标控制 - 支持拖拽旋转、滚轮缩放 */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={1}
          maxDistance={10}
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 2}
          zoomSpeed={0.5}
          target={[0, 0, 0]}
        />

        {/* 环境光 - 增强基础照明 */}
        <ambientLight intensity={0.6} />

        {/* 主方向光 - 从上方照射，增强亮度 */}
        <directionalLight
          position={[5, 10, 5]}
          intensity={2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />

        {/* 补充方向光 - 从另一侧照射，减少阴影 */}
        <directionalLight
          position={[-5, 8, -5]}
          intensity={1}
          color="#ffffff"
        />

        {/* 周围点光源 - 四个方向，增强亮度 */}
        <pointLight position={[10, 5, 0]} intensity={1} color="#ffffff" />
        <pointLight position={[-10, 5, 0]} intensity={1} color="#ffffff" />
        <pointLight position={[0, 5, 10]} intensity={1} color="#ffffff" />
        <pointLight position={[0, 5, -10]} intensity={1} color="#ffffff" />

        {/* 顶部点光源 - 增强亮度 */}
        <pointLight position={[0, 10, 0]} intensity={0.8} color="#ffffff" />
        
        {/* 坦克上方的聚光灯 */}
        <spotLight
          position={[0, 8, 0]}
          angle={0.5}
          penumbra={0.5}
          intensity={2}
          castShadow
          target-position={[0, 0, 0]}
        />

        {/* 网格地面 */}
        <GridGround />

        {/* 坦克模型 */}
        <Tank />
      </Canvas>
    </div>
  )
}

