import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

// 网格地面组件
function GridGround() {
  return (
    <>
      {/* 网格辅助线 */}
      <gridHelper args={[20, 20, '#444444', '#222222']} position={[0, 0, 0]} />
      {/* 地面平面 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    </>
  )
}

// 主场景组件
export default function Scene3D() {
  return (
    <div className="w-full h-screen bg-black">
      <Canvas
        camera={{ position: [5, 5, 5], fov: 50 }}
        gl={{ antialias: true }}
        onCreated={(state) => {
          // 设置黑色背景
          state.gl.setClearColor('#000000', 1)
          // 启用阴影
          state.gl.shadowMap.enabled = true
          state.gl.shadowMap.type = THREE.PCFSoftShadowMap
        }}
      >
        {/* 鼠标控制 - 支持拖拽旋转、滚轮缩放 */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={3}
          maxDistance={20}
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 2}
          zoomSpeed={0.5}
        />

        {/* 环境光 - 提供基础照明 */}
        <ambientLight intensity={0.3} />

        {/* 主方向光 - 从上方照射 */}
        <directionalLight
          position={[5, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />

        {/* 周围点光源 - 四个方向 */}
        <pointLight position={[10, 5, 0]} intensity={0.5} color="#ffffff" />
        <pointLight position={[-10, 5, 0]} intensity={0.5} color="#ffffff" />
        <pointLight position={[0, 5, 10]} intensity={0.5} color="#ffffff" />
        <pointLight position={[0, 5, -10]} intensity={0.5} color="#ffffff" />

        {/* 顶部点光源 */}
        <pointLight position={[0, 10, 0]} intensity={0.3} color="#ffffff" />

        {/* 网格地面 */}
        <GridGround />

        {/* 添加一个参考立方体以便观察效果 */}
        <mesh position={[0, 1, 0]} castShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#4a90e2" />
        </mesh>
      </Canvas>
    </div>
  )
}

