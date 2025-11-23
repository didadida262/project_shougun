import { Canvas, useFrame, useThree } from '@react-three/fiber'
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
  const keyJustPressedRef = useRef<Record<string, boolean>>({})

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 处理空格键
      if (event.code === 'Space') {
        event.preventDefault() // 防止页面滚动
        const key = ' '
        setKeys((prev) => {
          // 如果是新按下的键，标记为刚刚按下
          if (!prev[key]) {
            keyJustPressedRef.current[key] = true
            keyJustPressedRef.current['space'] = true
          }
          return { ...prev, [key]: true, space: true }
        })
        return
      }
      
      const key = event.key.toLowerCase()
      setKeys((prev) => {
        // 如果是新按下的键，标记为刚刚按下
        if (!prev[key]) {
          keyJustPressedRef.current[key] = true
        }
        return { ...prev, [key]: true }
      })
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      // 处理空格键
      if (event.code === 'Space') {
        const key = ' '
        setKeys((prev) => ({ ...prev, [key]: false, space: false }))
        keyJustPressedRef.current[key] = false
        keyJustPressedRef.current['space'] = false
        return
      }
      
      const key = event.key.toLowerCase()
      setKeys((prev) => ({ ...prev, [key]: false }))
      keyJustPressedRef.current[key] = false
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  return { keys, keyJustPressedRef }
}

// 炮弹组件
interface ProjectileProps {
  position: THREE.Vector3
  direction: THREE.Vector3
  onRemove: () => void
}

function Projectile({ position, direction, onRemove }: ProjectileProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const trailGeometryRef = useRef<THREE.BufferGeometry>(null)
  const velocity = useRef(new THREE.Vector3(direction.x * 40, direction.y * 40, direction.z * 40))
  const lifetime = useRef(0)
  const trailPoints = useRef<THREE.Vector3[]>([])
  const maxTrailLength = 50 // 轨迹最大点数（增加以显示更长的轨迹）

  // 初始化轨迹
  useEffect(() => {
    trailPoints.current = [position.clone()]
    if (trailGeometryRef.current) {
      trailGeometryRef.current.setFromPoints(trailPoints.current)
    }
  }, [])

  useFrame((_, delta) => {
    if (!meshRef.current) return

    // 更新位置
    const moveDelta = velocity.current.clone().multiplyScalar(delta)
    meshRef.current.position.add(moveDelta)

    // 添加重力
    velocity.current.y -= 9.8 * delta

    // 更新轨迹
    trailPoints.current.push(meshRef.current.position.clone())
    if (trailPoints.current.length > maxTrailLength) {
      trailPoints.current.shift()
    }

    // 更新轨迹线
    if (trailGeometryRef.current && trailPoints.current.length > 1) {
      trailGeometryRef.current.setFromPoints(trailPoints.current)
    }

    // 更新生命周期
    lifetime.current += delta
    if (lifetime.current > 5 || meshRef.current.position.y < -1) {
      if (trailGeometryRef.current) {
        trailGeometryRef.current.dispose()
      }
      onRemove()
    }
  })

  return (
    <group>
      {/* 轨迹线 */}
      {trailPoints.current.length > 1 && (
        <line>
          <bufferGeometry ref={trailGeometryRef} />
          <lineBasicMaterial
            color="#ffaa00"
            linewidth={3}
            transparent
            opacity={0.8}
          />
        </line>
      )}
      {/* 炮弹 */}
      <mesh ref={meshRef} position={position} castShadow>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshStandardMaterial
          color="#ffaa00"
          emissive="#ff6600"
          emissiveIntensity={2}
          metalness={0.3}
          roughness={0.3}
        />
      </mesh>
    </group>
  )
}

// 烟雾和火焰粒子效果
interface MuzzleFlashProps {
  position: THREE.Vector3
  onComplete: () => void
}

function MuzzleFlash({ position, onComplete }: MuzzleFlashProps) {
  const groupRef = useRef<THREE.Group>(null)
  const lifetime = useRef(0)
  const particleCount = 15
  const smokeCount = 20

  // 创建粒子数组
  const [particles] = useState(() => {
    return Array.from({ length: particleCount }, () => ({
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      scale: 1,
      opacity: 1,
    }))
  })

  const [smokeParticles] = useState(() => {
    return Array.from({ length: smokeCount }, () => ({
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      scale: 1,
      opacity: 0.6,
    }))
  })

  // 初始化粒子 - 从炮口位置开始
  useEffect(() => {
    particles.forEach((p) => {
      // 粒子从炮口位置（原点）开始，稍微随机偏移
      const angle = Math.random() * Math.PI * 2
      const radius = Math.random() * 0.05
      p.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        Math.random() * 0.05
      )
      // 速度主要向前和向上
      p.velocity.set(
        (Math.random() - 0.5) * 0.3,
        Math.random() * 0.4 + 0.2,
        (Math.random() - 0.5) * 0.2
      )
    })

    smokeParticles.forEach((p) => {
      // 烟雾从炮口位置开始
      const angle = Math.random() * Math.PI * 2
      const radius = Math.random() * 0.08
      p.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        (Math.random() - 0.5) * 0.05
      )
      // 烟雾主要向上扩散
      p.velocity.set(
        (Math.random() - 0.5) * 0.2,
        Math.random() * 0.3 + 0.1,
        (Math.random() - 0.5) * 0.15
      )
    })
  }, [])

  const fireMeshesRef = useRef<THREE.Mesh[]>([])
  const smokeMeshesRef = useRef<THREE.Mesh[]>([])

  useFrame((_, delta) => {
    if (!groupRef.current) return

    lifetime.current += delta

    // 更新火焰粒子
    particles.forEach((p, i) => {
      p.position.addScaledVector(p.velocity, delta)
      p.velocity.multiplyScalar(0.95) // 阻力
      p.scale = Math.max(0, 1 - lifetime.current * 4)
      p.opacity = Math.max(0, 1 - lifetime.current * 3)
      
      if (fireMeshesRef.current[i]) {
        fireMeshesRef.current[i].position.copy(p.position)
        fireMeshesRef.current[i].scale.setScalar(p.scale * 0.1)
        const material = fireMeshesRef.current[i].material as THREE.MeshStandardMaterial
        if (material) {
          material.opacity = p.opacity
        }
      }
    })

    // 更新烟雾粒子
    smokeParticles.forEach((p, i) => {
      p.position.addScaledVector(p.velocity, delta)
      p.velocity.multiplyScalar(0.98) // 阻力
      p.scale = 1 + lifetime.current * 1.5
      p.opacity = Math.max(0, 0.6 - lifetime.current * 1.5)
      
      if (smokeMeshesRef.current[i]) {
        smokeMeshesRef.current[i].position.copy(p.position)
        smokeMeshesRef.current[i].scale.setScalar(p.scale * 0.15)
        const material = smokeMeshesRef.current[i].material as THREE.MeshStandardMaterial
        if (material) {
          material.opacity = p.opacity
        }
      }
    })

    if (lifetime.current > 0.6) {
      onComplete()
    }
  })

  return (
    <group ref={groupRef} position={position}>
      {/* 火焰粒子 */}
      {particles.map((p, i) => (
        <mesh
          key={`fire-${i}`}
          ref={(el) => {
            if (el) fireMeshesRef.current[i] = el
          }}
        >
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial
            color="#ff6600"
            emissive="#ff3300"
            emissiveIntensity={2}
            transparent
            opacity={p.opacity}
          />
        </mesh>
      ))}
      {/* 烟雾粒子 */}
      {smokeParticles.map((p, i) => (
        <mesh
          key={`smoke-${i}`}
          ref={(el) => {
            if (el) smokeMeshesRef.current[i] = el
          }}
        >
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial
            color="#666666"
            transparent
            opacity={p.opacity}
          />
        </mesh>
      ))}
    </group>
  )
}

// 坦克模型组件
function Tank({ onFire, tankRef }: { onFire: (position: THREE.Vector3, direction: THREE.Vector3) => void; tankRef: React.RefObject<THREE.Group> }) {
  const { scene } = useGLTF(tankModel)
  const { keys, keyJustPressedRef } = useKeyboardControls()
  const moveSpeed = 0.03 // 降低移动速度，更真实
  const velocity = useRef(new THREE.Vector3())
  const targetVelocity = useRef(new THREE.Vector3())
  const acceleration = 0.1 // 降低加速度，启动更慢
  const deceleration = 0.15 // 降低减速度，停止更慢
  const lastFireTime = useRef(0)
  
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

  // 处理移动和开火
  useFrame((_, delta) => {
    if (!tankRef.current) return

    // 处理开火（空格键）
    const currentTime = Date.now()
    const spaceKey = keys[' '] || keys['space']
    const spaceJustPressed = keyJustPressedRef.current[' '] || keyJustPressedRef.current['space']
    
    // 检查是否可以开火
    if (spaceKey && spaceJustPressed) {
      if (currentTime - lastFireTime.current > 500) {
        lastFireTime.current = currentTime
        
        // 计算炮口位置（在坦克前方，稍微向上）
        const forward = new THREE.Vector3(0, 0, 1)
        forward.applyQuaternion(tankRef.current.quaternion)
        
        // 炮口位置：通过模型边界框动态计算
        // 获取坦克模型的边界框
        const box = new THREE.Box3().setFromObject(tankRef.current)
        const max = box.max
        const min = box.min
        
        // 计算炮口位置：在坦克本地坐标系中
        // 炮管通常在炮塔上方（高度约在模型的上半部分），向前延伸
        // 使用更保守的偏移值
        const localMuzzleOffset = new THREE.Vector3(
          0, // 左右居中
          (max.y - min.y) * 0.45, // 高度：从底部向上45%的位置（降低高度）
          (max.z - min.z) * 0.45 // 前方：从中心向前45%的位置（炮管延伸）
        )
        
        // 将本地偏移转换为世界坐标
        localMuzzleOffset.applyQuaternion(tankRef.current.quaternion)
        
        // 炮口位置 = 坦克位置 + 本地偏移
        const muzzlePosition = new THREE.Vector3()
        muzzlePosition.copy(tankRef.current.position)
        muzzlePosition.add(localMuzzleOffset)
        
        // 开火方向（沿炮管方向）
        const fireDirection = forward.clone().normalize()
        
        onFire(muzzlePosition, fireDirection)
      }
      
      // 清除刚刚按下标记，避免连续触发
      keyJustPressedRef.current[' '] = false
      keyJustPressedRef.current['space'] = false
    }

    // 计算目标速度（在本地坐标系中）
    const localTargetVelocity = new THREE.Vector3()
    
    // 处理WASD和方向键
    // W/↑ - 前进（沿炮管方向）
    if (keys['w'] || keys['arrowup']) {
      localTargetVelocity.z -= moveSpeed
    }
    // S/↓ - 后退
    if (keys['s'] || keys['arrowdown']) {
      localTargetVelocity.z += moveSpeed
    }
    // A/← - 左移
    if (keys['a'] || keys['arrowleft']) {
      localTargetVelocity.x -= moveSpeed
    }
    // D/→ - 右移
    if (keys['d'] || keys['arrowright']) {
      localTargetVelocity.x += moveSpeed
    }

    // 将本地速度转换为世界速度
    const forward = new THREE.Vector3(0, 0, 1)
    forward.applyQuaternion(tankRef.current.quaternion)
    
    const right = new THREE.Vector3(1, 0, 0)
    right.applyQuaternion(tankRef.current.quaternion)

    // 计算世界坐标系中的目标速度
    targetVelocity.current.set(0, 0, 0)
    targetVelocity.current.addScaledVector(forward, -localTargetVelocity.z)
    targetVelocity.current.addScaledVector(right, -localTargetVelocity.x)

    // 平滑插值当前速度到目标速度
    const targetSpeed = targetVelocity.current.length()
    
    if (targetSpeed > 0) {
      // 加速
      velocity.current.lerp(targetVelocity.current, acceleration)
    } else {
      // 减速
      velocity.current.lerp(new THREE.Vector3(0, 0, 0), deceleration)
    }

    // 应用速度到位置（使用deltaTime确保帧率无关）
    const moveDelta = velocity.current.clone().multiplyScalar(delta * 60) // 60是基准帧率
    tankRef.current.position.add(moveDelta)

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

// 相机跟随组件
function CameraFollow({ tankRef }: { tankRef: React.RefObject<THREE.Group> }) {
  const controlsRef = useRef<any>(null)
  const { camera } = useThree()

  useFrame(() => {
    if (!tankRef.current || !controlsRef.current) return

    // 获取坦克位置
    const tankPosition = tankRef.current.position.clone()
    
    // 计算炮口方向（坦克的前方）
    const forward = new THREE.Vector3(0, 0, 1)
    forward.applyQuaternion(tankRef.current.quaternion)
    
    // 更新OrbitControls的目标为坦克位置
    controlsRef.current.target.lerp(tankPosition, 0.1)
    
    // 计算相机应该看向的方向（炮口方向）
    const lookDirection = forward.clone().normalize()
    const lookAtPosition = tankPosition.clone().add(lookDirection.multiplyScalar(2))
    
    // 平滑地让相机朝向炮口方向
    const currentLookAt = new THREE.Vector3()
    camera.getWorldDirection(currentLookAt)
    currentLookAt.multiplyScalar(2).add(camera.position)
    
    const targetLookAt = lookAtPosition
    const smoothedLookAt = currentLookAt.lerp(targetLookAt, 0.05)
    
    // 更新相机朝向
    camera.lookAt(smoothedLookAt)
  })

  return <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.05} minDistance={1} maxDistance={2} minPolarAngle={0} maxPolarAngle={Math.PI / 2} zoomSpeed={0.5} />
}

// 主场景组件
export default function Scene3D() {
  const [projectiles, setProjectiles] = useState<Array<{ id: number; position: THREE.Vector3; direction: THREE.Vector3 }>>([])
  const [muzzleFlashes, setMuzzleFlashes] = useState<Array<{ id: number; position: THREE.Vector3; direction: THREE.Vector3 }>>([])
  const projectileIdRef = useRef(0)
  const tankRef = useRef<THREE.Group>(null)

  const handleFire = (position: THREE.Vector3, direction: THREE.Vector3) => {
    const id = projectileIdRef.current++
    
    // 添加炮弹
    setProjectiles((prev) => [...prev, { id, position: position.clone(), direction: direction.clone() }])
    
    // 添加炮口闪光效果
    setMuzzleFlashes((prev) => [...prev, { id, position: position.clone(), direction: direction.clone() }])
  }

  const removeProjectile = (id: number) => {
    setProjectiles((prev) => prev.filter((p) => p.id !== id))
  }

  const removeMuzzleFlash = (id: number) => {
    setMuzzleFlashes((prev) => prev.filter((m) => m.id !== id))
  }

  return (
    <div className="w-full h-screen bg-black">
      <Canvas
        camera={{ position: [0.7, 0.7, 0.7], fov: 50 }}
        gl={{ antialias: true }}
        onCreated={(state) => {
          // 设置黑色背景
          state.gl.setClearColor('#000000', 1)
          // 启用阴影
          state.gl.shadowMap.enabled = true
          state.gl.shadowMap.type = THREE.PCFSoftShadowMap
          // 设置相机朝向坦克（侧边斜上方角度）
          state.camera.lookAt(0, 0, 0)
        }}
      >
        {/* 相机跟随坦克炮口方向 */}
        <CameraFollow tankRef={tankRef} />

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
        <Tank onFire={handleFire} tankRef={tankRef} />

        {/* 炮弹 */}
        {projectiles.map((proj) => (
          <Projectile
            key={proj.id}
            position={proj.position}
            direction={proj.direction}
            onRemove={() => removeProjectile(proj.id)}
          />
        ))}

        {/* 炮口闪光效果 */}
        {muzzleFlashes.map((flash) => (
          <MuzzleFlash
            key={flash.id}
            position={flash.position}
            onComplete={() => removeMuzzleFlash(flash.id)}
          />
        ))}
      </Canvas>
    </div>
  )
}

